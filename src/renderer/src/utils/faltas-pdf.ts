/**
 * Lector del PDF de faltas de ITACA.
 *
 * Reutiliza la lógica de posiciones del PDF de la aplicación de faltas:
 * localiza la tabla entre «Sesiones:» y «TOTAL», agrupa las columnas por
 * módulo y suma las faltas de cada alumno.
 */
import * as pdfjsLib from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

const INICIO = 'Sesiones:'
const FIN = 'TOTAL'

export interface FilaFaltasPdf {
  nombre: string
  /** Código de módulo del informe → total de faltas. */
  modulos: Record<string, number>
}

function posicionInicio(items: any[]): number {
  let posicion = 1
  for (const item of items) {
    if (item.str === INICIO) break
    posicion++
  }
  return posicion
}

function posicionFin(items: any[]): number {
  let posicion = 0
  for (const item of items) {
    if (item.str === FIN) break
    posicion++
  }
  return posicion
}

function posicionAlumnos(items: any[]): number {
  let posicion = posicionInicio(items)
  for (let i = posicionInicio(items); i < items.length; i++) {
    const item = items[i]
    if (item.str && item.str.length > 10) break
    posicion++
  }
  return posicion
}

function modulosDe(items: any[], incluirJustificadas: boolean): Record<string, string> {
  const modulos: Record<string, string> = {}
  const inicio = posicionInicio(items)
  const fin = posicionFin(items)
  for (let i = inicio; i < fin; i++) {
    const item = items[i]
    if (
      item.str &&
      typeof item.str === 'string' &&
      item.str.length >= 3 &&
      /[a-zA-Z]/.test(item.str)
    ) {
      modulos[items[i + 4]?.transform?.[5]] = item.str
      if (incluirJustificadas) modulos[items[i + 6]?.transform?.[5]] = item.str
    }
  }
  return modulos
}

function alumnosDe(items: any[]): Record<number, string> {
  const alumnos: Record<number, string> = {}
  for (let i = posicionInicio(items); i < items.length; i++) {
    const item = items[i]
    if (item.str && item.str.length > 10 && item.str.includes(',')) {
      const [apellidos, nombre] = item.str.split(',')
      alumnos[item.transform[4] | 0] = `${nombre.trim()} ${apellidos.trim()}`
    }
  }
  return alumnos
}

function esEntero(valor: unknown): boolean {
  return typeof valor === 'string' && /^[0-9]+$/.test(valor)
}

function moduloDe(modulos: Record<string, string>, columna: number): string | null {
  const claves = Object.keys(modulos).map(Number)
  if (claves.length === 0) return null
  const menores = claves.filter((clave) => clave < columna)
  const mayores = claves.filter((clave) => clave > columna)
  const menor = menores.length ? Math.max(...menores) : null
  const mayor = mayores.length ? Math.min(...mayores) : null
  let cercana: number | null = null
  if (menor !== null && mayor !== null) {
    cercana = Math.abs(columna - menor) <= Math.abs(columna - mayor) ? menor : mayor
  } else {
    cercana = menor ?? mayor
  }
  if (cercana === null) return null
  if (Math.abs(columna - cercana) > 10) return null
  return modulos[String(cercana)] ?? null
}

export async function extraerFaltasPdf(
  archivo: File,
  incluirJustificadas: boolean
): Promise<FilaFaltasPdf[]> {
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await archivo.arrayBuffer()) })
    .promise
  const pagina = await pdf.getPage(1)
  const contenido = await pagina.getTextContent()
  const items = contenido.items as any[]

  const modulos = modulosDe(items, incluirJustificadas)
  const alumnos = alumnosDe(items)
  const filas = new Map<string, FilaFaltasPdf>()
  for (const nombre of Object.values(alumnos)) {
    filas.set(nombre, { nombre, modulos: Object.fromEntries(Object.values(modulos).map((m) => [m, 0])) })
  }

  for (let i = posicionAlumnos(items); i < items.length; i++) {
    const item = items[i]
    if (!esEntero(item.str)) continue
    const fila = item.transform[4] | 0
    const columna = item.transform[5] | 0
    const alumno = alumnos[fila]
    const modulo = moduloDe(modulos, columna)
    const filaAlumno = alumno ? filas.get(alumno) : null
    if (filaAlumno && modulo) filaAlumno.modulos[modulo] += Number(item.str)
  }

  return [...filas.values()]
}
