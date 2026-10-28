/**
 * Curso académico derivado de la fecha.
 *
 * El curso empieza el 1 de septiembre y termina el 1 de julio. Para cualquier
 * fecha, el año de inicio es el septiembre inmediatamente anterior: de enero a
 * agosto se toma el año anterior; de septiembre a diciembre, el año en curso.
 */
export interface PeriodoAcademico {
  inicio: number
  fin: number
  nombre: string
}

export function cursoAcademicoActual(fecha = new Date()): PeriodoAcademico {
  const anio = fecha.getFullYear()
  const mes = fecha.getMonth() + 1
  const inicio = mes >= 9 ? anio : anio - 1
  const fin = inicio + 1
  return { inicio, fin, nombre: `${inicio}/${fin}` }
}

export function esCursoAcademicoActual(
  curso: { inicio: number; fin: number },
  fecha = new Date()
): boolean {
  const actual = cursoAcademicoActual(fecha)
  return curso.inicio === actual.inicio && curso.fin === actual.fin
}
