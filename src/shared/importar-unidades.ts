/**
 * Importación de unidades de programación.
 *
 * Acepta un array de unidades o `{ unidades: [...] }`. Cada unidad puede traer
 * sus sesiones; si no las trae, se crea solo la unidad y las sesiones se
 * asignan después desde la programación de aula.
 */
import type { CriterioUnidad, ProgramacionEntrada, UnidadProgramacionEntrada } from './tipos'

export interface ResultadoUnidadesImportadas {
  unidades: UnidadProgramacionEntrada[]
  errores: string[]
}

const RE_ISO = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/
const RE_DMA = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:[T\s].*)?$/

function fechaDesdePartes(anio: string, mes: string, dia: string): string | null {
  const a = Number(anio)
  const m = Number(mes)
  const d = Number(dia)
  if (!Number.isInteger(a) || !Number.isInteger(m) || !Number.isInteger(d)) return null
  const fecha = new Date(Date.UTC(a, m - 1, d))
  if (fecha.getUTCFullYear() !== a || fecha.getUTCMonth() !== m - 1 || fecha.getUTCDate() !== d) {
    return null
  }
  return `${String(a).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function normalizarFecha(valor: string): string | null {
  const texto = valor.trim()
  const iso = RE_ISO.exec(texto)
  if (iso) return fechaDesdePartes(iso[1], iso[2], iso[3])
  const dma = RE_DMA.exec(texto)
  if (dma) return fechaDesdePartes(dma[3], dma[2], dma[1])
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

function listaCriterios(valor: unknown): CriterioUnidad[] {
  const resultado = new Map<string, CriterioUnidad>()
  const agregar = (raCodigo: string, ceCodigo: string): void => {
    const ra = raCodigo.trim().toUpperCase()
    const ce = ceCodigo.trim()
    if (!ra || !ce) return
    resultado.set(`${ra}|${ce}`, { raCodigo: ra, ceCodigo: ce })
  }
  const procesar = (item: unknown): void => {
    if (typeof item === 'string') {
      for (const trozo of item.split(/[;,]/)) {
        const coincidencia = /^([A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+)\s*[.:|]\s*(.+)$/.exec(trozo.trim())
        if (coincidencia) agregar(coincidencia[1], coincidencia[2])
      }
      return
    }
    if (!item || typeof item !== 'object') return
    const objeto = item as Record<string, unknown>
    const ra = texto(buscar(objeto, [/^racodigo/, /^ra$/, /^resultado/, /^resultadoaprendizaje/]))
    const ce = texto(buscar(objeto, [/^cecodigo/, /^ce$/, /^criterio/, /^criterioevaluacion/]))
    if (ra && ce) agregar(ra, ce)
  }
  if (Array.isArray(valor)) {
    valor.forEach(procesar)
  } else {
    procesar(valor)
  }
  return [...resultado.values()]
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
    if (sesionesCrudas !== undefined && sesionesCrudas !== null) {
      if (!Array.isArray(sesionesCrudas)) {
        errores.push(`Unidad ${indice + 1}: «sesiones» debe ser un array.`)
        return
      }
      sesionesCrudas.forEach((sesion, i) => {
        const normalizada = normalizarSesion(sesion, i, errores)
        if (normalizada) sesiones.push(normalizada)
      })
    }

    const pesoCrudo = Number(buscar(objeto, [/^peso/, /^weight/]))
    const peso = Number.isFinite(pesoCrudo) ? Math.min(100, Math.max(0, pesoCrudo)) : 0

    unidades.push({
      codigo: texto(buscar(objeto, [/^codigo/, /^code/])) || null,
      nombre,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      peso,
      contenidos: texto(buscar(objeto, [/^contenidos?/, /^contents?/])),
      observaciones: texto(buscar(objeto, [/^observacion/, /^notas?/])) || null,
      criterios: listaCriterios(buscar(objeto, [/^criterios/, /^ces?$/, /^criteriosevaluacion/])),
      ra_codigos: listaRas(buscar(objeto, [/^racodigos/, /^ras?/, /^resultados/])),
      sesiones
    })
  })

  return { unidades, errores }
}
