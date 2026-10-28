/**
 * Entregas de un grupo de clase.
 *
 * La entrega se ubica en una avaluación y una categoría de los criterios del
 * grupo, y puede mapearse a varios CE oficiales del módulo. No tiene peso
 * propio: la categoría calcula la media simple de sus entregas.
 */
import type { Bd } from '../conexion'
import type {
  ArchivoRubrica,
  CriterioDisponible,
  EntregaClase,
  EntregaClaseEntrada
} from '@shared/tipos'
import { criteriosDisponibles } from './entregas'
import { obtenerCriterios } from './criterios-grupo'
import { obtenerGrupoClase } from './grupos-clase'

const CAMPOS = `e.id, e.grupo_clase_id, e.titulo, e.descripcion, e.tipo,
                e.fecha_limite, e.rubrica, e.rubrica_archivo, e.bloqueada,
                e.avaluacion_id, e.categoria_id, e.creada_en,
                (SELECT GROUP_CONCAT(ec.ce_id)
                   FROM entrega_ce_clase ec WHERE ec.entrega_id = e.id) AS ce_ids,
                (SELECT COUNT(*) FROM entrega_ce_clase ec
                  WHERE ec.entrega_id = e.id) AS criterios,
                (SELECT COUNT(*) FROM (
                   SELECT n.alumno_id FROM notas_entrega_clase n
                    WHERE n.entrega_id = e.id
                   UNION
                   SELECT a.alumno_id FROM anotaciones_entrega_clase a
                    WHERE a.entrega_id = e.id
                 )) AS notas,
                (SELECT COUNT(*) FROM archivos_entrega_clase av
                  WHERE av.entrega_id = e.id) AS evidencias`

interface FilaEntrega {
  id: number
  grupo_clase_id: number
  titulo: string
  descripcion: string | null
  tipo: string
  fecha_limite: string | null
  rubrica: string | null
  rubrica_archivo: string | null
  avaluacion_id: string
  categoria_id: string
  criterios: number
  notas: number
  evidencias: number
  bloqueada: number
  ce_ids: string | null
  creada_en: string
}

function parsearArchivo(crudo: string | null): ArchivoRubrica | null {
  if (!crudo) return null
  try {
    const archivo = JSON.parse(crudo) as Partial<ArchivoRubrica>
    if (!archivo?.nombre || !archivo.datos) return null
    return {
      nombre: archivo.nombre,
      tipo: archivo.tipo || 'application/octet-stream',
      datos: archivo.datos
    }
  } catch {
    return null
  }
}

function serializarArchivo(archivo: ArchivoRubrica | null | undefined): string | null {
  if (!archivo) return null
  const nombre = archivo.nombre?.trim()
  const datos = archivo.datos?.trim()
  if (!nombre || !datos) throw new Error('El archivo de la rúbrica no es válido.')
  if (datos.length > 6_000_000) {
    throw new Error('El archivo de la rúbrica es demasiado grande (máximo 4 MB).')
  }
  return JSON.stringify({
    nombre,
    tipo: archivo.tipo?.trim() || 'application/octet-stream',
    datos
  })
}

function aEntrega(fila: FilaEntrega): EntregaClase {
  const { bloqueada, rubrica_archivo, ...resto } = fila
  return {
    ...resto,
    bloqueada: bloqueada === 1,
    rubrica_archivo: parsearArchivo(rubrica_archivo),
    ce_ids: fila.ce_ids ? fila.ce_ids.split(',').map(Number) : []
  }
}

export function listarEntregasClase(db: Bd, grupoClaseId: number): EntregaClase[] {
  return (
    db
      .prepare(
        `SELECT ${CAMPOS}
           FROM entregas_clase e
          WHERE e.grupo_clase_id = ?
          ORDER BY e.fecha_limite IS NULL, e.fecha_limite, e.id`
      )
      .all(grupoClaseId) as FilaEntrega[]
  ).map(aEntrega)
}

export function obtenerEntregaClase(db: Bd, id: number): EntregaClase | null {
  const fila = db.prepare(`SELECT ${CAMPOS} FROM entregas_clase e WHERE e.id = ?`).get(id) as
    FilaEntrega | undefined
  return fila ? aEntrega(fila) : null
}

interface Validada {
  grupoClaseId: number
  datos: {
    titulo: string
    descripcion: string | null
    tipo: string
    fecha_limite: string | null
    rubrica: string | null
    rubrica_archivo: string | null
    avaluacion_id: string
    categoria_id: string
  }
  ceIds: number[]
}

function validar(db: Bd, grupoClaseId: number, entrada: EntregaClaseEntrada): Validada {
  const grupo = obtenerGrupoClase(db, grupoClaseId)
  if (!grupo) throw new Error('El grupo no existe.')

  const titulo = entrada.titulo?.trim()
  if (!titulo) throw new Error('El título de la entrega es obligatorio.')

  const criterios = obtenerCriterios(db, grupoClaseId)
  if (!criterios || criterios.avaluaciones.length === 0 || criterios.categorias.length === 0) {
    throw new Error('Define primero los criterios de calificación del grupo.')
  }
  if (!criterios.avaluaciones.some((a) => a.id === entrada.avaluacion_id)) {
    throw new Error('La avaluación no pertenece a los criterios del grupo.')
  }
  if (!criterios.categorias.some((c) => c.id === entrada.categoria_id)) {
    throw new Error('La categoría no pertenece a los criterios del grupo.')
  }

  const fecha = entrada.fecha_limite?.trim() || null
  if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    throw new Error('La fecha límite no es válida.')
  }

  const disponibles = new Set(criteriosDisponibles(db, grupo.modulo_codigo).map((c) => c.ceId))
  const ceIds = [...new Set(entrada.ce_ids ?? [])].filter((id) => {
    if (!disponibles.has(id)) throw new Error('Hay criterios que no pertenecen al módulo.')
    return true
  })

  return {
    grupoClaseId,
    datos: {
      titulo,
      descripcion: entrada.descripcion?.trim() || null,
      tipo: entrada.tipo || 'tarea',
      fecha_limite: fecha,
      rubrica: entrada.rubrica?.trim() || null,
      rubrica_archivo: serializarArchivo(entrada.rubrica_archivo),
      avaluacion_id: entrada.avaluacion_id,
      categoria_id: entrada.categoria_id
    },
    ceIds
  }
}

function mapear(db: Bd, entregaId: number, ceIds: number[]): void {
  db.prepare('DELETE FROM entrega_ce_clase WHERE entrega_id = ?').run(entregaId)
  const insertar = db.prepare('INSERT INTO entrega_ce_clase (entrega_id, ce_id) VALUES (?, ?)')
  for (const ceId of ceIds) insertar.run(entregaId, ceId)
}

export function crearEntregaClase(
  db: Bd,
  grupoClaseId: number,
  entrada: EntregaClaseEntrada
): EntregaClase {
  const validada = validar(db, grupoClaseId, entrada)
  let id = 0
  db.transaction(() => {
    const resultado = db
      .prepare(
        `INSERT INTO entregas_clase
           (grupo_clase_id, titulo, descripcion, tipo, fecha_limite, rubrica,
            rubrica_archivo, avaluacion_id, categoria_id)
         VALUES (@grupo_clase_id, @titulo, @descripcion, @tipo, @fecha_limite, @rubrica,
                 @rubrica_archivo, @avaluacion_id, @categoria_id)`
      )
      .run({ ...validada.datos, grupo_clase_id: grupoClaseId })
    id = Number(resultado.lastInsertRowid)
    mapear(db, id, validada.ceIds)
  })()
  return obtenerEntregaClase(db, id)!
}

export function actualizarEntregaClase(
  db: Bd,
  id: number,
  entrada: EntregaClaseEntrada
): EntregaClase | null {
  const actual = obtenerEntregaClase(db, id)
  if (!actual) return null
  if (actual.bloqueada) {
    throw new Error('La entrega está bloqueada: desbloquéala para editarla.')
  }
  const validada = validar(db, actual.grupo_clase_id, entrada)

  db.transaction(() => {
    db.prepare(
      `UPDATE entregas_clase
          SET titulo = @titulo, descripcion = @descripcion, tipo = @tipo,
              fecha_limite = @fecha_limite, rubrica = @rubrica,
              rubrica_archivo = @rubrica_archivo, avaluacion_id = @avaluacion_id,
              categoria_id = @categoria_id, actualizado_en = datetime('now')
        WHERE id = @id`
    ).run({ ...validada.datos, id })
    mapear(db, id, validada.ceIds)
  })()

  return obtenerEntregaClase(db, id)
}

export function borrarEntregaClase(db: Bd, id: number): boolean {
  const entrega = obtenerEntregaClase(db, id)
  if (!entrega) return false
  if (entrega.bloqueada) {
    throw new Error('La entrega está bloqueada: desbloquéala para borrarla.')
  }
  return db.prepare('DELETE FROM entregas_clase WHERE id = ?').run(id).changes > 0
}

export function bloquearEntregaClase(db: Bd, id: number, bloqueada: boolean): EntregaClase | null {
  const entrega = obtenerEntregaClase(db, id)
  if (!entrega) return null
  db.prepare(
    "UPDATE entregas_clase SET bloqueada = ?, actualizado_en = datetime('now') WHERE id = ?"
  ).run(bloqueada ? 1 : 0, id)
  return obtenerEntregaClase(db, id)
}

export function criteriosDisponiblesClase(db: Bd, grupoClaseId: number): CriterioDisponible[] {
  const grupo = obtenerGrupoClase(db, grupoClaseId)
  if (!grupo) throw new Error('El grupo no existe.')
  return criteriosDisponibles(db, grupo.modulo_codigo)
}
