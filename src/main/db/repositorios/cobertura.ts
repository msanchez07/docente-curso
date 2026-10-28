/**
 * Cobertura del BOE: qué entregas cubren cada criterio de evaluación.
 */
import type { CoberturaCe, CoberturaRa } from '@shared/tipos'
import type { Bd } from '../conexion'

export function coberturaModulo(db: Bd, moduloCodigo: string): CoberturaRa[] {
  const ras = db
    .prepare(
      `SELECT id, codigo, descripcion, peso FROM resultados_aprendizaje
        WHERE modulo_codigo = ? ORDER BY numero`
    )
    .all(moduloCodigo) as { id: number; codigo: string; descripcion: string; peso: number }[]

  const ces = db
    .prepare(
      `SELECT ce.id, ce.codigo, ce.descripcion, ce.ra_id
         FROM criterios_evaluacion ce
         JOIN resultados_aprendizaje r ON r.id = ce.ra_id
        WHERE r.modulo_codigo = ?
        ORDER BY ce.codigo`
    )
    .all(moduloCodigo) as { id: number; codigo: string; descripcion: string; ra_id: number }[]

  const mapas = db
    .prepare(
      `SELECT ec.ce_id AS ceId, e.id AS entregaId, e.titulo AS titulo
         FROM entrega_ce ec
         JOIN entregas e ON e.id = ec.entrega_id
        WHERE e.modulo_codigo = ?
        ORDER BY e.titulo`
    )
    .all(moduloCodigo) as { ceId: number; entregaId: number; titulo: string }[]

  const porCe = new Map<number, { id: number; titulo: string }[]>()
  for (const m of mapas) {
    const lista = porCe.get(m.ceId) ?? []
    lista.push({ id: m.entregaId, titulo: m.titulo })
    porCe.set(m.ceId, lista)
  }

  return ras.map((ra) => {
    const ce: CoberturaCe[] = ces
      .filter((c) => c.ra_id === ra.id)
      .map((c) => ({
        ceId: c.id,
        ceCodigo: c.codigo,
        descripcion: c.descripcion,
        entregas: porCe.get(c.id) ?? []
      }))
    return {
      raCodigo: ra.codigo,
      raDescripcion: ra.descripcion,
      peso: ra.peso,
      ce,
      ceSinCubrir: ce.filter((c) => c.entregas.length === 0).length
    }
  })
}
