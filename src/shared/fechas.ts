/** Utilidades de fechas compartidas por las vistas. */

/** `true` si la fecha ISO cae en sábado o domingo. */
export function esFinDeSemana(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false
  const dia = new Date(`${fecha}T00:00:00`).getDay()
  return dia === 0 || dia === 6
}

/** Fecha de hoy en ISO local (evita el desfase de `toISOString` en UTC). */
export function hoyLocal(): string {
  const ahora = new Date()
  const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}
