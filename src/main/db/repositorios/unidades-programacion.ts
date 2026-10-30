/**
 * Unidades de programación por grupo.
 *
 * Cada unidad agrupa sesiones (filas de `programacion_aula`), criterios de
 * evaluación concretos y contenidos. Los RA se derivan de los criterios
 * seleccionados; una unidad puede trabajar un CE suelto, todos los de un RA o
 * criterios de varios RA.
 */
import type { Bd } from '../conexion'
import type {
  CategoriaEvaluacion,
  CriterioUnidad,
  RequisitoEvaluacion,
  ProgramacionAula,
  ResultadoImportacionUnidades,
  UnidadProgramacion,
  UnidadProgramacionEntrada
} from '@shared/tipos'
import { parsearUnidadesProgramacion } from '@shared/importar-unidades'
import { obtenerGrupoClase } from './grupos-clase'

const CAMPOS = `id, grupo_clase_id, codigo, nombre, fecha_inicio, fecha_fin, avaluacion_id, peso,
                categorias_json, requisitos_json, contenidos, observaciones, creado_en, actualizado_en`
const CAMPOS_SESION = `id, grupo_clase_id, unidad_id, fecha, hora, orden, contenido,
                       desviacion, observaciones, creado_en, actualizado_en`
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/

interface DatosUnidad {
  codigo: string | null
  nombre: string
  fecha_inicio: string | null
  fecha_fin: string | null
  avaluacion_id: string | null
  peso: number
  categorias: CategoriaEvaluacion[]
  requisitos: RequisitoEvaluacion[]
  contenidos: string
  observaciones: string | null
  criterios: CriterioUnidad[]
  ra_codigos: string[]
}

function fechaValida(fecha: string): boolean {
  if (!RE_FECHA.test(fecha)) return false
  const interpretada = new Date(`${fecha}T00:00:00Z`)
  return !Number.isNaN(interpretada.getTime()) && interpretada.toISOString().slice(0, 10) === fecha
}

function claveCriterio(criterio: CriterioUnidad): string {
  return `${criterio.raCodigo}|${criterio.ceCodigo}`
}

function unicos(criterios: CriterioUnidad[]): CriterioUnidad[] {
  const mapa = new Map<string, CriterioUnidad>()
  for (const criterio of criterios) {
    const raCodigo = criterio.raCodigo?.trim().toUpperCase()
    const ceCodigo = criterio.ceCodigo?.trim()
    if (!raCodigo || !ceCodigo) continue
    const normalizado = { raCodigo, ceCodigo }
    mapa.set(claveCriterio(normalizado), normalizado)
  }
  return [...mapa.values()].sort(
    (a, b) => a.raCodigo.localeCompare(b.raCodigo) || a.ceCodigo.localeCompare(b.ceCodigo)
  )
}

function criteriosDelGrupo(db: Bd, grupoClaseId: number): Map<string, CriterioUnidad> {
  const filas = db
    .prepare(
      `SELECT ra.codigo AS raCodigo, ce.codigo AS ceCodigo
         FROM criterios_evaluacion ce
         JOIN resultados_aprendizaje ra ON ra.id = ce.ra_id
         JOIN grupos_clase gc ON gc.modulo_codigo = ra.modulo_codigo
        WHERE gc.id = ?
        ORDER BY ra.numero, ce.codigo`
    )
    .all(grupoClaseId) as CriterioUnidad[]
  return new Map(filas.map((fila) => [claveCriterio(fila), fila]))
}

function normalizar(db: Bd, grupoClaseId: number, entrada: UnidadProgramacionEntrada): DatosUnidad {
  const nombre = entrada.nombre?.trim()
  if (!nombre) throw new Error('El nombre de la unidad es obligatorio.')

  const fechaInicio = entrada.fecha_inicio?.trim() || null
  const fechaFin = entrada.fecha_fin?.trim() || null
  const peso = Number(entrada.peso ?? 0)
  if (!Number.isFinite(peso) || peso < 0 || peso > 100) {
    throw new Error('El peso de la unidad debe estar entre 0 y 100.')
  }
  if (fechaInicio && !fechaValida(fechaInicio)) {
    throw new Error('La fecha de inicio no es válida.')
  }
  if (fechaFin && !fechaValida(fechaFin)) {
    throw new Error('La fecha de fin no es válida.')
  }
  if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
    throw new Error('La fecha de inicio no puede ser posterior a la de fin.')
  }

  const disponibles = criteriosDelGrupo(db, grupoClaseId)
  const explicitos = unicos(entrada.criterios ?? [])
  const raSolicitados = new Set(
    (entrada.ra_codigos ?? []).map((ra) => ra.trim().toUpperCase()).filter(Boolean)
  )
  let criterios: CriterioUnidad[] = []

  if (explicitos.length > 0) {
    for (const criterio of explicitos) {
      if (!disponibles.has(claveCriterio(criterio))) {
        throw new Error(
          `El criterio ${criterio.raCodigo} · ${criterio.ceCodigo} no pertenece al módulo del grupo.`
        )
      }
    }
    criterios = explicitos
  } else if (raSolicitados.size > 0) {
    criterios = [...disponibles.values()].filter((criterio) => raSolicitados.has(criterio.raCodigo))
  }

  const raCodigos =
    criterios.length > 0
      ? [...new Set(criterios.map((criterio) => criterio.raCodigo))]
      : [...raSolicitados]

  const categorias = (entrada.categorias ?? [])
    .map((categoria) => ({
      id: String(categoria.id ?? '').trim(),
      nombre: String(categoria.nombre ?? '').trim(),
      peso: Number(categoria.peso) || 0
    }))
    .filter((categoria) => categoria.id && categoria.nombre)

  const requisitos = (entrada.requisitos ?? [])
    .map((requisito) => ({
      id: String(requisito.id ?? '').trim(),
      nombre: String(requisito.nombre ?? '').trim(),
      valor: Number(requisito.valor) || 0,
      descripcion: String(requisito.descripcion ?? '').trim()
    }))
    .filter((requisito) => requisito.id && requisito.nombre)

  return {
    codigo: entrada.codigo?.trim() || null,
    avaluacion_id: entrada.avaluacion_id?.trim() || null,
    nombre,
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
    peso,
    categorias,
    requisitos,
    contenidos: entrada.contenidos?.trim() ?? '',
    observaciones: entrada.observaciones?.trim() || null,
    criterios,
    ra_codigos: raCodigos
  }
}

function sesionesDeUnidad(db: Bd, unidadId: number): ProgramacionAula[] {
  return db
    .prepare(
      `SELECT ${CAMPOS_SESION}
         FROM programacion_aula
        WHERE unidad_id = ?
        ORDER BY fecha, orden, hora IS NULL, hora, id`
    )
    .all(unidadId) as ProgramacionAula[]
}

function criteriosDeUnidad(db: Bd, unidadId: number): CriterioUnidad[] {
  return db
    .prepare(
      `SELECT ra_codigo AS raCodigo, ce_codigo AS ceCodigo
         FROM unidad_programacion_ce
        WHERE unidad_id = ?
        ORDER BY ra_codigo, ce_codigo`
    )
    .all(unidadId) as CriterioUnidad[]
}

function raDeUnidad(db: Bd, unidadId: number): string[] {
  return (
    db
      .prepare(
        'SELECT ra_codigo FROM unidad_programacion_ra WHERE unidad_id = ? ORDER BY ra_codigo'
      )
      .all(unidadId) as { ra_codigo: string }[]
  ).map((fila) => fila.ra_codigo)
}

function aUnidad(
  db: Bd,
  fila: Omit<
    UnidadProgramacion,
    'ra_codigos' | 'criterios' | 'sesiones' | 'categorias' | 'requisitos'
  > & {
    categorias_json: string
    requisitos_json: string
  }
): UnidadProgramacion {
  let categorias: CategoriaEvaluacion[] = []
  try {
    categorias = JSON.parse(fila.categorias_json) as CategoriaEvaluacion[]
  } catch {
    categorias = []
  }
  let requisitos: RequisitoEvaluacion[] = []
  try {
    requisitos = JSON.parse(fila.requisitos_json) as RequisitoEvaluacion[]
  } catch {
    requisitos = []
  }
  const { categorias_json: _categoriasJson, requisitos_json: _requisitosJson, ...resto } = fila
  const criterios = criteriosDeUnidad(db, fila.id)
  const raCodigos = [...new Set(criterios.map((criterio) => criterio.raCodigo))]
  return {
    ...resto,
    categorias,
    requisitos,
    ra_codigos: raCodigos.length > 0 ? raCodigos : raDeUnidad(db, fila.id),
    criterios,
    sesiones: sesionesDeUnidad(db, fila.id)
  }
}

function guardarCriterios(db: Bd, unidadId: number, datos: DatosUnidad): void {
  db.prepare('DELETE FROM unidad_programacion_ce WHERE unidad_id = ?').run(unidadId)
  db.prepare('DELETE FROM unidad_programacion_ra WHERE unidad_id = ?').run(unidadId)
  const insertarCe = db.prepare(
    'INSERT INTO unidad_programacion_ce (unidad_id, ra_codigo, ce_codigo) VALUES (?, ?, ?)'
  )
  const insertarRa = db.prepare(
    'INSERT INTO unidad_programacion_ra (unidad_id, ra_codigo) VALUES (?, ?)'
  )
  for (const criterio of datos.criterios) {
    insertarCe.run(unidadId, criterio.raCodigo, criterio.ceCodigo)
  }
  for (const ra of datos.ra_codigos) insertarRa.run(unidadId, ra)
}

export function listarUnidadesProgramacion(db: Bd, grupoClaseId: number): UnidadProgramacion[] {
  if (!obtenerGrupoClase(db, grupoClaseId)) throw new Error('El grupo no existe.')
  const filas = db
    .prepare(
      `SELECT ${CAMPOS}
         FROM unidades_programacion
        WHERE grupo_clase_id = ?
        ORDER BY fecha_inicio IS NULL, fecha_inicio, id`
    )
    .all(grupoClaseId) as (Omit<
    UnidadProgramacion,
    'ra_codigos' | 'criterios' | 'sesiones' | 'categorias' | 'requisitos'
  > & { categorias_json: string; requisitos_json: string })[]
  return filas.map((fila) => aUnidad(db, fila))
}

export function crearUnidadProgramacion(
  db: Bd,
  grupoClaseId: number,
  entrada: UnidadProgramacionEntrada
): UnidadProgramacion {
  if (!obtenerGrupoClase(db, grupoClaseId)) throw new Error('El grupo no existe.')
  const datos = normalizar(db, grupoClaseId, entrada)
  const insertar = db.prepare(
    `INSERT INTO unidades_programacion
       (grupo_clase_id, codigo, nombre, fecha_inicio, fecha_fin, avaluacion_id, peso, categorias_json, requisitos_json, contenidos, observaciones)
     VALUES (@grupo_clase_id, @codigo, @nombre, @fecha_inicio, @fecha_fin, @avaluacion_id, @peso, @categorias_json, @requisitos_json, @contenidos, @observaciones)`
  )
  let id = 0
  db.transaction(() => {
    const resultado = insertar.run({
      ...datos,
      grupo_clase_id: grupoClaseId,
      categorias_json: JSON.stringify(datos.categorias),
      requisitos_json: JSON.stringify(datos.requisitos)
    })
    id = Number(resultado.lastInsertRowid)
    guardarCriterios(db, id, datos)
  })()
  return listarUnidadesProgramacion(db, grupoClaseId).find((unidad) => unidad.id === id)!
}

export function actualizarUnidadProgramacion(
  db: Bd,
  id: number,
  entrada: UnidadProgramacionEntrada
): UnidadProgramacion | null {
  const actual = db
    .prepare('SELECT grupo_clase_id FROM unidades_programacion WHERE id = ?')
    .get(id) as { grupo_clase_id: number } | undefined
  if (!actual) return null
  const datos = normalizar(db, actual.grupo_clase_id, entrada)
  const actualizar = db.prepare(
    `UPDATE unidades_programacion
        SET codigo = @codigo, nombre = @nombre, fecha_inicio = @fecha_inicio,
            fecha_fin = @fecha_fin, avaluacion_id = @avaluacion_id, peso = @peso,
            categorias_json = @categorias_json,
            requisitos_json = @requisitos_json, contenidos = @contenidos,
            observaciones = @observaciones, actualizado_en = datetime('now')
      WHERE id = @id`
  )
  db.transaction(() => {
    actualizar.run({
      ...datos,
      id,
      categorias_json: JSON.stringify(datos.categorias),
      requisitos_json: JSON.stringify(datos.requisitos)
    })
    guardarCriterios(db, id, datos)
  })()
  return (
    listarUnidadesProgramacion(db, actual.grupo_clase_id).find((unidad) => unidad.id === id) ?? null
  )
}

export function borrarUnidadProgramacion(db: Bd, id: number): boolean {
  const actual = db
    .prepare('SELECT grupo_clase_id FROM unidades_programacion WHERE id = ?')
    .get(id) as { grupo_clase_id: number } | undefined
  if (!actual) return false
  db.transaction(() => {
    db.prepare('UPDATE programacion_aula SET unidad_id = NULL WHERE unidad_id = ?').run(id)
    db.prepare('DELETE FROM unidades_programacion WHERE id = ?').run(id)
  })()
  return true
}

export function importarUnidadesProgramacion(
  db: Bd,
  grupoClaseId: number,
  texto: string
): ResultadoImportacionUnidades {
  if (!obtenerGrupoClase(db, grupoClaseId)) throw new Error('El grupo no existe.')
  const { unidades, errores } = parsearUnidadesProgramacion(texto)
  let creados = 0

  const buscarSesion = db.prepare(
    'SELECT id FROM programacion_aula WHERE grupo_clase_id = ? AND fecha = ?'
  )
  const actualizarSesion = db.prepare(
    `UPDATE programacion_aula
        SET unidad_id = ?, hora = ?, orden = ?, contenido = ?, desviacion = ?,
            observaciones = ?, actualizado_en = datetime('now')
      WHERE id = ?`
  )
  const insertarSesion = db.prepare(
    `INSERT INTO programacion_aula
       (grupo_clase_id, unidad_id, fecha, hora, orden, contenido, desviacion, observaciones)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )

  for (const unidadImportada of unidades) {
    try {
      const unidad = crearUnidadProgramacion(db, grupoClaseId, unidadImportada)
      for (const sesion of unidadImportada.sesiones ?? []) {
        const existente = buscarSesion.get(grupoClaseId, sesion.fecha) as { id: number } | undefined
        if (existente) {
          actualizarSesion.run(
            unidad.id,
            sesion.hora ?? null,
            sesion.orden ?? 0,
            sesion.contenido,
            sesion.desviacion,
            sesion.observaciones,
            existente.id
          )
        } else {
          insertarSesion.run(
            grupoClaseId,
            unidad.id,
            sesion.fecha,
            sesion.hora ?? null,
            sesion.orden ?? 0,
            sesion.contenido,
            sesion.desviacion,
            sesion.observaciones
          )
        }
      }
      creados += 1
    } catch (e) {
      errores.push((e as Error).message)
    }
  }

  return { creados, errores }
}
