/**
 * Programación de aula por grupo.
 *
 * Cada fila es un día (o una sesión) con el contenido trabajado, la desviación
 * respecto a la planificación y observaciones. Se guarda la tabla completa:
 * las filas nuevas se insertan, las existentes se actualizan y las que ya no
 * están se borran.
 */
import type { Bd } from '../conexion'
import type { ProgramacionAula, ProgramacionEntrada } from '@shared/tipos'
import { obtenerGrupoClase } from './grupos-clase'

const CAMPOS = `id, grupo_clase_id, unidad_id, fecha, hora, orden, contenido, desviacion,
                observaciones, creado_en, actualizado_en`

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/
const RE_HORA = /^([01]?\d|2[0-3]):([0-5]\d)$/

function fechaValida(fecha: string): boolean {
  if (!RE_FECHA.test(fecha)) return false
  const interpretada = new Date(`${fecha}T00:00:00Z`)
  return !Number.isNaN(interpretada.getTime()) && interpretada.toISOString().slice(0, 10) === fecha
}

function normalizar(fila: ProgramacionEntrada, indice: number): Required<ProgramacionEntrada> {
  if (!fechaValida(fila.fecha)) {
    throw new Error(`Fila ${indice + 1}: la fecha no es válida.`)
  }
  return {
    id: Number(fila.id) || 0,
    fecha: fila.fecha,
    hora: fila.hora?.trim() || null,
    orden: Math.max(0, Number(fila.orden) || 0),
    contenido: String(fila.contenido ?? ''),
    desviacion: String(fila.desviacion ?? ''),
    observaciones: String(fila.observaciones ?? ''),
    unidad_id: fila.unidad_id ? Number(fila.unidad_id) : null
  }
}

export function listarProgramacion(db: Bd, grupoClaseId: number): ProgramacionAula[] {
  return db
    .prepare(
      `SELECT ${CAMPOS}
         FROM programacion_aula
        WHERE grupo_clase_id = ?
        ORDER BY fecha, orden, hora IS NULL, hora, id`
    )
    .all(grupoClaseId) as ProgramacionAula[]
}

export function guardarProgramacion(
  db: Bd,
  grupoClaseId: number,
  filas: ProgramacionEntrada[]
): ProgramacionAula[] {
  if (!obtenerGrupoClase(db, grupoClaseId)) {
    throw new Error('El grupo no existe.')
  }

  const limpias = filas.map(normalizar)
  for (const fila of limpias) {
    if (fila.hora && !RE_HORA.test(fila.hora)) {
      throw new Error('La hora debe tener formato HH:MM.')
    }
  }
  const unidad = db.prepare(
    'SELECT 1 FROM unidades_programacion WHERE id = ? AND grupo_clase_id = ?'
  )
  for (const fila of limpias) {
    if (fila.unidad_id && !unidad.get(fila.unidad_id, grupoClaseId)) {
      throw new Error('Una de las unidades de programación no pertenece a este grupo.')
    }
  }
  const existentes = db
    .prepare('SELECT id FROM programacion_aula WHERE grupo_clase_id = ?')
    .all(grupoClaseId) as { id: number }[]
  const conservar = new Set(limpias.filter((f) => f.id > 0).map((f) => f.id))

  const borrar = db.prepare('DELETE FROM programacion_aula WHERE id = ?')
  const actualizar = db.prepare(
    `UPDATE programacion_aula
        SET fecha = @fecha, hora = @hora, orden = @orden, contenido = @contenido,
            desviacion = @desviacion, observaciones = @observaciones,
            unidad_id = @unidad_id, actualizado_en = datetime('now')
      WHERE id = @id AND grupo_clase_id = @grupo_clase_id`
  )
  const insertar = db.prepare(
    `INSERT INTO programacion_aula
       (grupo_clase_id, unidad_id, fecha, hora, orden, contenido, desviacion, observaciones)
     VALUES (@grupo_clase_id, @unidad_id, @fecha, @hora, @orden, @contenido, @desviacion, @observaciones)`
  )

  db.transaction(() => {
    for (const existente of existentes) {
      if (!conservar.has(existente.id)) borrar.run(existente.id)
    }
    for (const fila of limpias) {
      if (fila.id > 0) {
        const resultado = actualizar.run({ ...fila, grupo_clase_id: grupoClaseId })
        if (resultado.changes === 0) {
          throw new Error('Una de las filas ya no existe. Recarga la programación.')
        }
      } else {
        insertar.run({ ...fila, grupo_clase_id: grupoClaseId })
      }
    }
  })()

  return listarProgramacion(db, grupoClaseId)
}
