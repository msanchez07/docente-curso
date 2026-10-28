/**
 * Matrículas en grupos de clase e importación de alumnado.
 *
 * La importación reutiliza el mismo parser que el resto de la aplicación
 * (JSON de hoja de cálculo o CSV). Si la fila trae DNI y ya existe un alumno
 * con ese DNI, no se duplica: se matricula al que ya está.
 */
import type { Bd } from '../conexion'
import { parsearEntradaAlumnos } from '@shared/importar-alumnos'
import { crearAlumno } from './alumnos'

export interface ResultadoImportacionClase {
  creados: number
  existentes: number
  errores: string[]
}

export function importarAlumnosEnGrupoClase(
  db: Bd,
  grupoClaseId: number,
  texto: string
): ResultadoImportacionClase {
  const grupo = db.prepare('SELECT 1 FROM grupos_clase WHERE id = ?').get(grupoClaseId)
  if (!grupo) throw new Error('El grupo no existe.')

  const filas = parsearEntradaAlumnos(texto)
  const errores: string[] = []
  let creados = 0
  let existentes = 0

  const buscarPorDni = db.prepare('SELECT id FROM alumnos WHERE dni = ? COLLATE NOCASE')
  const buscarPorEmail = db.prepare('SELECT id FROM alumnos WHERE email = ? COLLATE NOCASE')
  const buscarPorNombre = db.prepare(
    'SELECT id FROM alumnos WHERE nombre = ? COLLATE NOCASE AND apellidos = ? COLLATE NOCASE'
  )
  const matricular = db.prepare(
    'INSERT OR IGNORE INTO matriculas_clase (alumno_id, grupo_clase_id) VALUES (?, ?)'
  )

  db.transaction(() => {
    filas.forEach((fila, indice) => {
      if (!fila.nombre || !fila.apellidos) {
        errores.push(`Fila ${indice + 1}: faltan nombre o apellidos`)
        return
      }
      try {
        const dni = fila.dni?.trim() || null
        let previo = dni ? (buscarPorDni.get(dni) as { id: number } | undefined) : undefined
        if (!previo && fila.email) {
          previo = buscarPorEmail.get(fila.email) as { id: number } | undefined
        }
        if (!previo) {
          previo = buscarPorNombre.get(fila.nombre, fila.apellidos) as { id: number } | undefined
        }

        let alumnoId: number
        if (previo) {
          alumnoId = previo.id
          existentes++
        } else {
          alumnoId = crearAlumno(db, fila).id
          creados++
        }
        matricular.run(alumnoId, grupoClaseId)
      } catch (error) {
        errores.push(
          `Fila ${indice + 1} (${fila.nombre} ${fila.apellidos}): ${(error as Error).message}`
        )
      }
    })
  })()

  return { creados, existentes, errores }
}
