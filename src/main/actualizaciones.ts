/**
 * Comprobación de actualizaciones desde GitHub Releases.
 *
 * Solo se ejecuta en la aplicación empaquetada. No descarga nada hasta que la
 * persona usuaria acepta, y avisa de nuevo antes de reiniciar para instalar.
 */
import { app, dialog, type BrowserWindow, type MessageBoxOptions } from 'electron'
import { autoUpdater } from 'electron-updater'

let ventanaPrincipal: BrowserWindow | null = null
let iniciada = false
let dialogoAbierto = false

function mostrarDialogo(opciones: MessageBoxOptions): Promise<number> {
  const ventana = ventanaPrincipal
  if (ventana && !ventana.isDestroyed()) {
    return dialog.showMessageBox(ventana, opciones).then((resultado) => resultado.response)
  }
  return dialog.showMessageBox(opciones).then((resultado) => resultado.response)
}

async function preguntarInstalar(version: string): Promise<void> {
  if (dialogoAbierto) return
  dialogoAbierto = true
  try {
    const respuesta = await mostrarDialogo({
      type: 'info',
      title: 'Actualización disponible',
      message: `Hay una nueva versión de Aula Nova: ${version}`,
      detail:
        '¿Quieres descargarla e instalarla ahora? La aplicación se reiniciará cuando termine la descarga.',
      buttons: ['Instalar ahora', 'Más tarde'],
      defaultId: 0,
      cancelId: 1,
      noLink: true
    })
    if (respuesta === 0) await autoUpdater.downloadUpdate()
  } catch (error) {
    console.error('[actualizaciones] No se pudo descargar la actualización:', error)
  } finally {
    dialogoAbierto = false
  }
}

async function preguntarReiniciar(): Promise<void> {
  if (dialogoAbierto) return
  dialogoAbierto = true
  try {
    const respuesta = await mostrarDialogo({
      type: 'info',
      title: 'Actualización preparada',
      message: 'La nueva versión de Aula Nova ya está descargada.',
      detail: 'Reinicia la aplicación para terminar de instalarla.',
      buttons: ['Reiniciar e instalar', 'Más tarde'],
      defaultId: 0,
      cancelId: 1,
      noLink: true
    })
    if (respuesta === 0) autoUpdater.quitAndInstall()
  } finally {
    dialogoAbierto = false
  }
}

/**
 * Arranca la comprobación automática. Es idempotente: si se vuelve a crear la
 * ventana, solo se actualiza la referencia para los diálogos.
 */
export function iniciarActualizaciones(ventana: BrowserWindow): void {
  ventanaPrincipal = ventana
  if (iniciada || !app.isPackaged || process.env.GE_VENTANA_OCULTA === '1') return
  iniciada = true

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    void preguntarInstalar(info.version)
  })
  autoUpdater.on('update-downloaded', () => {
    void preguntarReiniciar()
  })
  autoUpdater.on('error', (error) => {
    console.error('[actualizaciones] Error al comprobar la actualización:', error)
  })

  // Deja terminar de arrancar la aplicación antes de consultar GitHub.
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((error) => {
      console.error('[actualizaciones] No se pudo comprobar la actualización:', error)
    })
  }, 6000)
}
