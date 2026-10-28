/**
 * Cursos académicos (26/26, 25/26…).
 *
 * Son el nivel superior de la aplicación: cada grupo de clase cuelga de un
 * curso académico. Solo puede haber un curso marcado como actual.
 */
import type { Bd } from '../conexion'
import type { CursoAcademico, CursoAcademicoEntrada } from '@shared/tipos'
import { cursoAcademicoActual, esCursoAcademicoActual } from '@shared/curso-academico'

const CAMPOS = `ca.id, ca.nombre, ca.inicio, ca.fin, ca.actual, ca.creado_en,
                (SELECT COUNT(*) FROM grupos_clase gc
                  WHERE gc.curso_academico_id = ca.id) AS grupos`

interface FilaCurso {
  id: number
  nombre: string
  inicio: number
  fin: number
  actual: number
  grupos: number
  creado_en: string
}

function normalizar(fila: FilaCurso): CursoAcademico {
  return { ...fila, actual: fila.actual === 1 }
}

function validarNombre(nombre: string): string {
  const limpio = nombre?.trim()
  if (!limpio) throw new Error('El nombre del curso académico es obligatorio.')
  if (limpio.length > 40) {
    throw new Error('El nombre del curso académico no puede superar 40 caracteres.')
  }
  return limpio
}

function existeNombre(db: Bd, nombre: string, exceptoId: number | null = null): boolean {
  const fila = db
    .prepare(
      `SELECT 1 FROM cursos_academicos
        WHERE lower(nombre) = lower(?)
          AND (? IS NULL OR id <> ?)`
    )
    .get(nombre, exceptoId, exceptoId)
  return fila !== undefined
}

export function listarCursosAcademicos(db: Bd): CursoAcademico[] {
  return (
    db
      .prepare(
        `SELECT ${CAMPOS}
           FROM cursos_academicos ca
          ORDER BY ca.actual DESC, ca.inicio DESC`
      )
      .all() as FilaCurso[]
  ).map(normalizar)
}

export function obtenerCursoAcademico(db: Bd, id: number): CursoAcademico | null {
  const fila = db.prepare(`SELECT ${CAMPOS} FROM cursos_academicos ca WHERE ca.id = ?`).get(id) as
    FilaCurso | undefined
  return fila ? normalizar(fila) : null
}

export function obtenerCursoActual(db: Bd): CursoAcademico | null {
  const fila = db
    .prepare(
      `SELECT ${CAMPOS}
         FROM cursos_academicos ca
        WHERE ca.actual = 1
        ORDER BY ca.id
        LIMIT 1`
    )
    .get() as FilaCurso | undefined
  if (fila) return normalizar(fila)
  const primera = db
    .prepare(`SELECT ${CAMPOS} FROM cursos_academicos ca ORDER BY ca.id LIMIT 1`)
    .get() as FilaCurso | undefined
  return primera ? normalizar(primera) : null
}

export function asegurarCursoActual(db: Bd): CursoAcademico {
  const periodo = cursoAcademicoActual()
  const existente = db
    .prepare('SELECT id, actual FROM cursos_academicos WHERE inicio = ? AND fin = ?')
    .get(periodo.inicio, periodo.fin) as { id: number; actual: number } | undefined

  if (existente) {
    if (existente.actual !== 1) {
      db.transaction(() => {
        db.prepare('UPDATE cursos_academicos SET actual = 0').run()
        db.prepare('UPDATE cursos_academicos SET actual = 1 WHERE id = ?').run(existente.id)
      })()
    }
    return obtenerCursoAcademico(db, existente.id)!
  }

  let id = 0
  db.transaction(() => {
    db.prepare('UPDATE cursos_academicos SET actual = 0').run()
    const resultado = db
      .prepare('INSERT INTO cursos_academicos (nombre, inicio, fin, actual) VALUES (?, ?, ?, 1)')
      .run(periodo.nombre, periodo.inicio, periodo.fin)
    id = Number(resultado.lastInsertRowid)
  })()

  return obtenerCursoAcademico(db, id)!
}

export function crearCursoAcademico(db: Bd, entrada: CursoAcademicoEntrada): CursoAcademico {
  const periodo = cursoAcademicoActual()
  const nombre = validarNombre(entrada.nombre)
  if (nombre !== periodo.nombre) {
    throw new Error(`Solo se puede crear el curso académico actual (${periodo.nombre}).`)
  }

  const existente = db
    .prepare('SELECT id FROM cursos_academicos WHERE inicio = ? AND fin = ?')
    .get(periodo.inicio, periodo.fin) as { id: number } | undefined
  if (existente || existeNombre(db, nombre)) {
    throw new Error(`Ya existe el curso académico «${nombre}».`)
  }

  let id = 0
  db.transaction(() => {
    db.prepare('UPDATE cursos_academicos SET actual = 0').run()
    const resultado = db
      .prepare('INSERT INTO cursos_academicos (nombre, inicio, fin, actual) VALUES (?, ?, ?, 1)')
      .run(nombre, periodo.inicio, periodo.fin)
    id = Number(resultado.lastInsertRowid)
  })()

  return obtenerCursoAcademico(db, id)!
}

export function actualizarCursoAcademico(
  db: Bd,
  id: number,
  entrada: CursoAcademicoEntrada
): CursoAcademico | null {
  const actual = obtenerCursoAcademico(db, id)
  if (!actual) return null

  const nombre = validarNombre(entrada.nombre)
  if (existeNombre(db, nombre, id)) {
    throw new Error(`Ya existe el curso académico «${nombre}».`)
  }

  const marcarActual = entrada.actual ?? actual.actual
  if (!marcarActual && actual.actual) {
    const otros = db
      .prepare('SELECT COUNT(*) AS total FROM cursos_academicos WHERE actual = 1 AND id <> ?')
      .get(id) as { total: number }
    if (otros.total === 0) {
      throw new Error(
        'Tiene que haber un curso académico actual. Activa otro antes de desmarcarlo.'
      )
    }
  }

  db.transaction(() => {
    if (marcarActual) db.prepare('UPDATE cursos_academicos SET actual = 0').run()
    db.prepare('UPDATE cursos_academicos SET nombre = ?, actual = ? WHERE id = ?').run(
      nombre,
      marcarActual ? 1 : 0,
      id
    )
  })()

  return obtenerCursoAcademico(db, id)
}

export function marcarCursoActual(db: Bd, id: number): CursoAcademico | null {
  const curso = obtenerCursoAcademico(db, id)
  if (!curso) return null
  if (!esCursoAcademicoActual(curso)) {
    throw new Error('El curso actual se calcula por la fecha; no se puede activar otro.')
  }
  db.transaction(() => {
    db.prepare('UPDATE cursos_academicos SET actual = 0').run()
    db.prepare('UPDATE cursos_academicos SET actual = 1 WHERE id = ?').run(id)
  })()
  return obtenerCursoAcademico(db, id)
}

export function borrarCursoAcademico(db: Bd, id: number): boolean {
  const curso = obtenerCursoAcademico(db, id)
  if (!curso) return false
  db.transaction(() => {
    db.prepare('DELETE FROM grupos_clase WHERE curso_academico_id = ?').run(id)
    db.prepare('DELETE FROM cursos_academicos WHERE id = ?').run(id)
  })()
  return true
}
