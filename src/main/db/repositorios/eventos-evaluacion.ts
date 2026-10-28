/**
 * Fechas de evaluaciones y exámenes de un grupo de clase.
 */
import type { Bd } from '../conexion'
import type {
  EventoEvaluacionClase,
  EventoEvaluacionEntrada,
  ResultadoImportacionEventos
} from '@shared/tipos'
import { parsearEventosEvaluacion } from '@shared/importar-eventos'
import { obtenerGrupoClase } from './grupos-clase'

const CAMPOS = `id, grupo_clase_id, tipo, titulo, fecha, hora, avaluacion_id,
                observaciones, creado_en, actualizado_en`
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/
const RE_HORA = /^([01]?\d|2[0-3]):([0-5]\d)$/

function validar(entrada: EventoEvaluacionEntrada): {
  tipo: 'evaluacion' | 'examen'
  titulo: string
  fecha: string
  hora: string | null
  avaluacion_id: string | null
  observaciones: string | null
} {
  if (entrada.tipo !== 'evaluacion' && entrada.tipo !== 'examen') {
    throw new Error('El tipo debe ser evaluación o examen.')
  }
  const titulo = entrada.titulo?.trim()
  if (!titulo) throw new Error('El título es obligatorio.')

  const fecha = entrada.fecha?.trim()
  if (!fecha || !RE_FECHA.test(fecha)) {
    throw new Error('La fecha no es válida.')
  }
  const interpretada = new Date(`${fecha}T00:00:00Z`)
  if (
    Number.isNaN(interpretada.getTime()) ||
    interpretada.toISOString().slice(0, 10) !== fecha
  ) {
    throw new Error('La fecha no es válida.')
  }

  const hora = entrada.hora?.trim() || null
  if (hora && !RE_HORA.test(hora)) {
    throw new Error('La hora debe tener formato HH:MM.')
  }

  return {
    tipo: entrada.tipo,
    titulo,
    fecha,
    hora,
    avaluacion_id: entrada.avaluacion_id?.trim() || null,
    observaciones: entrada.observaciones?.trim() || null
  }
}

export function listarEventosEvaluacion(
  db: Bd,
  grupoClaseId: number
): EventoEvaluacionClase[] {
  return db
    .prepare(
      `SELECT ${CAMPOS}
         FROM eventos_evaluacion_clase
        WHERE grupo_clase_id = ?
        ORDER BY fecha, hora IS NULL, hora, id`
    )
    .all(grupoClaseId) as EventoEvaluacionClase[]
}

export function crearEventoEvaluacion(
  db: Bd,
  grupoClaseId: number,
  entrada: EventoEvaluacionEntrada
): EventoEvaluacionClase {
  if (!obtenerGrupoClase(db, grupoClaseId)) throw new Error('El grupo no existe.')
  const datos = validar(entrada)
  const resultado = db
    .prepare(
      `INSERT INTO eventos_evaluacion_clase
         (grupo_clase_id, tipo, titulo, fecha, hora, avaluacion_id, observaciones)
       VALUES (@grupoClaseId, @tipo, @titulo, @fecha, @hora, @avaluacion_id, @observaciones)`
    )
    .run({ ...datos, grupoClaseId })
  return db
    .prepare(`SELECT ${CAMPOS} FROM eventos_evaluacion_clase WHERE id = ?`)
    .get(Number(resultado.lastInsertRowid)) as EventoEvaluacionClase
}

export function actualizarEventoEvaluacion(
  db: Bd,
  id: number,
  entrada: EventoEvaluacionEntrada
): EventoEvaluacionClase | null {
  const actual = db
    .prepare('SELECT 1 FROM eventos_evaluacion_clase WHERE id = ?')
    .get(id)
  if (!actual) return null
  const datos = validar(entrada)
  db.prepare(
    `UPDATE eventos_evaluacion_clase
        SET tipo = @tipo, titulo = @titulo, fecha = @fecha, hora = @hora,
            avaluacion_id = @avaluacion_id, observaciones = @observaciones,
            actualizado_en = datetime('now')
      WHERE id = @id`
  ).run({ ...datos, id })
  return db
    .prepare(`SELECT ${CAMPOS} FROM eventos_evaluacion_clase WHERE id = ?`)
    .get(id) as EventoEvaluacionClase
}

export function borrarEventoEvaluacion(db: Bd, id: number): boolean {
  return db.prepare('DELETE FROM eventos_evaluacion_clase WHERE id = ?').run(id).changes > 0
}

export function importarEventosEvaluacion(
  db: Bd,
  grupoClaseId: number,
  texto: string
): ResultadoImportacionEventos {
  if (!obtenerGrupoClase(db, grupoClaseId)) throw new Error('El grupo no existe.')
  const { eventos, errores } = parsearEventosEvaluacion(texto)
  let creados = 0
  const insertar = db.prepare(
    `INSERT INTO eventos_evaluacion_clase
       (grupo_clase_id, tipo, titulo, fecha, hora, avaluacion_id, observaciones)
     VALUES (@grupoClaseId, @tipo, @titulo, @fecha, @hora, @avaluacion_id, @observaciones)`
  )
  db.transaction(() => {
    for (const evento of eventos) {
      try {
        const datos = validar(evento)
        insertar.run({ ...datos, grupoClaseId })
        creados += 1
      } catch (e) {
        errores.push((e as Error).message)
      }
    }
  })()
  return { creados, errores }
}
