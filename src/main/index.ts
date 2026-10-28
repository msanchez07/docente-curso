import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { cerrarBd, inicializarBd } from './bd'
import { registrarIpc } from './ipc'
import { registrarEsquemaNormativa, registrarProtocoloNormativa } from './normativa-fpt'
import { backupAutomatico } from './backup/servicio'

// Nombre fijo de la aplicación: determina el directorio de datos del usuario
// (`userData`), donde vive la base de datos. Sin esto dependería de cómo se
// lance Electron.
app.setName('gestion-entregas')

// El esquema debe registrarse antes de que Electron esté listo.
registrarEsquemaNormativa()

// Permite lanzar la app con la ventana oculta (pruebas automatizadas / CI).
const VENTANA_OCULTA = process.env.GE_VENTANA_OCULTA === '1'

function crearVentana(): void {
  const ventana = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 940,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    title: 'Gestión de entregas',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // Seguridad: el renderer no tiene acceso a Node ni al proceso principal.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  ventana.on('ready-to-show', () => {
    if (!VENTANA_OCULTA) ventana.show()
  })

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
  electronApp.setAppUserModelId('es.msanchez07.gestion-entregas')

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

app.on('will-quit', () => cerrarBd())
