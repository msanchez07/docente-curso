/**
 * Comprobación y descarga de actualizaciones desde GitHub Releases.
 *
 * En Windows y Linux se usa el instalador de electron-updater. En macOS la
 * actualización automática de Squirrel exige una firma Developer ID de Apple;
 * como la release va firmada ad-hoc, se descarga el DMG con progreso y se abre
 * para que la persona usuaria lo arrastre a Aplicaciones.
 */
import { app, shell, type BrowserWindow } from 'electron'
import { createWriteStream } from 'node:fs'
import { unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { autoUpdater } from 'electron-updater'
import type { EventoActualizacion } from '@shared/tipos'

const URL_DESCARGA = 'https://github.com/msanchez07/docente-curso/releases/latest'

let ventanaPrincipal: BrowserWindow | null = null
let iniciada = false
let descargaSolicitada = false
let rutaDmgMac: string | null = null

function enviar(evento: EventoActualizacion): void {
  const ventana = ventanaPrincipal
  if (!ventana || ventana.isDestroyed()) return
  ventana.webContents.send('actualizaciones:evento', evento)
}

function enviarError(mensaje: string): void {
  enviar({ estado: 'error', mensaje })
}

function urlDmgMac(): string {
  const arquitectura = process.arch === 'arm64' ? 'arm64' : 'x64'
  return `${URL_DESCARGA}/download/AulaNova-mac-${arquitectura}.dmg`
}

async function descargarDmgMac(version: string | undefined): Promise<void> {
  const respuesta = await fetch(urlDmgMac(), { redirect: 'follow' })
  if (!respuesta.ok || !respuesta.body) {
    throw new Error(`No se pudo descargar el instalador (HTTP ${respuesta.status}).`)
  }
  const total = Number(respuesta.headers.get('content-length')) || 0
  const nombre = `Aula Nova${version ? ` ${version}` : ''}.dmg`
  const destino = join(app.getPath('downloads'), nombre)
  const salida = createWriteStream(destino)
  const inicio = Date.now()
  let transferido = 0
  let ultimoAviso = 0

  try {
    for await (const trozo of respuesta.body as unknown as AsyncIterable<Uint8Array>) {
      if (!salida.write(trozo)) {
        await new Promise<void>((resolver) => salida.once('drain', resolver))
      }
      transferido += trozo.length
      const ahora = Date.now()
      if (ahora - ultimoAviso > 200) {
        enviar({
          estado: 'descargando',
          porcentaje: total > 0 ? (transferido / total) * 100 : 0,
          transferido,
          total,
          bytesPorSegundo: transferido / Math.max(1, (ahora - inicio) / 1000)
        })
        ultimoAviso = ahora
      }
    }
    await new Promise<void>((resolver, rechazar) => {
      salida.end(resolver)
      salida.once('error', rechazar)
    })
  } catch (error) {
    salida.destroy()
    await unlink(destino).catch(() => undefined)
    throw error
  }

  rutaDmgMac = destino
  enviar({
    estado: 'lista',
    version,
    manual: true,
    mensaje: `Instalador descargado en ${destino}. Abre el DMG y arrastra Aula Nova a Aplicaciones.`
  })
  const errorApertura = await shell.openPath(destino)
  if (errorApertura) await shell.showItemInFolder(destino)
}

export function iniciarActualizaciones(ventana: BrowserWindow): void {
  ventanaPrincipal = ventana
  if (iniciada || !app.isPackaged || process.env.GE_VENTANA_OCULTA === '1') return
  iniciada = true

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = process.platform !== 'darwin'

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
  rutaDmgMac = null
  try {
    enviar({ estado: 'descargando', porcentaje: 0 })
    if (process.platform === 'darwin') {
      const version = app.getVersion()
      await descargarDmgMac(undefined)
      console.log(`[actualizaciones] DMG de macOS preparado para la versión ${version}.`)
    } else {
      await autoUpdater.downloadUpdate()
    }
  } catch (error) {
    enviarError((error as Error).message ?? String(error))
  }
}

export function instalarActualizacion(): void {
  if (process.platform === 'darwin') {
    if (rutaDmgMac) {
      void shell.openPath(rutaDmgMac).then((error) => {
        if (error) void shell.showItemInFolder(rutaDmgMac!)
      })
      return
    }
    void shell.openExternal(URL_DESCARGA)
    return
  }

  autoUpdater.quitAndInstall()
  setTimeout(() => {
    if (ventanaPrincipal && !ventanaPrincipal.isDestroyed()) {
      enviarError(
        'No se ha podido reiniciar automáticamente para instalar la actualización. Descarga el instalador manualmente.'
      )
    }
  }, 6000)
}

/** Comprobación manual desde Configuración. */
export function comprobarActualizacion(): void {
  if (!app.isPackaged || process.env.GE_VENTANA_OCULTA === '1') {
    enviar({
      estado: 'no-disponible',
      mensaje: 'La comprobación de actualizaciones solo está disponible en la aplicación instalada.'
    })
    return
  }
  reintentarActualizacion()
}

export function reintentarActualizacion(): void {
  descargaSolicitada = false
  rutaDmgMac = null
  enviar({ estado: 'comprobando' })
  autoUpdater.checkForUpdates().catch((error) => {
    enviarError((error as Error).message ?? String(error))
  })
}

export function abrirDescargaManual(): void {
  void shell.openExternal(URL_DESCARGA)
}
