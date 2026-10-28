/**
 * Unidades de programación por grupo.
 *
 * Cada unidad agrupa sesiones (filas de `programacion_aula`), resultados de
 * aprendizaje y contenidos. Las sesiones se asignan desde su formulario.
 */
import type { Bd } from '../conexion'
import type {
  ProgramacionAula,
  ResultadoImportacionUnidades,
  UnidadProgramacion,
  UnidadProgramacionEntrada
} from '@shared/tipos'
import { parsearUnidadesProgramacion } from '@shared/importar-unidades'
import { obtenerGrupoClase } from './grupos-clase'

const CAMPOS = `id, grupo_clase_id, codigo, nombre, fecha_inicio, fecha_fin,
                contenidos, observaciones, creado_en, actualizado_en`
const CAMPOS_SESION = `id, grupo_clase_id, unidad_id, fecha, hora, orden, contenido,
                       desviacion, observaciones, creado_en, actualizado_en`
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/

function fechaValida(fecha: string): boolean {
  if (!RE_FECHA.test(fecha)) return false
  const interpretada = new Date(`${fecha}T00:00:00Z`)
  return !Number.isNaN(interpretada.getTime()) && interpretada.toISOString().slice(0, 10) === fecha
}

function normalizar(entrada: UnidadProgramacionEntrada): {
  codigo: string | null
  nombre: string
  fecha_inicio: string | null
  fecha_fin: string | null
  contenidos: string
  observaciones: string | null
  ra_codigos: string[]
} {
  const nombre = entrada.nombre?.trim()
  if (!nombre) throw new Error('El nombre de la unidad es obligatorio.')

  const fechaInicio = entrada.fecha_inicio?.trim() || null
  const fechaFin = entrada.fecha_fin?.trim() || null
  if (fechaInicio && !fechaValida(fechaInicio)) {
    throw new Error('La fecha de inicio no es válida.')
  }
  if (fechaFin && !fechaValida(fechaFin)) {
    throw new Error('La fecha de fin no es válida.')
  }
  if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
    throw new Error('La fecha de inicio no puede ser posterior a la de fin.')
  }

  const raCodigos = [...new Set((entrada.ra_codigos ?? []).map((ra) => ra.trim()).filter(Boolean))]

  return {
    codigo: entrada.codigo?.trim() || null,
    nombre,
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
    contenidos: entrada.contenidos?.trim() ?? '',
    observaciones: entrada.observaciones?.trim() || null,
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
  fila: Omit<UnidadProgramacion, 'ra_codigos' | 'sesiones'>
): UnidadProgramacion {
  return {
    ...fila,
    ra_codigos: raDeUnidad(db, fila.id),
    sesiones: sesionesDeUnidad(db, fila.id)
  }
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
    .all(grupoClaseId) as Omit<UnidadProgramacion, 'ra_codigos' | 'sesiones'>[]
  return filas.map((fila) => aUnidad(db, fila))
}

export function crearUnidadProgramacion(
  db: Bd,
  grupoClaseId: number,
  entrada: UnidadProgramacionEntrada
): UnidadProgramacion {
  if (!obtenerGrupoClase(db, grupoClaseId)) throw new Error('El grupo no existe.')
  const datos = normalizar(entrada)
  const insertar = db.prepare(
    `INSERT INTO unidades_programacion
       (grupo_clase_id, codigo, nombre, fecha_inicio, fecha_fin, contenidos, observaciones)
     VALUES (@grupo_clase_id, @codigo, @nombre, @fecha_inicio, @fecha_fin, @contenidos, @observaciones)`
  )
  const insertarRa = db.prepare(
    'INSERT INTO unidad_programacion_ra (unidad_id, ra_codigo) VALUES (?, ?)'
  )
  let id = 0
  db.transaction(() => {
    const resultado = insertar.run({ ...datos, grupo_clase_id: grupoClaseId })
    id = Number(resultado.lastInsertRowid)
    for (const ra of datos.ra_codigos) insertarRa.run(id, ra)
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
  const datos = normalizar(entrada)
  const actualizar = db.prepare(
    `UPDATE unidades_programacion
        SET codigo = @codigo, nombre = @nombre, fecha_inicio = @fecha_inicio,
            fecha_fin = @fecha_fin, contenidos = @contenidos,
            observaciones = @observaciones, actualizado_en = datetime('now')
      WHERE id = @id`
  )
  db.transaction(() => {
    actualizar.run({ ...datos, id })
    db.prepare('DELETE FROM unidad_programacion_ra WHERE unidad_id = ?').run(id)
    const insertarRa = db.prepare(
      'INSERT INTO unidad_programacion_ra (unidad_id, ra_codigo) VALUES (?, ?)'
    )
    for (const ra of datos.ra_codigos) insertarRa.run(id, ra)
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
