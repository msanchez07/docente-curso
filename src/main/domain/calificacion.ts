/**
 * Motor de calificación.
 *
 * Funciones puras (sin acceso a datos ni a Electron) para poder probarlas de
 * forma aislada. La cadena de cálculo es:
 *
 *     nota de entrega (media ponderada de CE)
 *         → nota de RA (media ponderada de entregas mapeadas al RA)
 *             → nota final del módulo (media ponderada de RA)
 *
 * Convenio: un criterio o una entrega **sin corregir** cuenta como 0 en la
 * media, pero el resultado se marca como `incompleta` para que la interfaz
 * avise. Los elementos con peso 0 se ignoran por completo.
 */
import type {
  NotaCriterio,
  NotaEntregaPonderada,
  NotaRaPonderada,
  ResultadoEntrega,
  ResultadoNotaFinal
} from '@shared/tipos'

/** Escala de calificación por defecto (0–10). */
export const ESCALA_MAXIMA = 10

/** Umbral de aprobado por defecto. */
export const UMBRAL_APROBADO = 5

/** Tolerancia al comparar sumas de pesos (en puntos porcentuales). */
export const TOLERANCIA_PESOS = 0.5

export function redondear(valor: number, decimales = 2): number {
  const factor = 10 ** decimales
  return Math.round((valor + Number.EPSILON) * factor) / factor
}

/**
 * Media ponderada. Devuelve `null` cuando no hay ningún elemento con peso
 * positivo (no hay nada que promediar).
 */
function mediaPonderada(items: { peso: number; valor: number }[]): number | null {
  const validos = items.filter((i) => i.peso > 0)
  if (validos.length === 0) return null
  const sumaPesos = validos.reduce((total, i) => total + i.peso, 0)
  if (sumaPesos <= 0) return null
  const suma = validos.reduce((total, i) => total + i.peso * i.valor, 0)
  return redondear(suma / sumaPesos)
}

/** Nota de una entrega a partir de las notas de sus criterios de evaluación. */
export function calcularNotaEntrega(criterios: NotaCriterio[]): ResultadoEntrega {
  const ceSinNota = criterios.filter((c) => c.nota === null).map((c) => c.ceId)
  const nota = mediaPonderada(criterios.map((c) => ({ peso: c.peso, valor: c.nota ?? 0 })))
  return { nota, completa: ceSinNota.length === 0, ceSinNota }
}

/** Nota de un RA a partir de las notas de las entregas mapeadas a ese RA. */
export function calcularNotaRa(entregas: NotaEntregaPonderada[]): number | null {
  return mediaPonderada(entregas.map((e) => ({ peso: e.peso, valor: e.nota ?? 0 })))
}

/** Nota final del módulo a partir de las notas de sus RA. */
export function calcularNotaFinal(
  ras: NotaRaPonderada[],
  umbralAprobado: number = UMBRAL_APROBADO
): ResultadoNotaFinal {
  const avisos: string[] = []
  // Solo cuentan los RA con peso: los que no ponderan no pueden generar avisos.
  const relevantes = ras.filter((r) => r.peso > 0)
  const sinNota = relevantes.filter((r) => r.nota === null)
  const nota = mediaPonderada(ras.map((r) => ({ peso: r.peso, valor: r.nota ?? 0 })))

  if (relevantes.length > 0 && !pesosSumanCien(relevantes.map((r) => r.peso))) {
    const suma = redondear(relevantes.reduce((t, r) => t + r.peso, 0))
    avisos.push(`Los pesos de los RA suman ${suma} %, no 100 %.`)
  }
  if (sinNota.length > 0) {
    avisos.push(`Hay ${sinNota.length} RA sin nota; cuentan como 0.`)
  }

  return {
    nota,
    aprobado: nota !== null && nota >= umbralAprobado,
    incompleta: sinNota.length > 0,
    avisos
  }
}

/** Comprueba que una lista de pesos suma 100 (± tolerancia). */
export function pesosSumanCien(pesos: number[], tolerancia: number = TOLERANCIA_PESOS): boolean {
  const suma = pesos.reduce((total, p) => total + (p > 0 ? p : 0), 0)
  return Math.abs(suma - 100) <= tolerancia
}

/** Detalle de la suma de pesos, para avisar en la interfaz. */
export function validarPesos(
  pesos: number[],
  objetivo = 100,
  tolerancia: number = TOLERANCIA_PESOS
): { ok: boolean; suma: number; desviacion: number } {
  const suma = redondear(pesos.reduce((total, p) => total + (p > 0 ? p : 0), 0))
  const desviacion = redondear(suma - objetivo)
  return { ok: Math.abs(desviacion) <= tolerancia, suma, desviacion }
}
