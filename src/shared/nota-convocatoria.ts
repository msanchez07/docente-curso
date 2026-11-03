import type { AsignacionConvocatoria, BloqueConvocatoria } from './tipos'

/**
 * Calcula la nota de una convocatoria para un alumno.
 *
 * Si está marcado el bloque global, su nota sustituye al resto. Si no, se
 * ponderan los bloques marcados con nota por su peso.
 */
export function notaConvocatoriaAlumno(
  alumnoId: number,
  bloques: BloqueConvocatoria[],
  asignaciones: AsignacionConvocatoria[]
): number | null {
  const esGlobal = (bloque: BloqueConvocatoria): boolean =>
    !bloque.avaluacion_id && !bloque.unidad_id && !bloque.ra_codigo
  const asignacion = (bloqueId: number): AsignacionConvocatoria | undefined =>
    asignaciones.find((item) => item.alumno_id === alumnoId && item.bloque_id === bloqueId)

  const global = bloques.find(esGlobal)
  const filaGlobal = global ? asignacion(global.id) : undefined
  if (filaGlobal?.incluida && filaGlobal.nota !== null && filaGlobal.nota !== undefined) {
    return Number(filaGlobal.nota)
  }

  const conNota = bloques
    .filter((bloque) => !esGlobal(bloque))
    .map((bloque) => {
      const fila = asignacion(bloque.id)
      if (!fila?.incluida || fila.nota === null || fila.nota === undefined) return null
      return { peso: Number(bloque.peso) || 0, valor: Number(fila.nota) }
    })
    .filter((item): item is { peso: number; valor: number } => item !== null)
  const peso = conNota.reduce((total, item) => total + item.peso, 0)
  if (peso === 0) return null
  const suma = conNota.reduce((total, item) => total + item.peso * item.valor, 0)
  return Math.round((suma / peso + Number.EPSILON) * 100) / 100
}
