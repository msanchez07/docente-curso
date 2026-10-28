/**
 * Exportación de la programación de aula a PDF.
 *
 * El PDF se genera desde la base de datos, no desde la vista filtrada: incluye
 * todas las sesiones del grupo, aunque en pantalla solo se esté viendo una
 * quincena. La exportación se hace con una ventana oculta de Electron y
 * `webContents.printToPDF`, igual que los informes.
 */
import { app, BrowserWindow, dialog } from 'electron'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { generarHtmlProgramacion } from '@shared/programacion-pdf'
import type { GrupoClase, ResultadoInforme } from '@shared/tipos'
import { obtenerBd } from '../bd'
import { listarProgramacion } from '../db/repositorios/programacion-aula'
import { listarUnidadesProgramacion } from '../db/repositorios/unidades-programacion'
import { obtenerGrupoClase } from '../db/repositorios/grupos-clase'

function nombreFichero(grupo: GrupoClase): string {
  return `programacion-${grupo.nombre.replace(/[^\w.-]+/g, '_')}.pdf`
}

export async function exportarProgramacionPdf(grupoClaseId: number): Promise<ResultadoInforme> {
  const db = obtenerBd()
  const grupo = obtenerGrupoClase(db, grupoClaseId)
  if (!grupo) throw new Error('El grupo no existe.')
  const filas = listarProgramacion(db, grupoClaseId)
  const unidades = listarUnidadesProgramacion(db, grupoClaseId)
  const html = generarHtmlProgramacion(grupo, filas, unidades)

  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Guardar programación de aula en PDF',
    defaultPath: join(app.getPath('documents'), nombreFichero(grupo)),
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  })
  if (canceled || !filePath) return { ok: false, mensaje: 'Guardado cancelado' }

  const temporal = join(app.getPath('temp'), `programacion-${Date.now()}.html`)
  await writeFile(temporal, html, 'utf-8')

  const ventana = new BrowserWindow({ show: false, webPreferences: { offscreen: true } })
  try {
    await ventana.loadFile(temporal)
    const pdf = await ventana.webContents.printToPDF({
      printBackground: true,
      landscape: true,
      pageSize: 'A4',
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `<div style="width:100%; padding:0 56px; color:#667085; font:8px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display:flex; justify-content:space-between;">
        <span>Programación de aula</span>
        <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
      </div>`,
      margins: {
        marginType: 'custom',
        top: 52,
        bottom: 64,
        left: 56,
        right: 56
      }
    })
    await writeFile(filePath, pdf)
    return { ok: true, ruta: filePath }
  } finally {
    ventana.destroy()
  }
}
