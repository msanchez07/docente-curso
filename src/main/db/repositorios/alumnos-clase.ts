/**
 * Alumnado de un grupo de clase.
 *
 * La ficha del alumno es global; la matrícula (`matriculas_clase`) es lo que
 * lo vincula a un grupo. Quitarlo de un grupo no lo borra del sistema.
 */
import type { Bd } from '../conexion'
import type { AlumnoClase, AlumnoEntrada, ResultadoAltaAlumnoClase } from '@shared/tipos'
import { crearAlumno } from './alumnos'
import { obtenerGrupoClase } from './grupos-clase'

const SELECT = `
  SELECT a.id, a.nombre, a.apellidos, a.dni, a.email, a.activo,
         (SELECT GROUP_CONCAT(mc.grupo_clase_id)
            FROM matriculas_clase mc WHERE mc.alumno_id = a.id) AS grupos_clase
    FROM alumnos a`

interface FilaAlumnoClase {
  id: number
  nombre: string
  apellidos: string
  dni: string | null
  email: string | null
  activo: number
  grupos_clase: string | null
}

function aAlumnoClase(fila: FilaAlumnoClase): AlumnoClase {
  return {
    id: fila.id,
    nombre: fila.nombre,
    apellidos: fila.apellidos,
    dni: fila.dni,
    email: fila.email,
    activo: fila.activo === 1,
    grupos_clase: fila.grupos_clase ? fila.grupos_clase.split(',').map(Number) : []
  }
}

export function listarAlumnosDeGrupoClase(db: Bd, grupoClaseId: number): AlumnoClase[] {
  const filas = db
    .prepare(
      `${SELECT}
        JOIN matriculas_clase m ON m.alumno_id = a.id
       WHERE m.grupo_clase_id = ?
       ORDER BY a.apellidos, a.nombre`
    )
    .all(grupoClaseId) as FilaAlumnoClase[]
  return filas.map(aAlumnoClase)
}

export function obtenerAlumnoClase(db: Bd, id: number): AlumnoClase | null {
  const fila = db.prepare(`${SELECT} WHERE a.id = ?`).get(id) as FilaAlumnoClase | undefined
  return fila ? aAlumnoClase(fila) : null
}

function buscarExistente(db: Bd, entrada: AlumnoEntrada): { id: number } | undefined {
  const dni = entrada.dni?.trim()
  if (dni) {
    const porDni = db.prepare('SELECT id FROM alumnos WHERE dni = ? COLLATE NOCASE').get(dni) as
      { id: number } | undefined
    if (porDni) return porDni
  }

  const email = entrada.email?.trim()
  if (email) {
    const porEmail = db
      .prepare('SELECT id FROM alumnos WHERE email = ? COLLATE NOCASE')
      .get(email) as { id: number } | undefined
    if (porEmail) return porEmail
  }

  return db
    .prepare(
      'SELECT id FROM alumnos WHERE nombre = ? COLLATE NOCASE AND apellidos = ? COLLATE NOCASE'
    )
    .get(entrada.nombre.trim(), entrada.apellidos.trim()) as { id: number } | undefined
}

export function crearAlumnoEnGrupoClase(
  db: Bd,
  grupoClaseId: number,
  entrada: AlumnoEntrada
): ResultadoAltaAlumnoClase {
  if (!obtenerGrupoClase(db, grupoClaseId)) throw new Error('El grupo no existe.')

  const previo = buscarExistente(db, entrada)
  const alumnoId = previo ? previo.id : crearAlumno(db, entrada).id

  db.prepare(
    'INSERT OR IGNORE INTO matriculas_clase (alumno_id, grupo_clase_id) VALUES (?, ?)'
  ).run(alumnoId, grupoClaseId)

  return {
    alumno: obtenerAlumnoClase(db, alumnoId)!,
    creado: !previo
  }
}

export function activarAlumnoClase(db: Bd, alumnoId: number, activo: boolean): AlumnoClase | null {
  const resultado = db
    .prepare('UPDATE alumnos SET activo = ? WHERE id = ?')
    .run(activo ? 1 : 0, alumnoId)
  return resultado.changes > 0 ? obtenerAlumnoClase(db, alumnoId) : null
}

export function desmatricularDeGrupoClase(db: Bd, grupoClaseId: number, alumnoId: number): boolean {
  return (
    db
      .prepare('DELETE FROM matriculas_clase WHERE grupo_clase_id = ? AND alumno_id = ?')
      .run(grupoClaseId, alumnoId).changes > 0
  )
}
