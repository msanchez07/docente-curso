/**
 * Importación de fechas de evaluaciones y exámenes.
 *
 * Acepta un array de objetos, `{ eventos: [...] }` o
 * `{ evaluaciones: [...], examenes: [...] }`.
 */
import type { EventoEvaluacionEntrada, TipoEventoEvaluacion } from './tipos'

export interface ResultadoEventosImportados {
  eventos: EventoEvaluacionEntrada[]
  errores: string[]
}

const RE_ISO = /^\d{4}-\d{2}-\d{2}$/
const RE_DMA = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
const RE_HORA = /^([01]?\d|2[0-3]):([0-5]\d)$/

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
    return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === iso
      ? iso
      : null
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
    if (!patrones.some((patron) => patron.test(normalizarClave(clave)))) continue
    if (valor === null || valor === undefined) continue
    const texto = String(valor).trim()
    if (texto) return texto
  }
  return ''
}

function normalizarTipo(valor: string): TipoEventoEvaluacion | null {
  const tipo = normalizarClave(valor)
  if (tipo.startsWith('evaluacion') || tipo === 'evaluaciones') return 'evaluacion'
  if (tipo.startsWith('examen') || tipo === 'examenes') return 'examen'
  return null
}

function extraerLista(datos: unknown): { elementos: unknown[]; tipoFijo?: TipoEventoEvaluacion } | null {
  if (Array.isArray(datos)) return { elementos: datos }
  if (datos !== null && typeof datos === 'object') {
    const objeto = datos as Record<string, unknown>
    for (const clave of ['eventos', 'fechas', 'calendario']) {
      if (Array.isArray(objeto[clave])) return { elementos: objeto[clave] as unknown[] }
    }
    const elementos: unknown[] = []
    let tipoFijo: TipoEventoEvaluacion | undefined
    for (const [clave, valor] of Object.entries(objeto)) {
      const tipo = normalizarTipo(clave)
      if (!tipo || !Array.isArray(valor)) continue
      for (const elemento of valor) {
        elementos.push(
          elemento !== null && typeof elemento === 'object'
            ? { ...(elemento as Record<string, unknown>), tipo: tipo }
            : elemento
        )
      }
      tipoFijo = tipo
    }
    if (elementos.length > 0) return { elementos, tipoFijo }
  }
  return null
}

export function parsearEventosEvaluacion(texto: string): ResultadoEventosImportados {
  const limpio = texto.trim()
  if (!limpio) return { eventos: [], errores: ['El contenido está vacío.'] }

  let datos: unknown
  try {
    datos = JSON.parse(limpio)
  } catch {
    return { eventos: [], errores: ['El contenido no es JSON válido.'] }
  }

  const extraido = extraerLista(datos)
  if (!extraido) {
    return {
      eventos: [],
      errores: ['Se esperaba un array, { eventos: [...] } o { evaluaciones, examenes }.']
    }
  }

  const eventos: EventoEvaluacionEntrada[] = []
  const errores: string[] = []

  extraido.elementos.forEach((elemento, indice) => {
    if (elemento === null || typeof elemento !== 'object') {
      errores.push(`Elemento ${indice + 1}: debe ser un objeto.`)
      return
    }
    const objeto = elemento as Record<string, unknown>
    const tipoCrudo = buscar(objeto, [/^tipo/, /^type/])
    const tipo = normalizarTipo(tipoCrudo) ?? extraido.tipoFijo
    if (!tipo) {
      errores.push(`Elemento ${indice + 1}: falta el tipo (evaluacion o examen).`)
      return
    }

    const fechaCruda = buscar(objeto, [/^fecha/, /^date/])
    const fecha = normalizarFecha(fechaCruda)
    if (!fecha) {
      errores.push(`Elemento ${indice + 1}: fecha no válida («${fechaCruda}»).`)
      return
    }

    const titulo = buscar(objeto, [/^titulo/, /^title/, /^nombre/, /^descripcion/])
    if (!titulo) {
      errores.push(`Elemento ${indice + 1}: falta el título.`)
      return
    }

    const horaCruda = buscar(objeto, [/^hora/, /^time/])
    const hora = horaCruda ? (RE_HORA.test(horaCruda) ? horaCruda : null) : null
    if (horaCruda && !hora) {
      errores.push(`Elemento ${indice + 1}: hora no válida («${horaCruda}»).`)
      return
    }

    eventos.push({
      tipo,
      titulo,
      fecha,
      hora,
      avaluacion_id:
        buscar(objeto, [/^avaluacion/, /^evaluacion/, /^trimestre/]) || null,
      observaciones: buscar(objeto, [/^observacion/, /^notas?/, /^comentario/]) || null
    })
  })

  eventos.sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.hora ?? '').localeCompare(b.hora ?? ''))
  return { eventos, errores }
}
