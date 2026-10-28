/**
 * Exportación de entregas.
 *
 * - Si solo hay texto/rúbrica: un PDF con formato de dossier.
 * - Si hay archivos: un ZIP con los archivos y, cuando también hay texto, el
 *   dossier en PDF dentro del propio ZIP.
 * - Se puede exportar una entrega, una avaluación completa o todo el curso.
 */
import { app, BrowserWindow, dialog } from 'electron'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import JSZip from 'jszip'
import type {
  AmbitoExportacionEntregas,
  EntregaClase,
  EvidenciaClase,
  OpcionesExportacionEntregas,
  ResultadoInforme,
  VistaPreviaEntregas
} from '@shared/tipos'
import { obtenerBd } from '../bd'
import { criteriosDisponibles } from '../db/repositorios/entregas'
import { listarEntregasClase } from '../db/repositorios/entregas-clase'
import { listarEvidenciasClase } from '../db/repositorios/evidencias-clase'
import { obtenerCriterios } from '../db/repositorios/criterios-grupo'
import { obtenerGrupoClase } from '../db/repositorios/grupos-clase'
import { generarHtmlEntregas, type DatosExportacionEntregas } from '@shared/entregas-documento'

function seleccionarEntregas(
  grupoId: number,
  opciones: OpcionesExportacionEntregas
): { entregas: EntregaClase[]; titulo: string } {
  const db = obtenerBd()
  const todas = listarEntregasClase(db, grupoId)

  if (opciones.ambito === 'entrega') {
    const entrega = todas.find((item) => item.id === Number(opciones.entregaId))
    if (!entrega) throw new Error('La entrega indicada no existe en este grupo.')
    return { entregas: [entrega], titulo: `Entrega: ${entrega.titulo}` }
  }

  if (opciones.ambito === 'avaluacion') {
    if (!opciones.avaluacionId) throw new Error('Falta la avaluación que se quiere exportar.')
    const modelo = obtenerCriterios(db, grupoId)
    const nombre =
      modelo?.avaluaciones.find((avaluacion) => avaluacion.id === opciones.avaluacionId)?.nombre ??
      opciones.avaluacionId
    return {
      entregas: todas.filter((entrega) => entrega.avaluacion_id === opciones.avaluacionId),
      titulo: `Avaluación: ${nombre}`
    }
  }

  return { entregas: todas, titulo: 'Curso completo' }
}

function datosDe(
  grupoId: number,
  entregas: EntregaClase[],
  tituloAmbito: string,
  ambito: AmbitoExportacionEntregas
): DatosExportacionEntregas {
  const db = obtenerBd()
  const grupo = obtenerGrupoClase(db, grupoId)
  if (!grupo) throw new Error('El grupo no existe.')
  const modelo = obtenerCriterios(db, grupoId)
  const evidencias = new Map<number, EvidenciaClase[]>()
  for (const entrega of entregas) {
    evidencias.set(entrega.id, listarEvidenciasClase(db, grupoId, entrega.id))
  }
  return {
    grupo,
    entregas,
    evidencias,
    criterios: criteriosDisponibles(db, grupo.modulo_codigo),
    avaluaciones: (modelo?.avaluaciones ?? []).map((avaluacion) => ({
      id: avaluacion.id,
      nombre: avaluacion.nombre
    })),
    categorias: (modelo?.categorias ?? []).map((categoria) => ({
      id: categoria.id,
      nombre: categoria.nombre
    })),
    ambito,
    tituloAmbito,
    fecha: new Date()
  }
}

function nombreSeguro(texto: string): string {
  return (
    texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w.-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80) || 'archivo'
  )
}

function base64Limpio(datos: string): string {
  const indice = datos.indexOf('base64,')
  return indice >= 0 ? datos.slice(indice + 7) : datos
}

async function generarPdf(html: string): Promise<Buffer> {
  const temporal = join(app.getPath('temp'), `entregas-${Date.now()}.html`)
  await writeFile(temporal, html, 'utf-8')
  const ventana = new BrowserWindow({ show: false, webPreferences: { offscreen: true } })
  try {
    await ventana.loadFile(temporal)
    return await ventana.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4'
    })
  } finally {
    ventana.destroy()
  }
}

function archivosDe(datos: DatosExportacionEntregas, entrega: EntregaClase): EvidenciaClase[] {
  return datos.evidencias.get(entrega.id) ?? []
}

function tieneArchivos(datos: DatosExportacionEntregas): boolean {
  return datos.entregas.some(
    (entrega) => Boolean(entrega.rubrica_archivo) || archivosDe(datos, entrega).length > 0
  )
}

function tieneTexto(datos: DatosExportacionEntregas): boolean {
  return datos.entregas.some((entrega) =>
    Boolean(entrega.descripcion?.trim() || entrega.rubrica?.trim())
  )
}

/** Genera el HTML de previsualización sin abrir ningún diálogo ni escribir nada. */
export function vistaPreviaEntregas(
  grupoClaseId: number,
  opciones: OpcionesExportacionEntregas
): VistaPreviaEntregas {
  const { entregas, titulo } = seleccionarEntregas(grupoClaseId, opciones)
  if (entregas.length === 0) throw new Error('No hay entregas que exportar en este ámbito.')
  const datos = datosDe(grupoClaseId, entregas, titulo, opciones.ambito)
  return {
    html: generarHtmlEntregas(datos),
    titulo,
    total: entregas.length,
    conArchivos: tieneArchivos(datos),
    conTexto: tieneTexto(datos)
  }
}

export async function exportarEntregas(
  grupoClaseId: number,
  opciones: OpcionesExportacionEntregas
): Promise<ResultadoInforme> {
  const { entregas, titulo } = seleccionarEntregas(grupoClaseId, opciones)
  if (entregas.length === 0) {
    return { ok: false, mensaje: 'No hay entregas que exportar en este ámbito.' }
  }

  const datos = datosDe(grupoClaseId, entregas, titulo, opciones.ambito)
  const conArchivos = tieneArchivos(datos)
  const conTexto = tieneTexto(datos)
  const extension = conArchivos ? 'zip' : 'pdf'
  const base =
    opciones.ambito === 'entrega'
      ? nombreSeguro(entregas[0].titulo)
      : opciones.ambito === 'avaluacion'
        ? `${nombreSeguro(titulo.replace(/^Avaluación:\s*/i, ''))}-${nombreSeguro(datos.grupo.nombre)}`
        : `entregas-${nombreSeguro(datos.grupo.nombre)}`

  const { canceled, filePath } = await dialog.showSaveDialog({
    title: conArchivos ? 'Guardar entregas en ZIP' : 'Guardar entregas en PDF',
    defaultPath: join(app.getPath('documents'), `${base}.${extension}`),
    filters:
      extension === 'zip'
        ? [{ name: 'ZIP', extensions: ['zip'] }]
        : [{ name: 'PDF', extensions: ['pdf'] }]
  })
  if (canceled || !filePath) return { ok: false, mensaje: 'Guardado cancelado' }

  if (!conArchivos) {
    const pdf = await generarPdf(generarHtmlEntregas(datos))
    await writeFile(filePath, pdf)
    return { ok: true, ruta: filePath }
  }

  const zip = new JSZip()
  const nombrePdf =
    opciones.ambito === 'entrega' ? `${nombreSeguro(entregas[0].titulo)}.pdf` : 'entregas.pdf'
  if (conTexto) {
    zip.file(nombrePdf, await generarPdf(generarHtmlEntregas(datos)))
  }

  const lineas: string[] = [
    `Entregas: ${titulo}`,
    `Grupo: ${datos.grupo.nombre}`,
    `Generado: ${new Date().toLocaleString('es-ES')}`,
    ''
  ]

  for (const [indice, entrega] of entregas.entries()) {
    const carpeta = `archivos/${String(indice + 1).padStart(2, '0')}-${nombreSeguro(entrega.titulo)}`
    lineas.push(`${indice + 1}. ${entrega.titulo}`)
    if (entrega.rubrica_archivo) {
      const archivo = entrega.rubrica_archivo
      const nombre = nombreSeguro(archivo.nombre)
      zip.file(`${carpeta}/rubrica/${nombre}`, base64Limpio(archivo.datos), { base64: true })
      lineas.push(`   - Rúbrica: ${nombre}`)
    }
    for (const evidencia of archivosDe(datos, entrega)) {
      const nombre = nombreSeguro(evidencia.nombre)
      zip.file(`${carpeta}/evidencias/${nombre}`, base64Limpio(evidencia.datos), {
        base64: true
      })
      lineas.push(`   - Evidencia (${evidencia.categoria}): ${nombre}`)
    }
  }

  zip.file('LEEME.txt', lineas.join('\n'))
  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  await writeFile(filePath, buffer)
  return { ok: true, ruta: filePath }
}
