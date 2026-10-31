/**
 * Configuración general de la aplicación: datos del profesorado, del centro y
 * logo. Se guarda como JSON en la tabla `config`.
 */
import type { ConfiguracionGeneral } from '@shared/tipos'
import { CONFIGURACION_GENERAL_POR_DEFECTO } from '@shared/tipos'
import type { Bd } from '../conexion'

const CLAVE = 'configuracion_general'
const MAX_LOGO = 3 * 1024 * 1024

function normalizar(config: Partial<ConfiguracionGeneral> | null): ConfiguracionGeneral {
  return {
    profesor: {
      ...CONFIGURACION_GENERAL_POR_DEFECTO.profesor,
      ...(config?.profesor ?? {})
    },
    centro: {
      ...CONFIGURACION_GENERAL_POR_DEFECTO.centro,
      ...(config?.centro ?? {})
    },
    logo: config?.logo ?? null
  }
}

export function obtenerConfiguracionGeneral(db: Bd): ConfiguracionGeneral {
  const fila = db.prepare('SELECT valor FROM config WHERE clave = ?').get(CLAVE) as
    | { valor: string }
    | undefined
  if (!fila) return normalizar(null)
  try {
    return normalizar(JSON.parse(fila.valor) as Partial<ConfiguracionGeneral>)
  } catch {
    return normalizar(null)
  }
}

export function guardarConfiguracionGeneral(
  db: Bd,
  config: ConfiguracionGeneral
): ConfiguracionGeneral {
  if (config.logo) {
    if (!config.logo.startsWith('data:image/png;base64,')) {
      throw new Error('El logo debe ser una imagen PNG.')
    }
    if (config.logo.length > MAX_LOGO) {
      throw new Error('El logo es demasiado grande. Usa una imagen inferior a 2 MB.')
    }
  }
  const normalizada = normalizar(config)
  db.prepare(
    `INSERT INTO config (clave, valor) VALUES (?, ?)
     ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`
  ).run(CLAVE, JSON.stringify(normalizada))
  return normalizada
}
