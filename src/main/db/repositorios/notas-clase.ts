/**
 * Notas y anotaciones de las entregas por alumno.
 *
 * La nota es 0–10 y las anotaciones son texto libre. Una entrega sin nota
 * cuenta como 0 al calcular la categoría; una entrega sin nota ni anotación
 * simplemente no tiene fila.
 */
import type { Bd } from '../conexion'
import type { NotaEntradaClase, NotaGuardadaClase } from '@shared/tipos'
import { obtenerGrupoClase } from './grupos-clase'

interface FilaNota {
  entrega_id: number
  alumno_id: number
  nota: number
}

interface FilaAnotacion {
  entrega_id: number
  alumno_id: number
  texto: string
}

function clave(entregaId: number, alumnoId: number): string {
  return `${alumnoId}:${entregaId}`
}

export function listarNotasClase(db: Bd, grupoClaseId: number): NotaGuardadaClase[] {
  const notas = db
    .prepare(
      `SELECT n.entrega_id, n.alumno_id, n.nota
         FROM notas_entrega_clase n
         JOIN entregas_clase e ON e.id = n.entrega_id
        WHERE e.grupo_clase_id = ?`
    )
    .all(grupoClaseId) as FilaNota[]

  const anotaciones = db
    .prepare(
      `SELECT a.entrega_id, a.alumno_id, a.texto
         FROM anotaciones_entrega_clase a
         JOIN entregas_clase e ON e.id = a.entrega_id
        WHERE e.grupo_clase_id = ?`
    )
    .all(grupoClaseId) as FilaAnotacion[]

  const mapa = new Map<string, NotaGuardadaClase>()
  for (const nota of notas) {
    mapa.set(clave(nota.entrega_id, nota.alumno_id), {
      entrega_id: nota.entrega_id,
      alumno_id: nota.alumno_id,
      nota: nota.nota,
      observaciones: null
    })
  }
  for (const anotacion of anotaciones) {
    const actual = mapa.get(clave(anotacion.entrega_id, anotacion.alumno_id))
    if (actual) {
      actual.observaciones = anotacion.texto
    } else {
      mapa.set(clave(anotacion.entrega_id, anotacion.alumno_id), {
        entrega_id: anotacion.entrega_id,
        alumno_id: anotacion.alumno_id,
        nota: null,
        observaciones: anotacion.texto
      })
    }
  }

  return [...mapa.values()].sort((a, b) => a.alumno_id - b.alumno_id || a.entrega_id - b.entrega_id)
}

export function guardarNotasClase(
  db: Bd,
  grupoClaseId: number,
  alumnoId: number,
  notas: NotaEntradaClase[]
): NotaGuardadaClase[] {
  if (!obtenerGrupoClase(db, grupoClaseId)) throw new Error('El grupo no existe.')

  const matriculado = db
    .prepare('SELECT 1 FROM matriculas_clase WHERE grupo_clase_id = ? AND alumno_id = ?')
    .get(grupoClaseId, alumnoId)
  if (!matriculado) throw new Error('El alumno no está matriculado en este grupo.')

  const entregas = db
    .prepare('SELECT id, bloqueada FROM entregas_clase WHERE grupo_clase_id = ?')
    .all(grupoClaseId) as { id: number; bloqueada: number }[]
  const validas = new Map(entregas.map((entrega) => [entrega.id, entrega.bloqueada === 1]))

  const borrarNota = db.prepare(
    'DELETE FROM notas_entrega_clase WHERE entrega_id = ? AND alumno_id = ?'
  )
  const guardarNota = db.prepare(
    `INSERT INTO notas_entrega_clase (entrega_id, alumno_id, nota, actualizado_en)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(entrega_id, alumno_id) DO UPDATE SET
       nota = excluded.nota,
       actualizado_en = datetime('now')`
  )
  const borrarAnotacion = db.prepare(
    'DELETE FROM anotaciones_entrega_clase WHERE entrega_id = ? AND alumno_id = ?'
  )
  const guardarAnotacion = db.prepare(
    `INSERT INTO anotaciones_entrega_clase (entrega_id, alumno_id, texto, actualizado_en)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(entrega_id, alumno_id) DO UPDATE SET
       texto = excluded.texto,
       actualizado_en = datetime('now')`
  )

  db.transaction(() => {
    for (const entrada of notas) {
      const bloqueada = validas.get(entrada.entregaId)
      if (bloqueada === undefined) {
        throw new Error('La entrega no pertenece a este grupo.')
      }
      if (bloqueada) {
        throw new Error('La entrega está bloqueada: desbloquéala para cambiar sus notas.')
      }

      if (entrada.nota === null) {
        borrarNota.run(entrada.entregaId, alumnoId)
      } else {
        const nota = Number(entrada.nota)
        if (!Number.isFinite(nota) || nota < 0 || nota > 10) {
          throw new Error('La nota debe estar entre 0 y 10.')
        }
        guardarNota.run(entrada.entregaId, alumnoId, nota)
      }

      if (entrada.observaciones !== undefined) {
        const texto = entrada.observaciones?.trim() ?? ''
        if (texto) {
          guardarAnotacion.run(entrada.entregaId, alumnoId, texto)
        } else {
          borrarAnotacion.run(entrada.entregaId, alumnoId)
        }
      }
    }
  })()

  return listarNotasClase(db, grupoClaseId)
}
