/**
 * Repositorio de alumnos y de sus matrículas.
 *
 * El alumnado no es una lista global: se matricula en **grupos** (un módulo
 * impartido en una modalidad), y cada grupo muestra solo a quien está en él.
 *
 * El importador acepta tanto el volcado JSON de una hoja de cálculo
 * (`[[{ "nombre": …, "apellidos": …, "direccindecorreo": … }, …]]`) como texto
 * delimitado. Las columnas se reconocen por su nombre y las demás se ignoran.
 */
import type { Alumno, AlumnoEntrada } from '@shared/tipos'
import { parsearEntradaAlumnos, type FilaImportada } from '@shared/importar-alumnos'
import { EsquemaAlumno, normalizarOpcional } from '../../domain/esquemas'
import { normalizarNombre } from '../../domain/texto'
import type { Bd } from '../conexion'

interface FilaAlumno {
  id: number
  nombre: string
  apellidos: string
  dni: string | null
  email: string | null
  activo: number
  grupos: string | null
}

const SELECT = `
  SELECT a.id, a.nombre, a.apellidos, a.dni, a.email, a.activo,
         (SELECT GROUP_CONCAT(m.grupo_id)
            FROM matriculas m WHERE m.alumno_id = a.id) AS grupos
    FROM alumnos a`

function aAlumno(fila: FilaAlumno): Alumno {
  return {
    id: fila.id,
    nombre: fila.nombre,
    apellidos: fila.apellidos,
    dni: fila.dni,
    email: fila.email,
    activo: fila.activo === 1,
    grupos: fila.grupos ? fila.grupos.split(',').map(Number) : []
  }
}

export interface OpcionesListado {
  soloActivos?: boolean
  /** Si se indica, solo el alumnado matriculado en ese grupo. */
  grupoId?: number
}

export function listarAlumnos(db: Bd, opciones: OpcionesListado = {}): Alumno[] {
  const condiciones: string[] = []
  const parametros: unknown[] = []
  if (opciones.soloActivos) condiciones.push('a.activo = 1')
  if (opciones.grupoId) {
    condiciones.push(
      'EXISTS (SELECT 1 FROM matriculas m2 WHERE m2.alumno_id = a.id AND m2.grupo_id = ?)'
    )
    parametros.push(opciones.grupoId)
  }
  const donde = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : ''
  const sql = `${SELECT} ${donde} ORDER BY a.apellidos, a.nombre`
  return (db.prepare(sql).all(...parametros) as FilaAlumno[]).map(aAlumno)
}

export function listarAlumnosDeGrupo(db: Bd, grupoId: number): Alumno[] {
  return listarAlumnos(db, { soloActivos: true, grupoId })
}

export function obtenerAlumno(db: Bd, id: number): Alumno | null {
  const fila = db.prepare(`${SELECT} WHERE a.id = ?`).get(id) as FilaAlumno | undefined
  return fila ? aAlumno(fila) : null
}

interface DatosValidados {
  nombre: string
  apellidos: string
  dni: string | null
  email: string | null
  activo: boolean
}

function validar(entrada: AlumnoEntrada): DatosValidados {
  const datos = EsquemaAlumno.parse({
    nombre: entrada.nombre,
    apellidos: entrada.apellidos,
    dni: normalizarOpcional(entrada.dni ?? null),
    email: normalizarOpcional(entrada.email ?? null),
    activo: entrada.activo
  })
  return {
    nombre: normalizarNombre(datos.nombre),
    apellidos: normalizarNombre(datos.apellidos),
    dni: datos.dni ?? null,
    email: datos.email ?? null,
    activo: datos.activo ?? true
  }
}

function matricular(db: Bd, alumnoId: number, grupoId: number): void {
  db.prepare('INSERT OR IGNORE INTO matriculas (alumno_id, grupo_id) VALUES (?, ?)').run(
    alumnoId,
    grupoId
  )
}

function reemplazarMatriculas(db: Bd, alumnoId: number, grupos: number[]): void {
  db.prepare('DELETE FROM matriculas WHERE alumno_id = ?').run(alumnoId)
  for (const grupoId of grupos) matricular(db, alumnoId, grupoId)
}

export function crearAlumno(db: Bd, entrada: AlumnoEntrada): Alumno {
  const datos = validar(entrada)
  const resultado = db
    .prepare(
      `INSERT INTO alumnos (nombre, apellidos, dni, email, activo)
       VALUES (@nombre, @apellidos, @dni, @email, @activo)`
    )
    .run({ ...datos, activo: datos.activo ? 1 : 0 })

  const id = Number(resultado.lastInsertRowid)
  for (const grupoId of entrada.grupos ?? []) matricular(db, id, grupoId)
  return obtenerAlumno(db, id)!
}

export function actualizarAlumno(db: Bd, id: number, entrada: AlumnoEntrada): Alumno | null {
  if (!obtenerAlumno(db, id)) return null
  const datos = validar(entrada)
  db.prepare(
    `UPDATE alumnos
        SET nombre = @nombre, apellidos = @apellidos, dni = @dni,
            email = @email, activo = @activo
      WHERE id = @id`
  ).run({ ...datos, activo: datos.activo ? 1 : 0, id })

  if (entrada.grupos !== undefined) reemplazarMatriculas(db, id, entrada.grupos)
  return obtenerAlumno(db, id)
}

export function borrarAlumno(db: Bd, id: number): boolean {
  return db.prepare('DELETE FROM alumnos WHERE id = ?').run(id).changes > 0
}

/** Quita a un alumno de un grupo (sin borrarlo). */
export function desmatricular(db: Bd, alumnoId: number, grupoId: number): boolean {
  return (
    db.prepare('DELETE FROM matriculas WHERE alumno_id = ? AND grupo_id = ?').run(alumnoId, grupoId)
      .changes > 0
  )
}

/* --- Importación ------------------------------------------------------ */

export { parsearEntradaAlumnos }
export type { FilaImportada }

/** Importa alumnado y, si se indica un grupo, lo matricula en él. */
export function importarAlumnos(
  db: Bd,
  texto: string,
  grupoId?: number
): { creados: number; errores: string[] } {
  const filas = parsearEntradaAlumnos(texto)
  const errores: string[] = []
  let creados = 0

  db.transaction(() => {
    filas.forEach((fila, indice) => {
      if (!fila.nombre || !fila.apellidos) {
        errores.push(`Fila ${indice + 1}: faltan nombre o apellidos`)
        return
      }
      try {
        const alumno = crearAlumno(db, fila)
        if (grupoId) matricular(db, alumno.id, grupoId)
        creados++
      } catch (error) {
        errores.push(
          `Fila ${indice + 1} (${fila.nombre} ${fila.apellidos}): ${(error as Error).message}`
        )
      }
    })
  })()

  return { creados, errores }
}
