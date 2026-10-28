/**
 * Importación del listado de días de la programación de aula.
 *
 * Acepta:
 * - un array de fechas (`["2026-09-15", …]`) o de objetos con `fecha` y,
 *   opcionalmente, `contenido`, `desviacion` y `observaciones`;
 * - un envoltorio `{ "dias": [...] }` o `{ "programacion": [...] }`;
 * - una tabla pegada desde una hoja de cálculo: una línea por día, con
 *   columnas separadas por tabulador, punto y coma o barra vertical.
 */

export interface DiaImportado {
  fecha: string
  contenido: string
  desviacion: string
  observaciones: string
}

export interface ResultadoDiasImportados {
  dias: DiaImportado[]
  errores: string[]
}

const RE_ISO = /^\d{4}-\d{2}-\d{2}$/
const RE_DMA = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/

function normalizarFecha(valor: string): string | null {
  const texto = valor.trim()
  if (RE_ISO.test(texto)) {
    const fecha = new Date(`${texto}T00:00:00Z`)
    return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === texto
      ? texto
      : null
  }
  const coincidencia = RE_DMA.exec(texto)
  if (coincidencia) {
    const [, dia, mes, anio] = coincidencia
    const iso = `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
    const fecha = new Date(`${iso}T00:00:00Z`)
    return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === iso ? iso : null
  }
  return null
}

function normalizarClave(clave: string): string {
  return clave
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function buscar(objeto: Record<string, unknown>, patrones: RegExp[]): string {
  for (const [clave, valor] of Object.entries(objeto)) {
    const normalizada = normalizarClave(clave)
    if (!patrones.some((patron) => patron.test(normalizada))) continue
    if (valor === null || valor === undefined) continue
    const texto = String(valor).trim()
    if (texto) return texto
  }
  return ''
}

function extraerLista(datos: unknown): unknown[] | null {
  if (Array.isArray(datos)) return datos
  if (datos !== null && typeof datos === 'object') {
    const objeto = datos as Record<string, unknown>
    for (const clave of ['dias', 'días', 'programacion', 'programación', 'fechas']) {
      const valor = objeto[clave]
      if (Array.isArray(valor)) return valor
    }
  }
  return null
}

function dividirLinea(linea: string, delimitador: string): string[] {
  const campos: string[] = []
  let actual = ''
  let entreComillas = false
  for (let i = 0; i < linea.length; i += 1) {
    const caracter = linea[i]
    if (caracter === '"') {
      if (entreComillas && linea[i + 1] === '"') {
        actual += '"'
        i += 1
      } else {
        entreComillas = !entreComillas
      }
      continue
    }
    if (caracter === delimitador && !entreComillas) {
      campos.push(actual.trim())
      actual = ''
      continue
    }
    actual += caracter
  }
  campos.push(actual.trim())
  return campos
}

function detectarDelimitador(linea: string): string | null {
  if (linea.includes('\t')) return '\t'
  if (linea.includes(';')) return ';'
  if (linea.includes('|')) return '|'
  return null
}

function parsearTabla(texto: string): ResultadoDiasImportados {
  const lineas = texto
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter(Boolean)
  if (lineas.length === 0) return { dias: [], errores: ['La tabla está vacía.'] }

  const delimitador = detectarDelimitador(lineas[0])
  const filas = lineas.map((linea) => (delimitador ? dividirLinea(linea, delimitador) : [linea]))

  const cabecera = filas[0].map((campo) => normalizarClave(campo))
  const tieneCabecera = cabecera.some(
    (campo) => campo.includes('fecha') || campo.includes('date') || campo === 'dia'
  )
  const indices = {
    fecha: 0,
    contenido: 1,
    desviacion: 2,
    observaciones: 3
  }
  if (tieneCabecera) {
    cabecera.forEach((campo, indice) => {
      if (campo.includes('fecha') || campo.includes('date') || campo === 'dia') {
        indices.fecha = indice
      } else if (
        campo.includes('contenido') ||
        campo.includes('actividad') ||
        campo.includes('texto') ||
        campo.includes('descripcion')
      ) {
        indices.contenido = indice
      } else if (campo.includes('desviacion') || campo.includes('desvio')) {
        indices.desviacion = indice
      } else if (campo.includes('observacion') || campo.includes('nota')) {
        indices.observaciones = indice
      }
    })
  }

  const dias: DiaImportado[] = []
  const vistos = new Set<string>()
  const errores: string[] = []
  const inicio = tieneCabecera ? 1 : 0

  filas.slice(inicio).forEach((campos, indice) => {
    const numero = indice + inicio + 1
    const fechaCruda = campos[indices.fecha] ?? ''
    const fecha = normalizarFecha(fechaCruda)
    if (!fecha) {
      errores.push(`Línea ${numero}: fecha no válida («${fechaCruda}»).`)
      return
    }
    if (vistos.has(fecha)) {
      errores.push(`Línea ${numero}: el día ${fecha} está repetido.`)
      return
    }
    vistos.add(fecha)
    dias.push({
      fecha,
      contenido: campos[indices.contenido] ?? '',
      desviacion: campos[indices.desviacion] ?? '',
      observaciones: campos[indices.observaciones] ?? ''
    })
  })

  dias.sort((a, b) => a.fecha.localeCompare(b.fecha))
  return { dias, errores }
}

export function parsearDiasProgramacion(texto: string): ResultadoDiasImportados {
  const limpio = texto.trim()
  if (!limpio) return { dias: [], errores: ['El fichero está vacío.'] }

  let datos: unknown
  try {
    datos = JSON.parse(limpio)
  } catch {
    const tabla = parsearTabla(limpio)
    if (tabla.dias.length > 0) return tabla
    return {
      dias: [],
      errores:
        tabla.errores.length > 0 ? tabla.errores : ['El contenido no es JSON ni una tabla de días.']
    }
  }

  const lista = extraerLista(datos)
  if (!lista) {
    return { dias: [], errores: ['Se esperaba un array de días o un objeto con «dias».'] }
  }

  const dias: DiaImportado[] = []
  const vistos = new Set<string>()
  const errores: string[] = []

  lista.forEach((elemento, indice) => {
    let fechaCruda = ''
    let contenido = ''
    let desviacion = ''
    let observaciones = ''

    if (typeof elemento === 'string') {
      fechaCruda = elemento
    } else if (elemento !== null && typeof elemento === 'object') {
      const objeto = elemento as Record<string, unknown>
      fechaCruda = buscar(objeto, [/^fecha/, /^date/, /^dia/])
      contenido = buscar(objeto, [/^contenido/, /^actividad/, /^texto/, /^descripcion/])
      desviacion = buscar(objeto, [/^desviacion/, /^desvio/])
      observaciones = buscar(objeto, [/^observacion/, /^notas?/])
    } else {
      errores.push(`Elemento ${indice + 1}: no es una fecha ni un objeto.`)
      return
    }

    const fecha = normalizarFecha(fechaCruda)
    if (!fecha) {
      errores.push(`Elemento ${indice + 1}: fecha no válida («${fechaCruda}»).`)
      return
    }
    if (vistos.has(fecha)) {
      errores.push(`Elemento ${indice + 1}: el día ${fecha} está repetido.`)
      return
    }
    vistos.add(fecha)
    dias.push({ fecha, contenido, desviacion, observaciones })
  })

  dias.sort((a, b) => a.fecha.localeCompare(b.fecha))
  return { dias, errores }
}
