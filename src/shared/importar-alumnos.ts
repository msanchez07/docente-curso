/**
 * Parseo del fichero de alumnado.
 *
 * Vive en `shared` porque lo usan tanto el proceso principal (importación
 * real en SQLite) como la previsualización web. Acepta el volcado JSON de una
 * hoja de cálculo (`[[{ "nombre": … }]]`), un array JSON o texto delimitado
 * (CSV con `;` o `,`). Las columnas se reconocen por su nombre.
 */

export interface FilaImportada {
  nombre: string
  apellidos: string
  dni: string | null
  email: string | null
}

const CLAVES = {
  nombre: [/^nombre/, /^name/, /^nombres?$/],
  apellidos: [/^apellid/, /surname/, /lastname/],
  dni: [/dni/, /nif/, /documento/],
  email: [/correo/, /email/, /^mail/]
}

function normalizarClave(clave: string): string {
  return clave
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function coincide(clave: string, patrones: RegExp[]): boolean {
  return patrones.some((patron) => patron.test(clave))
}

function mapearObjeto(objeto: Record<string, unknown>): FilaImportada {
  const entradas = Object.entries(objeto).map(([k, v]) => [normalizarClave(k), v] as const)
  const buscar = (patrones: RegExp[]): string | null => {
    for (const [clave, valor] of entradas) {
      if (!coincide(clave, patrones) || valor === null || valor === undefined) continue
      const texto = String(valor).trim()
      if (texto) return texto
    }
    return null
  }
  return {
    nombre: buscar(CLAVES.nombre) ?? '',
    apellidos: buscar(CLAVES.apellidos) ?? '',
    dni: buscar(CLAVES.dni),
    email: buscar(CLAVES.email)
  }
}

/**
 * Recoge, esté donde esté, todos los objetos que parecen una fila de alumnado
 * (tienen una columna de nombre). Así funciona igual con `[{…}]`, con
 * `[[{…}]]` o con un envoltorio del tipo `{ "alumnos": [ … ] }`.
 */
function recogerFilas(
  valor: unknown,
  salida: Record<string, unknown>[] = []
): Record<string, unknown>[] {
  if (Array.isArray(valor)) {
    for (const elemento of valor) recogerFilas(elemento, salida)
    return salida
  }
  if (valor !== null && typeof valor === 'object') {
    const objeto = valor as Record<string, unknown>
    const claves = Object.keys(objeto).map(normalizarClave)
    if (claves.some((clave) => coincide(clave, CLAVES.nombre))) {
      salida.push(objeto)
    } else {
      for (const elemento of Object.values(objeto)) recogerFilas(elemento, salida)
    }
  }
  return salida
}

function desdeJson(texto: string): FilaImportada[] {
  const datos: unknown = JSON.parse(texto)
  return recogerFilas(datos).map(mapearObjeto)
}

function desdeDelimitado(texto: string): FilaImportada[] {
  const filas = texto
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter(Boolean)
    .map((linea) => linea.split(/[;,]/).map((campo) => campo.trim()))
  if (filas.length === 0) return []

  const cabecera = filas[0].map(normalizarClave)
  const tieneCabecera = cabecera.some(
    (clave) =>
      coincide(clave, CLAVES.nombre) ||
      coincide(clave, CLAVES.apellidos) ||
      coincide(clave, CLAVES.email) ||
      coincide(clave, CLAVES.dni)
  )

  if (tieneCabecera) {
    const indice = (patrones: RegExp[]): number => cabecera.findIndex((c) => coincide(c, patrones))
    const iNombre = indice(CLAVES.nombre)
    const iApellidos = indice(CLAVES.apellidos)
    const iDni = indice(CLAVES.dni)
    const iEmail = indice(CLAVES.email)

    return filas.slice(1).map((campos) => ({
      nombre: (iNombre >= 0 ? campos[iNombre] : '') ?? '',
      apellidos: (iApellidos >= 0 ? campos[iApellidos] : '') ?? '',
      dni: iDni >= 0 ? campos[iDni] || null : null,
      email: iEmail >= 0 ? campos[iEmail] || null : null
    }))
  }

  // Sin cabecera: orden nombre, apellidos, dni, email.
  return filas.map(([nombre = '', apellidos = '', dni = '', email = '']) => ({
    nombre,
    apellidos,
    dni: dni || null,
    email: email || null
  }))
}

/** Normaliza el texto de entrada (JSON o delimitado) a filas de alumnado. */
export function parsearEntradaAlumnos(texto: string): FilaImportada[] {
  const limpio = texto.trim()
  if (!limpio) return []
  if (limpio.startsWith('[') || limpio.startsWith('{')) {
    try {
      return desdeJson(limpio)
    } catch {
      // Si no es JSON válido, se intenta como texto delimitado.
    }
  }
  return desdeDelimitado(limpio)
}
