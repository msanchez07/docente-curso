/**
 * Persistencia del tamaño y estado de la ventana principal.
 *
 * La primera vez se abre maximizada. A partir de ahí se recuerda la última
 * configuración del usuario: tamaño, posición y si estaba maximizada. La
 * pantalla completa nativa no se persiste: al volver a abrir se restaura como
 * ventana maximizada, con los botones de la ventana visibles.
 */
import { app, screen, type BrowserWindow, type Rectangle } from 'electron'
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export interface EstadoVentana {
  width: number
  height: number
  x?: number
  y?: number
  maximized: boolean
}

export const ESTADO_VENTANA_POR_DEFECTO: EstadoVentana = {
  width: 1200,
  height: 800,
  maximized: true
}

function rutaEstadoVentana(): string {
  return join(app.getPath('userData'), 'ventana.json')
}

function numero(valor: unknown, defecto: number, minimo: number, maximo: number): number {
  const n = Number(valor)
  if (!Number.isFinite(n)) return defecto
  return Math.min(maximo, Math.max(minimo, Math.round(n)))
}

function posicion(valor: unknown): number | undefined {
  const n = Number(valor)
  return Number.isFinite(n) ? Math.round(n) : undefined
}

function visibleEnAlgunaPantalla(bounds: Rectangle): boolean {
  return screen.getAllDisplays().some((pantalla) => {
    const area = pantalla.workArea
    const ancho = Math.max(
      0,
      Math.min(bounds.x + bounds.width, area.x + area.width) - Math.max(bounds.x, area.x)
    )
    const alto = Math.max(
      0,
      Math.min(bounds.y + bounds.height, area.y + area.height) - Math.max(bounds.y, area.y)
    )
    return ancho >= 120 && alto >= 80
  })
}

/**
 * Normaliza lo leído del disco. Si la posición ya no pertenece a ninguna
 * pantalla, se descarta y Electron centra la ventana.
 */
export function normalizarEstadoVentana(valor: unknown): EstadoVentana {
  if (!valor || typeof valor !== 'object') return { ...ESTADO_VENTANA_POR_DEFECTO }
  const datos = valor as Record<string, unknown>
  const estado: EstadoVentana = {
    width: numero(datos.width, ESTADO_VENTANA_POR_DEFECTO.width, 940, 10000),
    height: numero(datos.height, ESTADO_VENTANA_POR_DEFECTO.height, 640, 10000),
    // Los estados antiguos guardaban `fullscreen`; se migran a maximizada.
    maximized: datos.maximized === true || datos.fullscreen === true
  }
  const x = posicion(datos.x)
  const y = posicion(datos.y)
  if (x !== undefined && y !== undefined) {
    const bounds = { x, y, width: estado.width, height: estado.height }
    if (visibleEnAlgunaPantalla(bounds)) {
      estado.x = x
      estado.y = y
    }
  }
  return estado
}

export function leerEstadoVentana(): EstadoVentana {
  const ruta = rutaEstadoVentana()
  if (!existsSync(ruta)) return { ...ESTADO_VENTANA_POR_DEFECTO }
  try {
    return normalizarEstadoVentana(JSON.parse(readFileSync(ruta, 'utf-8')))
  } catch {
    return { ...ESTADO_VENTANA_POR_DEFECTO }
  }
}

export function guardarEstadoVentana(ventana: BrowserWindow): void {
  if (ventana.isDestroyed()) return
  const bounds = ventana.getNormalBounds()
  const estado: EstadoVentana = {
    width: Math.max(940, Math.round(bounds.width)),
    height: Math.max(640, Math.round(bounds.height)),
    x: Math.round(bounds.x),
    y: Math.round(bounds.y),
    maximized: ventana.isMaximized() || ventana.isFullScreen()
  }
  const ruta = rutaEstadoVentana()
  const temporal = `${ruta}.tmp`
  try {
    writeFileSync(temporal, JSON.stringify(estado), 'utf-8')
    renameSync(temporal, ruta)
  } catch (error) {
    console.error('No se pudo guardar el estado de la ventana:', error)
  }
}
