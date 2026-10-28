/**
 * Normativa de FP incluida en la aplicación.
 *
 * El documento inicial se empaqueta en `resources/normativa-fp/index.html`.
 * La copia importada por el usuario vive en `userData/normativa-fp/index.html`
 * y sustituye a la incluida hasta que se restaure.
 *
 * En Electron se sirve mediante el protocolo interno `normativa:` para que el
 * iframe tenga su propio documento y no herede la CSP de la interfaz.
 */
import { app, protocol } from 'electron'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { dirname, join } from 'node:path'
import { validarHtmlNormativa } from '@shared/normativa'
import type { NormativaFpt } from '@shared/tipos'
import { directorioRecursos } from './boe/archivos'

const ESQUEMA = 'normativa'
const URL_NORMATIVA = 'normativa://app/index.html'

interface DocumentoNormativa {
  html: string
  origen: 'incluida' | 'importada'
  actualizado_en: string | null
}

function rutaIncluida(): string {
  return join(directorioRecursos(), 'normativa-fp', 'index.html')
}

function rutaImportada(): string {
  return join(app.getPath('userData'), 'normativa-fp', 'index.html')
}

function fechaDe(ruta: string): string | null {
  try {
    return statSync(ruta).mtime.toISOString()
  } catch {
    return null
  }
}

function leerDocumento(): DocumentoNormativa {
  const importada = rutaImportada()
  if (existsSync(importada)) {
    return {
      html: readFileSync(importada, 'utf-8'),
      origen: 'importada',
      actualizado_en: fechaDe(importada)
    }
  }

  const incluida = rutaIncluida()
  if (!existsSync(incluida)) {
    throw new Error('No se ha encontrado la normativa incluida con la aplicación.')
  }
  return {
    html: readFileSync(incluida, 'utf-8'),
    origen: 'incluida',
    actualizado_en: fechaDe(incluida)
  }
}

function estado(): Omit<DocumentoNormativa, 'html'> {
  const importada = rutaImportada()
  if (existsSync(importada)) {
    return { origen: 'importada', actualizado_en: fechaDe(importada) }
  }
  return { origen: 'incluida', actualizado_en: fechaDe(rutaIncluida()) }
}

function aRespuesta(): NormativaFpt {
  const { origen, actualizado_en } = estado()
  return {
    origen,
    actualizado_en,
    url: `${URL_NORMATIVA}?v=${encodeURIComponent(actualizado_en ?? '')}`,
    html: null
  }
}

export function leerNormativaFpt(): NormativaFpt {
  // Comprueba también que la normativa incluida exista.
  leerDocumento()
  return aRespuesta()
}

export function importarNormativaFpt(html: string): NormativaFpt {
  validarHtmlNormativa(html)
  const destino = rutaImportada()
  mkdirSync(dirname(destino), { recursive: true })
  const temporal = `${destino}.tmp`
  writeFileSync(temporal, html, 'utf-8')
  renameSync(temporal, destino)
  return aRespuesta()
}

export function restaurarNormativaFpt(): NormativaFpt {
  rmSync(rutaImportada(), { force: true })
  return aRespuesta()
}

/** Debe llamarse antes de `app.whenReady()`. */
export function registrarEsquemaNormativa(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: ESQUEMA,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true
      }
    }
  ])
}

/** Debe llamarse después de `app.whenReady()`. */
export function registrarProtocoloNormativa(): void {
  protocol.handle(ESQUEMA, (request) => {
    try {
      const url = new URL(request.url)
      if (url.hostname !== 'app' || url.pathname !== '/index.html') {
        return new Response('No encontrado', {
          status: 404,
          headers: { 'content-type': 'text/plain; charset=utf-8' }
        })
      }
      const { html } = leerDocumento()
      return new Response(html, {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-store'
        }
      })
    } catch (error) {
      return new Response((error as Error).message, {
        status: 500,
        headers: { 'content-type': 'text/plain; charset=utf-8' }
      })
    }
  })
}
