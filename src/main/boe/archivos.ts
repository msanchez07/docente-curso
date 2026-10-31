/**
 * Lectura de los ficheros de datos empaquetados con la aplicación:
 * `resources/boe/*.json` (RA y CE del BOE) y `resources/mapa/*.json`
 * (correspondencia entre el contenido de los cursos y los RA).
 */
import { app } from 'electron'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { CatalogoHorarios, Ciclo } from '@shared/tipos'

export function directorioRecursos(): string {
  const candidatos = app.isPackaged
    ? [join(process.resourcesPath, 'resources')]
    : [join(app.getAppPath(), 'resources'), join(process.cwd(), 'resources')]
  return candidatos.find((c) => existsSync(c)) ?? candidatos[0]
}

export function directorioBoe(): string {
  return join(directorioRecursos(), 'boe')
}

function leerJson<T>(ruta: string): T | null {
  try {
    return JSON.parse(readFileSync(ruta, 'utf-8')) as T
  } catch (error) {
    console.error(`No se pudo leer ${ruta}:`, error)
    return null
  }
}

function ficherosJson(directorio: string): string[] {
  if (!existsSync(directorio)) return []
  return readdirSync(directorio)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => join(directorio, f))
}

export function leerCiclosBoe(): Ciclo[] {
  return ficherosJson(directorioBoe())
    .map((ruta) => leerJson<Ciclo>(ruta))
    .filter((c): c is Ciclo => c !== null)
}

/** Catálogo de secuenciación y horarios; se usa el primer JSON disponible. */
export function leerCatalogoHorarios(): CatalogoHorarios | null {
  const rutas = ficherosJson(join(directorioRecursos(), 'horarios'))
  if (rutas.length === 0) return null
  return leerJson<CatalogoHorarios>(rutas[0])
}
