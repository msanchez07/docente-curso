/**
 * Configuración global de la presentación editable del módulo.
 *
 * Se guarda en `config` porque es una preferencia de la aplicación, no un dato
 * de un grupo concreto: la misma plantilla se reutiliza para cualquier módulo.
 */
import type { PresentacionConfig } from '@shared/tipos'
import { normalizarPresentacion } from '@shared/presentacion'
import type { Bd } from '../conexion'

const CLAVE = 'presentacion:config'

export function obtenerPresentacion(db: Bd): PresentacionConfig {
  const fila = db.prepare('SELECT valor FROM config WHERE clave = ?').get(CLAVE) as
    | { valor: string }
    | undefined
  if (!fila) return normalizarPresentacion(null)
  try {
    return normalizarPresentacion(JSON.parse(fila.valor) as Partial<PresentacionConfig>)
  } catch {
    return normalizarPresentacion(null)
  }
}

export function guardarPresentacion(db: Bd, config: PresentacionConfig): PresentacionConfig {
  const normalizada = normalizarPresentacion(config)
  db.prepare(
    `INSERT INTO config (clave, valor) VALUES (?, ?)
     ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`
  ).run(CLAVE, JSON.stringify(normalizada))
  return normalizada
}
