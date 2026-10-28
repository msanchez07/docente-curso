/**
 * Criterios de calificación por grupo de clase.
 *
 * Se guardan como un JSON versionado porque el modelo se edita y se guarda
 * entero. La copia se limita a grupos del **mismo módulo y modalidad**, que
 * comparten plantilla de evaluación.
 */
import type { Bd } from '../conexion'
import type { ModeloEvaluacion } from '@shared/tipos'
import { modeloPorDefecto, normalizarModelo, validarModelo } from '../../domain/modelo'
import { obtenerGrupoClase } from './grupos-clase'

const UPSERT = `
  INSERT INTO criterios_grupo_clase (grupo_clase_id, version, modelo, actualizado_en)
  VALUES (?, 1, ?, datetime('now'))
  ON CONFLICT(grupo_clase_id) DO UPDATE SET
    version        = version + 1,
    modelo         = excluded.modelo,
    actualizado_en = datetime('now')
`

export function obtenerCriterios(db: Bd, grupoClaseId: number): ModeloEvaluacion | null {
  const fila = db
    .prepare('SELECT modelo FROM criterios_grupo_clase WHERE grupo_clase_id = ?')
    .get(grupoClaseId) as { modelo: string } | undefined
  if (!fila) return null
  try {
    return normalizarModelo(JSON.parse(fila.modelo))
  } catch {
    return null
  }
}

export function guardarCriterios(
  db: Bd,
  grupoClaseId: number,
  modelo: ModeloEvaluacion
): ModeloEvaluacion {
  if (!obtenerGrupoClase(db, grupoClaseId)) {
    throw new Error('El grupo no existe.')
  }
  const validacion = validarModelo(modelo)
  if (!validacion.ok) throw new Error(validacion.errores.join(' '))

  const normalizado = normalizarModelo(modelo)
  if (!normalizado) throw new Error('El modelo de evaluación no es válido.')

  db.prepare(UPSERT).run(grupoClaseId, JSON.stringify(normalizado))
  return normalizado
}

/** Copia los criterios guardados a los demás grupos del mismo módulo. */
export function copiarCriteriosMismoModulo(db: Bd, grupoClaseId: number): number {
  const origen = obtenerGrupoClase(db, grupoClaseId)
  if (!origen) throw new Error('El grupo no existe.')

  const modelo = obtenerCriterios(db, grupoClaseId) ?? modeloPorDefecto(origen.modalidad)
  const destinos = db
    .prepare(
      `SELECT id
         FROM grupos_clase
        WHERE modulo_codigo = ? AND id <> ?`
    )
    .all(origen.modulo_codigo, grupoClaseId) as { id: number }[]

  const guardar = db.prepare(UPSERT)
  db.transaction(() => {
    for (const destino of destinos) {
      guardar.run(destino.id, JSON.stringify(modelo))
    }
  })()

  return destinos.length
}
