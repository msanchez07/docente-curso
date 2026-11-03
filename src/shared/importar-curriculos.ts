/**
 * Importación de currículos completos (ciclo → módulos → RA → CE).
 *
 * Acepta un ciclo, un array de ciclos o `{ ciclos: [...] }`. La validación es
 * estricta con la estructura y tolerante con los campos opcionales: si faltan
 * `codigo` o `numero` en un RA/CE, se generan por orden para facilitar la
 * preparación manual de datos.
 */
import { z } from 'zod'
import type { Ciclo, CriterioEvaluacion, Modulo, ResultadoAprendizaje } from './tipos'

export interface ResultadoCurriculosParseados {
  ciclos: Ciclo[]
  errores: string[]
}

export interface ResumenCurriculos {
  modulos: number
  ra: number
  ce: number
}

const RE_RA = /^RA\s*(\d+)$/i

function preprocesarCodigo(valor: unknown): unknown {
  if (typeof valor === 'number') return String(valor)
  return valor
}

const codigoObligatorio = z.preprocess(
  preprocesarCodigo,
  z.string().trim().min(1, 'El código es obligatorio').max(80)
)

const codigoOpcional = z.preprocess(
  (valor) =>
    valor === '' || valor === null || valor === undefined ? null : preprocesarCodigo(valor),
  z.string().trim().min(1, 'El código no puede estar vacío').max(80).nullable()
)

const textoObligatorio = z.string().trim().min(1, 'Este texto es obligatorio').max(10000)

const numeroOpcional = z.preprocess(
  (valor) => (valor === '' || valor === null || valor === undefined ? null : valor),
  z.coerce.number().int().nonnegative().nullable()
)

const numeroRa = z.preprocess(
  (valor) => (valor === '' || valor === null || valor === undefined ? null : valor),
  z.coerce.number().int().positive().nullable()
)

const cursoOpcional = z.preprocess(
  (valor) => (valor === '' || valor === null || valor === undefined ? null : String(valor)),
  z.enum(['1', '2']).nullable()
)

const esquemaCe = z.object({
  codigo: codigoOpcional,
  descripcion: textoObligatorio
})

const esquemaRa = z.object({
  codigo: codigoOpcional,
  numero: numeroRa,
  descripcion: textoObligatorio,
  ce: z.array(esquemaCe).default([])
})

const esquemaModulo = z.object({
  codigo: codigoObligatorio,
  nombre: textoObligatorio,
  siglas: z.string().trim().max(20).nullable().default(null),
  curso: cursoOpcional,
  ects: numeroOpcional,
  horas_minimas_boe: numeroOpcional,
  ra: z.array(esquemaRa).default([])
})

const esquemaCiclo = z.object({
  id: z.string().trim().min(1, 'El id es obligatorio').max(120),
  denominacion: textoObligatorio,
  nivel: z.string().trim().max(160).default(''),
  familia_profesional: z.string().trim().max(160).default(''),
  duracion_horas: numeroOpcional,
  ects: numeroOpcional,
  abreviatura: z.string().trim().max(20).nullable().default(null),
  rd: z.string().trim().max(2000).default(''),
  rd_actualizacion: z.string().trim().max(2000).default(''),
  boe_url: z.string().trim().max(1000).default(''),
  boe_url_actualizacion: z.string().trim().max(1000).default(''),
  modulos: z.array(esquemaModulo).min(1, 'El ciclo debe tener al menos un módulo')
})

type CicloValidado = z.infer<typeof esquemaCiclo>
type ModuloValidado = z.infer<typeof esquemaModulo>
type RaValidado = z.infer<typeof esquemaRa>
type CeValidado = z.infer<typeof esquemaCe>

function letraCe(indice: number): string {
  let numero = indice
  let salida = ''
  do {
    salida = String.fromCharCode(97 + (numero % 26)) + salida
    numero = Math.floor(numero / 26) - 1
  } while (numero >= 0)
  return salida
}

function erroresZod(error: z.ZodError, etiqueta: string): string[] {
  return error.issues.map((issue) => {
    const ruta = issue.path.length > 0 ? ` (${issue.path.join('.')})` : ''
    return `${etiqueta}${ruta}: ${issue.message}`
  })
}

function normalizarCe(
  ce: CeValidado,
  indice: number,
  etiqueta: string,
  errores: string[]
): CriterioEvaluacion | null {
  const codigo = (ce.codigo ?? letraCe(indice)).trim()
  if (!codigo) {
    errores.push(`${etiqueta}: el CE ${indice + 1} no tiene código.`)
    return null
  }
  return { codigo, descripcion: ce.descripcion }
}

function normalizarRa(
  ra: RaValidado,
  indice: number,
  etiqueta: string,
  errores: string[],
  codigos: Set<string>
): ResultadoAprendizaje | null {
  const codigoInformado = (ra.codigo ?? '').trim().toUpperCase()
  const numero = ra.numero ?? Number(RE_RA.exec(codigoInformado)?.[1] ?? indice + 1)
  const codigo = codigoInformado || `RA${numero}`
  if (codigos.has(codigo)) {
    errores.push(`${etiqueta}: el RA «${codigo}» está repetido.`)
    return null
  }
  codigos.add(codigo)

  const ce: CriterioEvaluacion[] = []
  const codigosCe = new Set<string>()
  for (const [i, criterio] of ra.ce.entries()) {
    const normalizado = normalizarCe(criterio, i, `${etiqueta} · ${codigo}`, errores)
    if (!normalizado) continue
    if (codigosCe.has(normalizado.codigo)) {
      errores.push(`${etiqueta} · ${codigo}: el CE «${normalizado.codigo}» está repetido.`)
      continue
    }
    codigosCe.add(normalizado.codigo)
    ce.push(normalizado)
  }

  return {
    codigo,
    numero,
    descripcion: ra.descripcion,
    ce
  }
}

function normalizarModulo(
  modulo: ModuloValidado,
  etiqueta: string,
  errores: string[],
  codigos: Set<string>
): Modulo | null {
  const codigo = modulo.codigo.trim()
  if (codigos.has(codigo)) {
    errores.push(`${etiqueta}: el módulo «${codigo}» está repetido.`)
    return null
  }
  codigos.add(codigo)

  const ra: ResultadoAprendizaje[] = []
  const codigosRa = new Set<string>()
  for (const [i, resultado] of modulo.ra.entries()) {
    const normalizado = normalizarRa(resultado, i, `${etiqueta} · ${codigo}`, errores, codigosRa)
    if (normalizado) ra.push(normalizado)
  }

  return {
    codigo,
    nombre: modulo.nombre,
    siglas: modulo.siglas ?? undefined,
    curso: modulo.curso ?? undefined,
    ects: modulo.ects,
    horas_minimas_boe: modulo.horas_minimas_boe,
    ra
  }
}

function normalizarCiclo(
  ciclo: CicloValidado,
  indice: number,
  errores: string[],
  ids: Set<string>
): Ciclo | null {
  const etiqueta = `Ciclo ${indice + 1} (${ciclo.id || 'sin id'})`
  if (ids.has(ciclo.id)) {
    errores.push(`${etiqueta}: el id «${ciclo.id}» está repetido.`)
    return null
  }
  ids.add(ciclo.id)

  const modulos: Modulo[] = []
  const codigosModulo = new Set<string>()
  for (const [i, modulo] of ciclo.modulos.entries()) {
    const normalizado = normalizarModulo(
      modulo,
      `${etiqueta} · módulo ${i + 1}`,
      errores,
      codigosModulo
    )
    if (normalizado) modulos.push(normalizado)
  }

  return {
    id: ciclo.id,
    denominacion: ciclo.denominacion,
    nivel: ciclo.nivel,
    familia_profesional: ciclo.familia_profesional,
    duracion_horas: ciclo.duracion_horas ?? 0,
    ects: ciclo.ects ?? 0,
    abreviatura: ciclo.abreviatura?.trim() || undefined,
    rd: ciclo.rd,
    rd_actualizacion: ciclo.rd_actualizacion || undefined,
    boe_url: ciclo.boe_url,
    boe_url_actualizacion: ciclo.boe_url_actualizacion || undefined,
    modulos
  }
}

/** Extrae la lista de ciclos del JSON, admitiendo objeto único, array o { ciclos }. */
function extraerLista(datos: unknown): unknown[] | null {
  if (Array.isArray(datos)) return datos
  if (datos === null || typeof datos !== 'object') return null
  const objeto = datos as Record<string, unknown>
  if (Array.isArray(objeto.ciclos)) return objeto.ciclos
  if ('modulos' in objeto) return [datos]
  return null
}

export function parsearCurriculos(textoImportado: string): ResultadoCurriculosParseados {
  const limpio = textoImportado.trim()
  if (!limpio) return { ciclos: [], errores: ['El contenido está vacío.'] }

  let datos: unknown
  try {
    datos = JSON.parse(limpio)
  } catch {
    return { ciclos: [], errores: ['El contenido no es JSON válido.'] }
  }

  const lista = extraerLista(datos)
  if (!lista) {
    return {
      ciclos: [],
      errores: ['Se esperaba un ciclo, un array de ciclos o { "ciclos": [...] }.']
    }
  }
  if (lista.length === 0) return { ciclos: [], errores: ['No hay ningún ciclo en el JSON.'] }

  const ciclos: Ciclo[] = []
  const errores: string[] = []
  const ids = new Set<string>()

  lista.forEach((elemento, indice) => {
    const validado = esquemaCiclo.safeParse(elemento)
    if (!validado.success) {
      errores.push(...erroresZod(validado.error, `Ciclo ${indice + 1}`))
      return
    }
    const ciclo = normalizarCiclo(validado.data, indice, errores, ids)
    if (ciclo) ciclos.push(ciclo)
  })

  if (errores.length > 0) return { ciclos: [], errores }
  return { ciclos, errores: [] }
}

export function resumirCurriculos(ciclos: Ciclo[]): ResumenCurriculos {
  let modulos = 0
  let ra = 0
  let ce = 0
  for (const ciclo of ciclos) {
    modulos += ciclo.modulos.length
    for (const modulo of ciclo.modulos) {
      ra += modulo.ra.length
      for (const resultado of modulo.ra) ce += resultado.ce.length
    }
  }
  return { modulos, ra, ce }
}
