/** Utilidades de fechas compartidas por las vistas. */

/** `true` si la fecha ISO cae en sábado o domingo. */
export function esFinDeSemana(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false
  const dia = new Date(`${fecha}T00:00:00`).getDay()
  return dia === 0 || dia === 6
}
