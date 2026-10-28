/**
 * Periodos de formación en empresa de un alumno dentro de un grupo de clase.
 *
 * Cada periodo exige empresa, fecha de inicio y fecha de fin. Un alumno puede
 * tener varios periodos, pero no pueden solaparse entre sí.
 */
import type { Bd } from '../conexion'
import type { PeriodoFormacionEmpresa, PeriodoFormacionEmpresaEntrada } from '@shared/tipos'
import { obtenerGrupoClase } from './grupos-clase'

const CAMPOS = `id, grupo_clase_id, alumno_id, fecha_inicio, fecha_fin,
                empresa, horas, observaciones, creado_en, actualizado_en`

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/

function fechaValida(fecha: string): boolean {
  if (!RE_FECHA.test(fecha)) return false
  const interpretada = new Date(`${fecha}T00:00:00Z`)
  return !Number.isNaN(interpretada.getTime()) && interpretada.toISOString().slice(0, 10) === fecha
}

function validar(entrada: PeriodoFormacionEmpresaEntrada): {
  fecha_inicio: string
  fecha_fin: string
  empresa: string
  horas: number
  observaciones: string | null
} {
  const fechaInicio = entrada.fecha_inicio?.trim()
  const fechaFin = entrada.fecha_fin?.trim()
  const empresa = entrada.empresa?.trim()

  if (!fechaInicio || !fechaValida(fechaInicio)) {
    throw new Error('La fecha de inicio no es válida.')
  }
  if (!fechaFin || !fechaValida(fechaFin)) {
    throw new Error('La fecha de fin no es válida.')
  }
  if (fechaInicio > fechaFin) {
    throw new Error('La fecha de inicio no puede ser posterior a la de fin.')
  }
  if (!empresa) {
    throw new Error('Hay que indicar la empresa en la que realiza la formación.')
  }

  const horas = entrada.horas === undefined || entrada.horas === null ? 0 : Number(entrada.horas)
  if (!Number.isFinite(horas) || horas < 0) {
    throw new Error('Las horas realizadas deben ser un número positivo.')
  }

  return {
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
    empresa,
    horas: Math.round(horas * 100) / 100,
    observaciones: entrada.observaciones?.trim() || null
  }
}

function comprobarMatricula(db: Bd, grupoClaseId: number, alumnoId: number): void {
  if (!obtenerGrupoClase(db, grupoClaseId)) throw new Error('El grupo no existe.')
  const matricula = db
    .prepare('SELECT 1 FROM matriculas_clase WHERE grupo_clase_id = ? AND alumno_id = ?')
    .get(grupoClaseId, alumnoId)
  if (!matricula) throw new Error('El alumno no está matriculado en este grupo.')
}

function comprobarSolape(
  db: Bd,
  grupoClaseId: number,
  alumnoId: number,
  fechaInicio: string,
  fechaFin: string,
  exceptoId: number | null = null
): void {
  const fila = db
    .prepare(
      `SELECT 1
         FROM formacion_empresa
        WHERE grupo_clase_id = @grupoClaseId
          AND alumno_id = @alumnoId
          AND fecha_inicio <= @fechaFin
          AND fecha_fin >= @fechaInicio
          AND (@exceptoId IS NULL OR id <> @exceptoId)`
    )
    .get({ grupoClaseId, alumnoId, fechaInicio, fechaFin, exceptoId })
  if (fila) {
    throw new Error('Este periodo se solapa con otro ya registrado para el alumno.')
  }
}

export function listarFormacionEmpresa(
  db: Bd,
  grupoClaseId: number,
  alumnoId?: number
): PeriodoFormacionEmpresa[] {
  const filtroAlumno = alumnoId ? 'AND alumno_id = ?' : ''
  const params = alumnoId ? [grupoClaseId, alumnoId] : [grupoClaseId]
  return db
    .prepare(
      `SELECT ${CAMPOS}
         FROM formacion_empresa
        WHERE grupo_clase_id = ?
          ${filtroAlumno}
        ORDER BY fecha_inicio, id`
    )
    .all(...params) as PeriodoFormacionEmpresa[]
}

export function crearFormacionEmpresa(
  db: Bd,
  grupoClaseId: number,
  alumnoId: number,
  entrada: PeriodoFormacionEmpresaEntrada
): PeriodoFormacionEmpresa {
  comprobarMatricula(db, grupoClaseId, alumnoId)
  const datos = validar(entrada)
  comprobarSolape(db, grupoClaseId, alumnoId, datos.fecha_inicio, datos.fecha_fin)

  const resultado = db
    .prepare(
      `INSERT INTO formacion_empresa
         (grupo_clase_id, alumno_id, fecha_inicio, fecha_fin, empresa, horas, observaciones)
       VALUES (@grupoClaseId, @alumnoId, @fecha_inicio, @fecha_fin, @empresa, @horas, @observaciones)`
    )
    .run({ ...datos, grupoClaseId, alumnoId })

  return db
    .prepare(`SELECT ${CAMPOS} FROM formacion_empresa WHERE id = ?`)
    .get(Number(resultado.lastInsertRowid)) as PeriodoFormacionEmpresa
}

export function actualizarFormacionEmpresa(
  db: Bd,
  id: number,
  entrada: PeriodoFormacionEmpresaEntrada
): PeriodoFormacionEmpresa | null {
  const actual = db.prepare('SELECT * FROM formacion_empresa WHERE id = ?').get(id) as
    PeriodoFormacionEmpresa | undefined
  if (!actual) return null

  const datos = validar(entrada)
  comprobarSolape(
    db,
    actual.grupo_clase_id,
    actual.alumno_id,
    datos.fecha_inicio,
    datos.fecha_fin,
    id
  )

  db.prepare(
    `UPDATE formacion_empresa
        SET fecha_inicio = @fecha_inicio,
            fecha_fin = @fecha_fin,
            empresa = @empresa,
            horas = @horas,
            observaciones = @observaciones,
            actualizado_en = datetime('now')
      WHERE id = @id`
  ).run({ ...datos, id })

  return db
    .prepare(`SELECT ${CAMPOS} FROM formacion_empresa WHERE id = ?`)
    .get(id) as PeriodoFormacionEmpresa
}

export function borrarFormacionEmpresa(db: Bd, id: number): boolean {
  return db.prepare('DELETE FROM formacion_empresa WHERE id = ?').run(id).changes > 0
}
