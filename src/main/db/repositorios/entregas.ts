/**
 * Repositorio de entregas y de su mapeo a los criterios de evaluación (CE).
 */
import type { CriterioDeEntrega, CriterioDisponible, Entrega, EntregaEntrada } from '@shared/tipos'
import { EsquemaEntrega, normalizarOpcional } from '../../domain/esquemas'
import type { Bd } from '../conexion'

const CAMPOS = `e.id, e.modulo_codigo, e.titulo, e.descripcion, e.origen, e.tipo,
                e.fecha_limite, e.peso, e.avaluacion, e.categoria,
                (SELECT COUNT(*) FROM entrega_ce ec WHERE ec.entrega_id = e.id) AS criterios`

export function listarEntregas(db: Bd, moduloCodigo: string): Entrega[] {
  return db
    .prepare(`SELECT ${CAMPOS} FROM entregas e WHERE e.modulo_codigo = ? ORDER BY e.creada_en, e.id`)
    .all(moduloCodigo) as Entrega[]
}

export function obtenerEntrega(db: Bd, id: number): Entrega | null {
  return (db.prepare(`SELECT ${CAMPOS} FROM entregas e WHERE e.id = ?`).get(id) as Entrega) ?? null
}

export function crearEntrega(db: Bd, entrada: EntregaEntrada): Entrega {
  const datos = EsquemaEntrega.parse({
    modulo_codigo: entrada.modulo_codigo,
    titulo: entrada.titulo,
    descripcion: normalizarOpcional(entrada.descripcion ?? null),
    origen: normalizarOpcional(entrada.origen ?? null),
    tipo: entrada.tipo ?? 'tarea',
    fecha_limite: normalizarOpcional(entrada.fecha_limite ?? null),
    peso: entrada.peso,
    avaluacion: normalizarOpcional(entrada.avaluacion ?? null),
    categoria: normalizarOpcional(entrada.categoria ?? null)
  })
  const resultado = db
    .prepare(
      `INSERT INTO entregas (modulo_codigo, titulo, descripcion, origen, tipo, fecha_limite, peso,
                             avaluacion, categoria)
       VALUES (@modulo_codigo, @titulo, @descripcion, @origen, @tipo, @fecha_limite, @peso,
               @avaluacion, @categoria)`
    )
    .run({ ...datos, peso: datos.peso ?? 1 })
  return obtenerEntrega(db, Number(resultado.lastInsertRowid))!
}

export function borrarEntrega(db: Bd, id: number): boolean {
  return db.prepare('DELETE FROM entregas WHERE id = ?').run(id).changes > 0
}

export function actualizarEntrega(db: Bd, id: number, entrada: EntregaEntrada): Entrega | null {
  if (!obtenerEntrega(db, id)) return null
  const datos = EsquemaEntrega.parse({
    modulo_codigo: entrada.modulo_codigo,
    titulo: entrada.titulo,
    descripcion: normalizarOpcional(entrada.descripcion ?? null),
    origen: normalizarOpcional(entrada.origen ?? null),
    tipo: entrada.tipo ?? 'tarea',
    fecha_limite: normalizarOpcional(entrada.fecha_limite ?? null),
    peso: entrada.peso,
    avaluacion: normalizarOpcional(entrada.avaluacion ?? null),
    categoria: normalizarOpcional(entrada.categoria ?? null)
  })
  db.prepare(
    `UPDATE entregas
        SET modulo_codigo = @modulo_codigo, titulo = @titulo, descripcion = @descripcion,
            origen = @origen, tipo = @tipo, fecha_limite = @fecha_limite, peso = @peso,
            avaluacion = @avaluacion, categoria = @categoria
      WHERE id = @id`
  ).run({ ...datos, peso: datos.peso ?? 1, id })
  return obtenerEntrega(db, id)
}

/** Sustituye el mapeo de una entrega a criterios de evaluación. */
export function mapearCriterios(
  db: Bd,
  entregaId: number,
  ceIds: number[],
  pesos: Record<number, number> = {}
): void {
  const borrar = db.prepare('DELETE FROM entrega_ce WHERE entrega_id = ?')
  const insertar = db.prepare('INSERT INTO entrega_ce (entrega_id, ce_id, peso) VALUES (?, ?, ?)')
  db.transaction(() => {
    borrar.run(entregaId)
    for (const ceId of ceIds) insertar.run(entregaId, ceId, pesos[ceId] ?? 1)
  })()
}

export function listarCriteriosDeEntrega(db: Bd, entregaId: number): CriterioDeEntrega[] {
  return db
    .prepare(
      `SELECT ce.id AS ceId, ce.codigo AS ceCodigo, r.codigo AS raCodigo,
              r.descripcion AS raDescripcion, ce.descripcion, ec.peso
         FROM entrega_ce ec
         JOIN criterios_evaluacion ce ON ce.id = ec.ce_id
         JOIN resultados_aprendizaje r ON r.id = ce.ra_id
        WHERE ec.entrega_id = ?
        ORDER BY r.numero, ce.codigo`
    )
    .all(entregaId) as CriterioDeEntrega[]
}

/** Todos los CE de un módulo, para el selector de mapeo. */
export function criteriosDisponibles(db: Bd, moduloCodigo: string): CriterioDisponible[] {
  return db
    .prepare(
      `SELECT ce.id AS ceId, ce.codigo AS ceCodigo, r.codigo AS raCodigo,
              r.descripcion AS raDescripcion, ce.descripcion
         FROM criterios_evaluacion ce
         JOIN resultados_aprendizaje r ON r.id = ce.ra_id
        WHERE r.modulo_codigo = ?
        ORDER BY r.numero, ce.codigo`
    )
    .all(moduloCodigo) as CriterioDisponible[]
}
