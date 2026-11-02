/**
 * Comprobación y descarga de actualizaciones desde GitHub Releases.
 *
 * La descarga no empieza hasta que la persona usuaria pulsa «Instalar ahora».
 * El progreso y los errores se envían a la barra de actualización del renderer.
 */
import { app, shell, type BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { EventoActualizacion } from '@shared/tipos'

const URL_DESCARGA = 'https://github.com/msanchez07/docente-curso/releases/latest'

let ventanaPrincipal: BrowserWindow | null = null
let iniciada = false
let descargaSolicitada = false

function enviar(evento: EventoActualizacion): void {
  const ventana = ventanaPrincipal
  if (!ventana || ventana.isDestroyed()) return
  ventana.webContents.send('actualizaciones:evento', evento)
}

function enviarError(mensaje: string): void {
  enviar({ estado: 'error', mensaje })
}

export function iniciarActualizaciones(ventana: BrowserWindow): void {
  ventanaPrincipal = ventana
  if (iniciada || !app.isPackaged || process.env.GE_VENTANA_OCULTA === '1') return
  iniciada = true

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    enviar({ estado: 'comprobando' })
  })
  autoUpdater.on('update-available', (info) => {
    enviar({ estado: 'disponible', version: info.version })
  })
  autoUpdater.on('update-not-available', () => {
    enviar({ estado: 'no-disponible' })
  })
  autoUpdater.on('download-progress', (progreso) => {
    enviar({
      estado: 'descargando',
      porcentaje: progreso.percent,
      transferido: progreso.transferred,
      total: progreso.total,
      bytesPorSegundo: progreso.bytesPerSecond
    })
  })
  autoUpdater.on('update-downloaded', (info) => {
    enviar({ estado: 'lista', version: info.version })
  })
  autoUpdater.on('error', (error) => {
    if (descargaSolicitada) {
      enviarError(error.message)
    } else {
      console.error('[actualizaciones] Error al comprobar la actualización:', error)
    }
  })

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((error) => {
      console.error('[actualizaciones] No se pudo comprobar la actualización:', error)
    })
  }, 6000)
}

export async function descargarActualizacion(): Promise<void> {
  descargaSolicitada = true
  try {
    enviar({ estado: 'descargando', porcentaje: 0 })
    await autoUpdater.downloadUpdate()
  } catch (error) {
    enviarError((error as Error).message ?? String(error))
  }
}

export function instalarActualizacion(): void {
  autoUpdater.quitAndInstall()
  // Si Squirrel no puede reiniciar (por ejemplo, por la firma ad-hoc de macOS),
  // la app sigue viva: se avisa y se ofrece la descarga manual.
  setTimeout(() => {
    if (ventanaPrincipal && !ventanaPrincipal.isDestroyed()) {
      enviarError(
        'No se ha podido reiniciar automáticamente para instalar la actualización. Descarga el instalador manualmente.'
      )
    }
  }, 6000)
}

export function reintentarActualizacion(): void {
  descargaSolicitada = false
  enviar({ estado: 'comprobando' })
  autoUpdater.checkForUpdates().catch((error) => {
    enviarError((error as Error).message ?? String(error))
  })
}

export function abrirDescargaManual(): void {
  void shell.openExternal(URL_DESCARGA)
}
