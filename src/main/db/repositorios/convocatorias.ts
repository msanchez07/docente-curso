/**
 * Convocatorias ordinaria y extraordinaria.
 *
 * Cada convocatoria tiene bloques de examen (por trimestre, unidad, RA/CE o
 * global) y una asignación por alumno con la nota de cada bloque.
 */
import type { Bd } from '../conexion'
import type {
  AsignacionConvocatoria,
  AsignacionConvocatoriaEntrada,
  BloqueConvocatoria,
  BloqueConvocatoriaEntrada,
  Convocatoria,
  ConvocatoriaDetalle,
  ConvocatoriaEntrada
} from '@shared/tipos'
import { obtenerGrupoClase } from './grupos-clase'

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/

function fechaValida(fecha: string): boolean {
  if (!RE_FECHA.test(fecha)) return false
  const interpretada = new Date(`${fecha}T00:00:00Z`)
  return !Number.isNaN(interpretada.getTime()) && interpretada.toISOString().slice(0, 10) === fecha
}

function normalizarConvocatoria(entrada: ConvocatoriaEntrada): ConvocatoriaEntrada {
  const nombre = entrada.nombre?.trim()
  if (!nombre) throw new Error('El nombre de la convocatoria es obligatorio.')
  const fecha = entrada.fecha?.trim() || null
  if (fecha && !fechaValida(fecha)) throw new Error('La fecha de la convocatoria no es válida.')
  return { tipo: entrada.tipo === 'extraordinaria' ? 'extraordinaria' : 'ordinaria', nombre, fecha }
}

function normalizarBloque(entrada: BloqueConvocatoriaEntrada): BloqueConvocatoriaEntrada {
  const nombre = entrada.nombre?.trim()
  if (!nombre) throw new Error('El nombre del bloque es obligatorio.')
  const peso = Number(entrada.peso ?? 0)
  if (!Number.isFinite(peso) || peso < 0 || peso > 100) {
    throw new Error('El peso del bloque debe estar entre 0 y 100.')
  }
  return {
    nombre,
    descripcion: entrada.descripcion?.trim() || '',
    avaluacion_id: entrada.avaluacion_id?.trim() || null,
    unidad_id: entrada.unidad_id ? Number(entrada.unidad_id) : null,
    ra_codigo: entrada.ra_codigo?.trim() || null,
    ce_codigo: entrada.ce_codigo?.trim() || null,
    peso,
    orden: Number(entrada.orden) || 0
  }
}

export function listarConvocatorias(db: Bd, grupoClaseId: number): Convocatoria[] {
  if (!obtenerGrupoClase(db, grupoClaseId)) throw new Error('El grupo no existe.')
  return db
    .prepare(
      `SELECT * FROM convocatorias
        WHERE grupo_clase_id = ?
        ORDER BY fecha IS NULL, fecha, id`
    )
    .all(grupoClaseId) as Convocatoria[]
}

function obtenerConvocatoria(db: Bd, id: number): Convocatoria | null {
  return (
    (db.prepare('SELECT * FROM convocatorias WHERE id = ?').get(id) as Convocatoria | undefined) ??
    null
  )
}

export function obtenerConvocatoriaDetalle(db: Bd, id: number): ConvocatoriaDetalle | null {
  const convocatoria = obtenerConvocatoria(db, id)
  if (!convocatoria) return null
  const bloques = db
    .prepare('SELECT * FROM convocatoria_bloques WHERE convocatoria_id = ? ORDER BY orden, id')
    .all(id) as BloqueConvocatoria[]
  const asignaciones = (
    db
      .prepare(
        'SELECT * FROM convocatoria_asignaciones WHERE convocatoria_id = ? ORDER BY alumno_id, bloque_id'
      )
      .all(id) as (Omit<AsignacionConvocatoria, 'incluida'> & { incluida: number })[]
  ).map((asignacion) => ({ ...asignacion, incluida: asignacion.incluida === 1 }))
  return { convocatoria, bloques, asignaciones }
}

export function crearConvocatoria(
  db: Bd,
  grupoClaseId: number,
  entrada: ConvocatoriaEntrada
): Convocatoria {
  if (!obtenerGrupoClase(db, grupoClaseId)) throw new Error('El grupo no existe.')
  const datos = normalizarConvocatoria(entrada)
  const resultado = db
    .prepare(
      `INSERT INTO convocatorias (grupo_clase_id, tipo, nombre, fecha)
       VALUES (?, ?, ?, ?)`
    )
    .run(grupoClaseId, datos.tipo, datos.nombre, datos.fecha ?? null)
  return obtenerConvocatoria(db, Number(resultado.lastInsertRowid))!
}

export function actualizarConvocatoria(
  db: Bd,
  id: number,
  entrada: ConvocatoriaEntrada
): Convocatoria | null {
  if (!obtenerConvocatoria(db, id)) return null
  const datos = normalizarConvocatoria(entrada)
  db.prepare(
    `UPDATE convocatorias
        SET tipo = ?, nombre = ?, fecha = ?, actualizado_en = datetime('now')
      WHERE id = ?`
  ).run(datos.tipo, datos.nombre, datos.fecha ?? null, id)
  return obtenerConvocatoria(db, id)
}

export function borrarConvocatoria(db: Bd, id: number): boolean {
  return db.prepare('DELETE FROM convocatorias WHERE id = ?').run(id).changes > 0
}

export function crearBloqueConvocatoria(
  db: Bd,
  convocatoriaId: number,
  entrada: BloqueConvocatoriaEntrada
): BloqueConvocatoria {
  if (!obtenerConvocatoria(db, convocatoriaId)) throw new Error('La convocatoria no existe.')
  const datos = normalizarBloque(entrada)
  const resultado = db
    .prepare(
      `INSERT INTO convocatoria_bloques
        (convocatoria_id, nombre, descripcion, avaluacion_id, unidad_id, ra_codigo, ce_codigo, peso, orden)
       VALUES (@convocatoria_id, @nombre, @descripcion, @avaluacion_id, @unidad_id, @ra_codigo, @ce_codigo, @peso, @orden)`
    )
    .run({ ...datos, convocatoria_id: convocatoriaId })
  return db
    .prepare('SELECT * FROM convocatoria_bloques WHERE id = ?')
    .get(Number(resultado.lastInsertRowid)) as BloqueConvocatoria
}

export function actualizarBloqueConvocatoria(
  db: Bd,
  id: number,
  entrada: BloqueConvocatoriaEntrada
): BloqueConvocatoria | null {
  const actual = db.prepare('SELECT * FROM convocatoria_bloques WHERE id = ?').get(id) as
    BloqueConvocatoria | undefined
  if (!actual) return null
  const datos = normalizarBloque(entrada)
  db.prepare(
    `UPDATE convocatoria_bloques
        SET nombre = @nombre, descripcion = @descripcion, avaluacion_id = @avaluacion_id,
            unidad_id = @unidad_id, ra_codigo = @ra_codigo, ce_codigo = @ce_codigo,
            peso = @peso, orden = @orden
      WHERE id = @id`
  ).run({ ...datos, id })
  return db.prepare('SELECT * FROM convocatoria_bloques WHERE id = ?').get(id) as BloqueConvocatoria
}

export function borrarBloqueConvocatoria(db: Bd, id: number): boolean {
  return db.prepare('DELETE FROM convocatoria_bloques WHERE id = ?').run(id).changes > 0
}

export function guardarAsignacionesConvocatoria(
  db: Bd,
  convocatoriaId: number,
  asignaciones: AsignacionConvocatoriaEntrada[]
): ConvocatoriaDetalle {
  if (!obtenerConvocatoria(db, convocatoriaId)) throw new Error('La convocatoria no existe.')
  const bloques = new Set(
    (
      db
        .prepare('SELECT id FROM convocatoria_bloques WHERE convocatoria_id = ?')
        .all(convocatoriaId) as { id: number }[]
    ).map((fila) => fila.id)
  )
  const validas = asignaciones.filter(
    (asignacion) => bloques.has(Number(asignacion.bloqueId)) && Number(asignacion.alumnoId) > 0
  )
  db.transaction(() => {
    db.prepare('DELETE FROM convocatoria_asignaciones WHERE convocatoria_id = ?').run(
      convocatoriaId
    )
    const insertar = db.prepare(
      `INSERT INTO convocatoria_asignaciones
        (convocatoria_id, alumno_id, bloque_id, nota, observaciones, incluida)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    for (const asignacion of validas) {
      insertar.run(
        convocatoriaId,
        Number(asignacion.alumnoId),
        Number(asignacion.bloqueId),
        asignacion.nota === null || asignacion.nota === undefined ? null : Number(asignacion.nota),
        asignacion.observaciones?.trim() || null,
        asignacion.incluida === false ? 0 : 1
      )
    }
  })()
  return obtenerConvocatoriaDetalle(db, convocatoriaId)!
}
