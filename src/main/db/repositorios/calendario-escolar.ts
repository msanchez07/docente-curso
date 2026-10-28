/**
 * Calendario escolar por curso académico.
 *
 * Se importa completo: al importar un calendario válido se sustituyen los días
 * del curso. Si la importación no contiene ningún día válido, no se borra nada.
 */
import type { Bd } from '../conexion'
import type { DiaCalendario, ResultadoImportacionCalendario } from '@shared/tipos'
import { parsearCalendarioEscolar } from '@shared/importar-calendario'

const CAMPOS = `id, curso_academico_id, fecha, tipo, descripcion, creado_en, actualizado_en`

function cursoExiste(db: Bd, cursoId: number): boolean {
  return Boolean(db.prepare('SELECT 1 FROM cursos_academicos WHERE id = ?').get(cursoId))
}

export function listarCalendarioEscolar(db: Bd, cursoAcademicoId: number): DiaCalendario[] {
  return db
    .prepare(
      `SELECT ${CAMPOS}
         FROM calendario_escolar
        WHERE curso_academico_id = ?
        ORDER BY fecha, id`
    )
    .all(cursoAcademicoId) as DiaCalendario[]
}

export function importarCalendarioEscolar(
  db: Bd,
  cursoAcademicoId: number,
  texto: string
): ResultadoImportacionCalendario {
  if (!cursoExiste(db, cursoAcademicoId)) throw new Error('El curso académico no existe.')
  const { dias, errores } = parsearCalendarioEscolar(texto)
  if (dias.length === 0) {
    return { creados: 0, errores }
  }

  const insertar = db.prepare(
    `INSERT INTO calendario_escolar
       (curso_academico_id, fecha, tipo, descripcion)
     VALUES (?, ?, ?, ?)`
  )
  db.transaction(() => {
    db.prepare('DELETE FROM calendario_escolar WHERE curso_academico_id = ?').run(cursoAcademicoId)
    for (const dia of dias) {
      insertar.run(cursoAcademicoId, dia.fecha, dia.tipo, dia.descripcion ?? null)
    }
  })()
  return { creados: dias.length, errores }
}

export function vaciarCalendarioEscolar(db: Bd, cursoAcademicoId: number): boolean {
  return (
    db.prepare('DELETE FROM calendario_escolar WHERE curso_academico_id = ?').run(cursoAcademicoId)
      .changes > 0
  )
}
