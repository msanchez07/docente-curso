import type { ArchivoRubrica } from '@shared/tipos'

/** Límite pensado para que el demo en navegador quepa en localStorage. */
export const MAX_ARCHIVO_BYTES = 4 * 1024 * 1024
export const MAX_RUBRICA_BYTES = MAX_ARCHIVO_BYTES

export interface ArchivoLeido {
  nombre: string
  tipo: string
  datos: string
  tamano: number
}

function aBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binario = ''
  const bloque = 0x8000
  for (let i = 0; i < bytes.length; i += bloque) {
    binario += String.fromCharCode(...bytes.subarray(i, i + bloque))
  }
  return btoa(binario)
}

export async function leerArchivoDeFichero(
  file: File,
  maximo = MAX_ARCHIVO_BYTES
): Promise<ArchivoLeido> {
  if (file.size > maximo) {
    throw new Error('El archivo supera el máximo de 4 MB.')
  }
  const buffer = await file.arrayBuffer()
  return {
    nombre: file.name,
    tipo: file.type || 'application/octet-stream',
    datos: aBase64(buffer),
    tamano: file.size
  }
}

export async function leerRubricaDeFichero(file: File): Promise<ArchivoRubrica> {
  const { nombre, tipo, datos } = await leerArchivoDeFichero(file, MAX_RUBRICA_BYTES)
  return { nombre, tipo, datos }
}

export function urlDeArchivo(archivo: { tipo: string; datos: string }): string {
  return `data:${archivo.tipo || 'application/octet-stream'};base64,${archivo.datos}`
}

function blobDeArchivo(archivo: { tipo: string; datos: string }): Blob {
  const binario = atob(archivo.datos)
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i)
  return new Blob([bytes], { type: archivo.tipo || 'application/octet-stream' })
}

export function abrirArchivo(archivo: { nombre: string; tipo: string; datos: string }): void {
  const url = URL.createObjectURL(blobDeArchivo(archivo))
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.target = '_blank'
  enlace.rel = 'noopener'
  enlace.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function descargarArchivo(archivo: { nombre: string; tipo: string; datos: string }): void {
  const url = URL.createObjectURL(blobDeArchivo(archivo))
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = archivo.nombre
  enlace.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function abrirArchivoRubrica(archivo: ArchivoRubrica): void {
  abrirArchivo(archivo)
}

export function descargarArchivoRubrica(archivo: ArchivoRubrica): void {
  descargarArchivo(archivo)
}

export function tamanoLegible(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

export function tamanoBase64(datos: string): number {
  return Math.floor((datos.length * 3) / 4)
}
