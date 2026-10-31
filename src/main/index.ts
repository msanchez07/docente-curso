import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { APP, AUTOR } from '@shared/autor'
import { cerrarBd, inicializarBd } from './bd'
import { registrarIpc } from './ipc'
import { registrarEsquemaNormativa, registrarProtocoloNormativa } from './normativa-fpt'
import { backupAutomatico } from './backup/servicio'
import { guardarEstadoVentana, leerEstadoVentana } from './ventana/estado'

// Nombre fijo de la aplicación: determina el directorio de datos del usuario
// (`userData`), donde vive la base de datos. Sin esto dependería de cómo se
// lance Electron.
app.setName('gestion-entregas')

// El esquema debe registrarse antes de que Electron esté listo.
registrarEsquemaNormativa()

// Permite lanzar la app con la ventana oculta (pruebas automatizadas / CI).
const VENTANA_OCULTA = process.env.GE_VENTANA_OCULTA === '1'

function crearVentana(): void {
  const estado = VENTANA_OCULTA
    ? { width: 1200, height: 800, maximized: false, fullscreen: false }
    : leerEstadoVentana()
  const ventana = new BrowserWindow({
    width: estado.width,
    height: estado.height,
    ...(estado.x !== undefined && estado.y !== undefined ? { x: estado.x, y: estado.y } : {}),
    minWidth: 940,
    minHeight: 640,
    fullscreen: estado.fullscreen,
    show: false,
    autoHideMenuBar: true,
    title: `${APP.nombre} · ${APP.subtitulo}`,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // Seguridad: el renderer no tiene acceso a Node ni al proceso principal.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (!VENTANA_OCULTA && estado.maximized && !estado.fullscreen) ventana.maximize()

  ventana.on('ready-to-show', () => {
    if (!VENTANA_OCULTA) ventana.show()
  })

  if (!VENTANA_OCULTA) {
    let temporizador: NodeJS.Timeout | undefined
    const guardar = (): void => {
      if (temporizador) clearTimeout(temporizador)
      temporizador = setTimeout(() => guardarEstadoVentana(ventana), 250)
    }
    ventana.on('resize', guardar)
    ventana.on('move', guardar)
    ventana.on('maximize', guardar)
    ventana.on('unmaximize', guardar)
    ventana.on('enter-full-screen', guardar)
    ventana.on('leave-full-screen', guardar)
    ventana.on('close', () => {
      if (temporizador) clearTimeout(temporizador)
      guardarEstadoVentana(ventana)
    })
  }

  ventana.webContents.setWindowOpenHandler((detalles) => {
    if (detalles.url === 'about:blank' || detalles.url.startsWith('data:text/html')) {
      return { action: 'allow' }
    }
    shell.openExternal(detalles.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    ventana.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    ventana.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('es.manuelsanchez.aulanova')
  app.setAboutPanelOptions({
    applicationName: APP.nombre,
    applicationVersion: app.getVersion(),
    copyright: `© 2026 ${AUTOR.nombre}`,
    credits: `${AUTOR.rol}\n${AUTOR.email}`
  })

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  inicializarBd()
  registrarIpc()
  registrarProtocoloNormativa()
  // Copia automática al abrir: solo escribe los grupos que hayan cambiado.
  void backupAutomatico().catch((error) => {
    console.error('No se pudo completar la copia automática:', error)
  })
  crearVentana()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) crearVentana()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  const ventana = BrowserWindow.getAllWindows()[0]
  if (ventana) guardarEstadoVentana(ventana)
})

app.on('will-quit', () => cerrarBd())
