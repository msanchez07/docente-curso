/**
 * Servicio de informes: construye los datos del grupo (módulo + modalidad),
 * genera el HTML/CSV y los exporta con los diálogos nativos de Electron.
 */
import { app, BrowserWindow, dialog } from 'electron'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ResultadoInforme } from '@shared/tipos'
import { obtenerBd } from '../bd'
import { obtenerCiclo } from '../db/repositorios/boe'
import { resumenEvaluacion } from '../db/repositorios/evaluacion'
import { cursoAcademico } from '../domain/curso'
import { generarCsv, generarHtml, type DatosInforme } from './plantilla'

interface FilaModulo {
  codigo: string
  nombre: string
  ects: number | null
  horas_minimas_boe: number | null
  ciclo_id: string
}

function construirDatos(grupoId: number, alumnoId?: number): DatosInforme {
  const db = obtenerBd()
  const resumen = resumenEvaluacion(db, grupoId)

  const modulo = db
    .prepare(
      'SELECT codigo, nombre, ects, horas_minimas_boe, ciclo_id FROM modulos WHERE codigo = ?'
    )
    .get(resumen.modulo.codigo) as FilaModulo | undefined
  if (!modulo) throw new Error(`El módulo ${resumen.modulo.codigo} no existe`)

  const ciclo = obtenerCiclo(db, modulo.ciclo_id)
  if (!ciclo) throw new Error(`No se encontró el ciclo ${modulo.ciclo_id}`)

  const alumnos = alumnoId
    ? resumen.alumnos.filter((a) => a.alumno.id === alumnoId)
    : resumen.alumnos

  const alumno = alumnoId ? alumnos[0]?.alumno : undefined
  const titulo = alumno
    ? `Informe de ${alumno.apellidos}, ${alumno.nombre}`
    : `Informe de ${modulo.codigo} — ${resumen.grupo.nombre}`

  return {
    titulo,
    ciclo: {
      denominacion: ciclo.denominacion,
      rd: ciclo.rd,
      rd_actualizacion: ciclo.rd_actualizacion,
      boe_url: ciclo.boe_url
    },
    modulo: {
      codigo: modulo.codigo,
      nombre: modulo.nombre,
      ects: modulo.ects,
      horas_minimas_boe: modulo.horas_minimas_boe
    },
    curso: cursoAcademico(),
    resumen,
    alumnos
  }}

export function informeHtml(grupoId: number, alumnoId?: number): string {
  return generarHtml(construirDatos(grupoId, alumnoId))
}

function nombreFichero(datos: DatosInforme, extension: string): string {
  const alumno = datos.alumnos[0]?.alumno
  const grupo = datos.resumen.grupo.nombre
  const base = alumno
    ? `informe-${datos.modulo.codigo}-${alumno.apellidos}-${alumno.nombre}`
    : `informe-${datos.modulo.codigo}-${grupo}`
  return `${base.replace(/[^\w.-]+/g, '_')}.${extension}`
}

export async function exportarPdf(grupoId: number, alumnoId?: number): Promise<ResultadoInforme> {
  const datos = construirDatos(grupoId, alumnoId)
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Guardar informe en PDF',
    defaultPath: join(app.getPath('documents'), nombreFichero(datos, 'pdf')),
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  })
  if (canceled || !filePath) return { ok: false, mensaje: 'Guardado cancelado' }

  const html = generarHtml(datos)
  const temporal = join(app.getPath('temp'), `informe-${Date.now()}.html`)
  await writeFile(temporal, html, 'utf-8')

  const ventana = new BrowserWindow({ show: false, webPreferences: { offscreen: true } })
  try {
    await ventana.loadFile(temporal)
    const pdf = await ventana.webContents.printToPDF({ printBackground: true })
    await writeFile(filePath, pdf)
    return { ok: true, ruta: filePath }
  } finally {
    ventana.destroy()
  }
}

export async function exportarCsv(grupoId: number): Promise<ResultadoInforme> {
  const datos = construirDatos(grupoId)
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Guardar notas en CSV',
    defaultPath: join(app.getPath('documents'), nombreFichero(datos, 'csv')),
    filters: [{ name: 'CSV', extensions: ['csv'] }]
  })
  if (canceled || !filePath) return { ok: false, mensaje: 'Guardado cancelado' }

  await writeFile(filePath, generarCsv(datos), 'utf-8')
  return { ok: true, ruta: filePath }
}
