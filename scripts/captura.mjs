/**
 * Captura de pantalla de la aplicación para revisar el diseño.
 *
 * Arranca el proceso principal real con una base de datos temporal, navega a
 * una ruta y guarda una imagen con `webContents.capturePage()`.
 *
 *   node_modules/.bin/electron scripts/captura.mjs /ajustes 0 capturas/ajustes.png
 */
import { app, BrowserWindow } from 'electron'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const raiz = process.cwd()
const [
  ruta = '/ajustes',
  desplazamiento = '0',
  salida = 'capturas/captura.png',
  pulsar = '',
  ancho = '1200',
  alto = '800'
] = process.argv.slice(2)

const dirDatos = mkdtempSync(join(tmpdir(), 'ge-cap-'))
app.setPath('userData', dirDatos)

async function esperarVentana() {
  for (let i = 0; i < 120; i++) {
    const ventanas = BrowserWindow.getAllWindows()
    if (ventanas.length > 0 && !ventanas[0].webContents.isLoading()) return ventanas[0]
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error('no apareció ninguna ventana')
}

app.whenReady().then(async () => {
  try {
    await import(pathToFileURL(join(raiz, 'out/main/index.js')).href)
    const ventana = await esperarVentana()
    ventana.setSize(Number(ancho), Number(alto))

    // Datos mínimos para que las vistas tengan contenido.
    await ventana.webContents.executeJavaScript(`
      (async () => {
        const grupos = await window.api.grupos.listar()
        if (grupos.length === 0) {
          await window.api.grupos.crear({ modulo_codigo: '0613', nombre: 'Presencial', modalidad: 'presencial' })
          await window.api.grupos.crear({ modulo_codigo: '0613', nombre: 'Semipresencial', modalidad: 'semipresencial' })
        }
        const lista = await window.api.grupos.listar()
        const grupo = lista[0]
        const alumnos = await window.api.alumnos.listar(grupo.id)
        if (alumnos.length === 0) {
          await window.api.alumnos.crear({ nombre: 'Lucía', apellidos: 'Fernández Ruiz', email: 'lucia@ejemplo.com', grupos: [grupo.id] })
          await window.api.alumnos.crear({ nombre: 'Marcos', apellidos: 'Gómez Peña', email: 'marcos@ejemplo.com', grupos: [grupo.id] })
        }
        const entregas = await window.api.entregas.listar('0613')
        if (entregas.length === 0) {
          await window.api.entregas.crear({ modulo_codigo: '0613', titulo: 'Examen AV1', tipo: 'examen', avaluacion: 'AV1', categoria: 'examenes' })
          await window.api.entregas.crear({ modulo_codigo: '0613', titulo: 'Actividades AV1', tipo: 'practica', avaluacion: 'AV1', categoria: 'actividades' })
        }
        window.location.hash = '#${ruta}'
        window.location.reload()
        return true
      })()
    `)

    await new Promise((r) => setTimeout(r, 3000))
    const leerPestanas = `
      Array.from(document.querySelectorAll('[role=tab]')).map((t) => t.id + '="' + t.textContent.trim() + '"=' + t.getAttribute('aria-selected')).join(' | ')
    `
    console.log(`antes: ${await ventana.webContents.executeJavaScript(leerPestanas)}`)

    if (pulsar) {
      // El clic puede llegar antes de que Vue monte: se reintenta hasta lograrlo.
      for (let intento = 0; intento < 8; intento++) {
        await ventana.webContents.executeJavaScript(
          `document.querySelector(${JSON.stringify(pulsar)})?.click()`
        )
        await new Promise((r) => setTimeout(r, 400))
        const seleccionada = await ventana.webContents.executeJavaScript(
          `document.querySelector(${JSON.stringify(pulsar)})?.getAttribute('aria-selected')`
        )
        if (seleccionada === 'true') break
      }
      console.log(`después: ${await ventana.webContents.executeJavaScript(leerPestanas)}`)
    }
    await new Promise((r) => setTimeout(r, 1500))
    await ventana.webContents.executeJavaScript(
      `document.querySelector('.contenido').scrollTop = ${Number(desplazamiento)}`
    )
    await new Promise((r) => setTimeout(r, 700))
    await ventana.webContents.capturePage()
    await new Promise((r) => setTimeout(r, 500))

    const imagen = await ventana.webContents.capturePage()
    writeFileSync(salida, imagen.toPNG())
    console.log(`captura guardada: ${salida}`)
    rmSync(dirDatos, { recursive: true, force: true })
    app.exit(0)
  } catch (error) {
    console.error('error en la captura:', error)
    rmSync(dirDatos, { recursive: true, force: true })
    app.exit(1)
  }
})
