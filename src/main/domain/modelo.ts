/**
 * Criterios de calificación (modelo de evaluación): normalización y validación.
 *
 * La nota se calcula así:
 *
 *     nota de categoría  = media simple de las entregas de esa categoría
 *     nota de avaluación = Σ (peso de categoría × media de categoría)
 *     nota final         = Σ (peso de avaluación × nota de avaluación)
 *
 * Los valores por defecto viven en `@shared/modelo` para poder usarlos también
 * en la previsualización web.
 */
import type { ModeloEvaluacion, RequisitoEvaluacion } from '@shared/tipos'
import {
  CONVOCATORIAS_POR_DEFECTO,
  MODELO_PRESENCIAL,
  MODELO_SEMIPRESENCIAL,
  REQUISITOS_POR_DEFECTO,
  modeloPorDefecto
} from '@shared/modelo'
import { REQUISITOS_CONOCIDOS } from '@shared/tipos'

/**
 * Requisitos que el motor de evaluación entiende por su `id` (véase
 * `REQUISITOS_CONOCIDOS`). Los que se añadan de más se guardan y salen en el
 * informe, pero no alteran el cálculo.
 */
export {
  REQUISITOS_CONOCIDOS,
  REQUISITOS_POR_DEFECTO,
  MODELO_PRESENCIAL,
  MODELO_SEMIPRESENCIAL,
  modeloPorDefecto
}

/** Valor de un requisito conocido, con respaldo si el modelo no lo incluye. */
export function valorRequisito(modelo: ModeloEvaluacion, id: string, porDefecto: number): number {
  const requisito = modelo.requisitos?.find((r) => r.id === id)
  const valor = Number(requisito?.valor)
  return Number.isFinite(valor) ? valor : porDefecto
}

/** Convierte el formato antiguo de requisitos (objeto) al de lista. */
function convertirRequisitosAntiguos(objeto: Record<string, number>): RequisitoEvaluacion[] {
  return REQUISITOS_POR_DEFECTO.map((requisito) => ({
    ...requisito,
    valor: Number(objeto[requisito.id] ?? requisito.valor)
  }))
}

/**
 * Normaliza un modelo leído de la base de datos: admite tanto el formato
 * actual (requisitos como lista) como el anterior (objeto), para no perder la
 * configuración ya hecha. Completa las convocatorias si faltan.
 */
export function normalizarModelo(bruto: unknown): ModeloEvaluacion | null {
  if (!bruto || typeof bruto !== 'object') return null
  const modelo = bruto as Record<string, unknown>

  const requisitos = Array.isArray(modelo.requisitos)
    ? (modelo.requisitos as RequisitoEvaluacion[])
    : convertirRequisitosAntiguos((modelo.requisitos ?? {}) as Record<string, number>)

  const convocatorias =
    modelo.convocatorias && typeof modelo.convocatorias === 'object'
      ? { ...CONVOCATORIAS_POR_DEFECTO, ...(modelo.convocatorias as object) }
      : CONVOCATORIAS_POR_DEFECTO

  return {
    categorias: (modelo.categorias as ModeloEvaluacion['categorias']) ?? [],
    avaluaciones: (modelo.avaluaciones as ModeloEvaluacion['avaluaciones']) ?? [],
    requisitos,
    modoCalificacion: 'unidades',
    pesosRa:
      modelo.pesosRa && typeof modelo.pesosRa === 'object'
        ? (modelo.pesosRa as Record<string, number>)
        : {},
    convocatorias: convocatorias as ModeloEvaluacion['convocatorias']
  }
}

export interface ValidacionModelo {
  ok: boolean
  sumaCategorias: number
  sumaAvaluaciones: number
  errores: string[]
}

const TOLERANCIA = 1e-9

/** Redondea a dos decimales para comparar pesos sin arrastrar error flotante. */
function redondear2(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100
}

function sumanCien(suma: number): boolean {
  return Math.abs(redondear2(suma) - 100) < TOLERANCIA
}

/** Comprueba que el modelo es coherente (pesos que suman 100, sin duplicados…). */
export function validarModelo(modelo: ModeloEvaluacion): ValidacionModelo {
  const errores: string[] = []
  const sumaCategorias = modelo.categorias.reduce((t, c) => t + (Number(c.peso) || 0), 0)
  const sumaAvaluaciones = modelo.avaluaciones.reduce((t, a) => t + (Number(a.peso) || 0), 0)

  if (modelo.categorias.length === 0) errores.push('Debe haber al menos una categoría.')
  if (modelo.avaluaciones.length === 0) errores.push('Debe haber al menos una avaluación.')
  if (modelo.categorias.length > 0 && !sumanCien(sumaCategorias)) {
    errores.push(
      `Los pesos de las categorías suman ${redondear2(sumaCategorias).toFixed(2)} %; deben sumar exactamente 100 %.`
    )
  }
  if (modelo.avaluaciones.length > 0 && !sumanCien(sumaAvaluaciones)) {
    errores.push(
      `Los pesos de las avaluaciones suman ${redondear2(sumaAvaluaciones).toFixed(2)} %; deben sumar exactamente 100 %.`
    )
  }
  if (new Set(modelo.categorias.map((c) => c.id)).size !== modelo.categorias.length) {
    errores.push('Hay categorías repetidas.')
  }
  if (new Set(modelo.avaluaciones.map((a) => a.id)).size !== modelo.avaluaciones.length) {
    errores.push('Hay avaluaciones repetidas.')
  }

  const idsCategorias = new Set(modelo.categorias.map((c) => c.id))
  for (const avaluacion of modelo.avaluaciones) {
    const pesos = avaluacion.pesosCategorias
    if (!pesos || Object.keys(pesos).length === 0) continue
    const desconocidas = Object.keys(pesos).filter((id) => !idsCategorias.has(id))
    if (desconocidas.length > 0) {
      errores.push(
        `La avaluación «${avaluacion.nombre}» tiene categorías desconocidas: ${desconocidas.join(', ')}.`
      )
    }
    if (Object.values(pesos).some((peso) => Number(peso) < 0)) {
      errores.push(`La avaluación «${avaluacion.nombre}» tiene pesos negativos.`)
    }
    const suma = Object.values(pesos).reduce((total, peso) => total + (Number(peso) || 0), 0)
    if (!sumanCien(suma)) {
      errores.push(
        `Los pesos de la avaluación «${avaluacion.nombre}» suman ${redondear2(suma).toFixed(2)} %; deben sumar exactamente 100 %.`
      )
    }
  }

  return { ok: errores.length === 0, sumaCategorias, sumaAvaluaciones, errores }
}
