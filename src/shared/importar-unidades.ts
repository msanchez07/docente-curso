/**
 * Importación de unidades de programación.
 *
 * Acepta un array de unidades o `{ unidades: [...] }`. Cada unidad puede traer
 * sus sesiones; si no las trae, se crea solo la unidad y las sesiones se
 * asignan después desde la programación de aula.
 */
import type { ProgramacionEntrada, UnidadProgramacionEntrada } from './tipos'

export interface ResultadoUnidadesImportadas {
  unidades: UnidadProgramacionEntrada[]
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

function buscar(objeto: Record<string, unknown>, patrones: RegExp[]): unknown {
  for (const [clave, valor] of Object.entries(objeto)) {
    if (!patrones.some((patron) => patron.test(normalizarClave(clave)))) continue
    if (valor === null || valor === undefined) continue
    if (typeof valor === 'string' && !valor.trim()) continue
    return valor
  }
  return undefined
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : ''
}

function listaRas(valor: unknown): string[] {
  if (Array.isArray(valor)) {
    return [...new Set(valor.map((item) => texto(item)).filter(Boolean))]
  }
  const cadena = texto(valor)
  if (!cadena) return []
  return [
    ...new Set(
      cadena
        .split(/[,;|]/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ]
}

function normalizarSesion(
  elemento: unknown,
  indice: number,
  errores: string[]
): ProgramacionEntrada | null {
  if (elemento === null || typeof elemento !== 'object') {
    errores.push(`Sesión ${indice + 1}: debe ser un objeto.`)
    return null
  }
  const objeto = elemento as Record<string, unknown>
  const fechaCruda = texto(buscar(objeto, [/^fecha/, /^date/]))
  const fecha = normalizarFecha(fechaCruda)
  if (!fecha) {
    errores.push(`Sesión ${indice + 1}: fecha no válida («${fechaCruda}»).`)
    return null
  }
  return {
    fecha,
    contenido: texto(buscar(objeto, [/^contenido/, /^actividad/, /^descripcion/])),
    desviacion: texto(buscar(objeto, [/^desviacion/])),
    observaciones: texto(buscar(objeto, [/^observacion/, /^notas?/]))
  }
}

export function parsearUnidadesProgramacion(textoImportado: string): ResultadoUnidadesImportadas {
  const limpio = textoImportado.trim()
  if (!limpio) return { unidades: [], errores: ['El contenido está vacío.'] }

  let datos: unknown
  try {
    datos = JSON.parse(limpio)
  } catch {
    return { unidades: [], errores: ['El contenido no es JSON válido.'] }
  }

  const lista = Array.isArray(datos)
    ? datos
    : datos !== null &&
        typeof datos === 'object' &&
        Array.isArray((datos as Record<string, unknown>).unidades)
      ? ((datos as Record<string, unknown>).unidades as unknown[])
      : null

  if (!lista) {
    return { unidades: [], errores: ['Se esperaba un array o { unidades: [...] }.'] }
  }

  const unidades: UnidadProgramacionEntrada[] = []
  const errores: string[] = []

  lista.forEach((elemento, indice) => {
    if (elemento === null || typeof elemento !== 'object') {
      errores.push(`Unidad ${indice + 1}: debe ser un objeto.`)
      return
    }
    const objeto = elemento as Record<string, unknown>
    const nombre = texto(buscar(objeto, [/^nombre/, /^titulo/, /^title/]))
    if (!nombre) {
      errores.push(`Unidad ${indice + 1}: falta el nombre.`)
      return
    }

    const inicioCrudo = texto(buscar(objeto, [/^fechainicio/, /^inicio/, /^fechadesde/]))
    const finCrudo = texto(buscar(objeto, [/^fechafin/, /^fin/, /^fechahasta/]))
    const fechaInicio = inicioCrudo ? normalizarFecha(inicioCrudo) : null
    const fechaFin = finCrudo ? normalizarFecha(finCrudo) : null
    if (inicioCrudo && !fechaInicio) {
      errores.push(`Unidad ${indice + 1}: fecha de inicio no válida («${inicioCrudo}»).`)
      return
    }
    if (finCrudo && !fechaFin) {
      errores.push(`Unidad ${indice + 1}: fecha de fin no válida («${finCrudo}»).`)
      return
    }
    if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
      errores.push(`Unidad ${indice + 1}: la fecha de inicio es posterior a la de fin.`)
      return
    }

    const sesionesCrudas = buscar(objeto, [/^sesiones/, /^dias/])
    const sesiones: ProgramacionEntrada[] = []
    if (sesionesCrudas !== undefined) {
      if (!Array.isArray(sesionesCrudas)) {
        errores.push(`Unidad ${indice + 1}: «sesiones» debe ser un array.`)
        return
      }
      sesionesCrudas.forEach((sesion, i) => {
        const normalizada = normalizarSesion(sesion, i, errores)
        if (normalizada) sesiones.push(normalizada)
      })
    }

    unidades.push({
      codigo: texto(buscar(objeto, [/^codigo/, /^code/])) || null,
      nombre,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      contenidos: texto(buscar(objeto, [/^contenidos?/, /^contents?/])),
      observaciones: texto(buscar(objeto, [/^observacion/, /^notas?/])) || null,
      ra_codigos: listaRas(buscar(objeto, [/^racodigos/, /^ras?/, /^resultados/])),
      sesiones
    })
  })

  return { unidades, errores }
}
