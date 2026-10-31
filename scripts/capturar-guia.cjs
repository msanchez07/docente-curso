/**
 * Genera las capturas de la guía integrada con Electron.
 *
 * Uso:
 *   1. npm run dev:web
 *   2. npx electron scripts/capturar-guia.cjs
 */
const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

app.disableHardwareAcceleration()

const capturas = [
  ['calendario-curso', '#/calendario'],
  ['dashboard', '#/grupo/1'],
  ['horario', '#/grupo/1/horario'],
  ['programacion', '#/grupo/1/programacion'],
  ['programacion-didactica', '#/grupo/1/programacion-didactica'],
  ['criterios', '#/grupo/1/criterios'],
  ['criterios-trimestres', '#/grupo/1/criterios', 'trimestres'],
  ['calificaciones', '#/grupo/1/calificaciones'],
  ['entregas', '#/grupo/1/entregas'],
  ['alumnado', '#/grupo/1/alumnado'],
  ['faltas', '#/faltas?grupo=1'],
  ['informes', '#/grupo/1/informes'],
  ['grupos', '#/grupos'],
  ['plantillas', '#/plantillas'],
  ['backups', '#/backups'],
  ['normativa', '#/normativa'],
  ['global-menu', '#/grupo/1', 'global']
]

const destino = path.join(__dirname, '..', 'src', 'renderer', 'src', 'assets', 'guia')
fs.mkdirSync(destino, { recursive: true })

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

app.whenReady().then(async () => {
  const ventana = new BrowserWindow({
    width: 1440,
    height: 1000,
    show: false,
    webPreferences: {
      offscreen: true,
      contextIsolation: true,
      sandbox: true
    }
  })
  ventana.setContentSize(1440, 1000)
  ventana.webContents.setZoomFactor(0.9)

  ventana.webContents.on('console-message', (_evento, nivel, mensaje) => {
    if (nivel >= 2) console.error(`[renderer] ${mensaje}`)
  })

  if (process.env.CAPTURA_RESET === '1') {
    await ventana.loadURL('http://localhost:5173/')
    await esperar(400)
    await ventana.webContents.executeJavaScript('localStorage.clear(); location.reload()')
    await esperar(1000)
  }

  const filtro = process.env.CAPTURA_RUTA
  const lista = filtro ? [['guia', filtro]] : capturas

  for (const [nombre, ruta, accion] of lista) {
    await ventana.loadURL(`http://localhost:5173/${ruta}`)
    await esperar(1200)
    const accionExtra = accion ?? process.env.CAPTURA_ACCION
    if (accionExtra === 'trimestres') {
      await ventana.webContents.executeJavaScript(`
        Array.from(document.querySelectorAll('button'))
          .find((boton) => boton.textContent.trim() === 'Trimestres')
          ?.click()
      `)
      await esperar(350)
    } else if (accionExtra === 'ayuda') {
      await ventana.webContents.executeJavaScript(`
        Array.from(document.querySelectorAll('button'))
          .find((boton) => boton.textContent.trim() === 'Ayuda')
          ?.click()
      `)
      await esperar(350)
    } else if (accionExtra === 'siguiente') {
      await ventana.webContents.executeJavaScript(`
        document.querySelector('button[aria-label="Mes siguiente"]')?.click()
      `)
      await esperar(350)
    } else if (accionExtra === 'global') {
      await ventana.webContents.executeJavaScript(`
        document.querySelector('.menu-global summary')?.click()
      `)
      await esperar(350)
    }
    const imagen = await ventana.webContents.capturePage()
    const archivo = path.join(destino, `${nombre}.png`)
    fs.writeFileSync(archivo, imagen.toPNG())
    console.log(`Captura: ${archivo}`)
  }

  ventana.destroy()
  app.quit()
})
