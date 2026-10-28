/**
 * Curso académico a partir de la fecha actual (de septiembre a agosto).
 * Así no hace falta configurarlo a mano y cada curso se recalcula solo.
 */
export function cursoAcademico(fecha: Date = new Date()): string {
  const anio = fecha.getFullYear()
  const mes = fecha.getMonth() + 1
  const inicio = mes >= 8 ? anio : anio - 1
  return `${inicio}-${inicio + 1}`
}
