import { app } from 'electron'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { generarCabeceraDocumento, type LogosDocumento } from '@shared/cabecera-documento'
import { obtenerBd } from '../bd'
import { obtenerConfiguracionGeneral } from '../db/repositorios/configuracion-general'

function rutaRecurso(...partes: string[]): string {
  const base = app.isPackaged ? process.resourcesPath : join(app.getAppPath(), 'resources')
  return join(base, ...partes)
}

async function dataUrl(ruta: string): Promise<string | null> {
  try {
    const datos = await readFile(ruta)
    return `data:image/png;base64,${datos.toString('base64')}`
  } catch {
    return null
  }
}

/** Cabecera institucional común para PDFs y documentos imprimibles. */
export async function cabeceraDocumentoHtml(): Promise<string> {
  const configuracion = obtenerConfiguracionGeneral(obtenerBd())
  const [conselleria, unionEuropea] = await Promise.all([
    dataUrl(rutaRecurso('plantillas', 'conselleria.png')),
    dataUrl(rutaRecurso('plantillas', 'union-europea.png'))
  ])
  const logos: LogosDocumento = { conselleria, unionEuropea }
  return generarCabeceraDocumento(configuracion, logos)
}
