/**
 * Repositorio de notas: registro por criterio, cálculo por entrega y resumen
 * completo de un módulo (alumnos × entregas × RA × nota final).
 */
import type {
  CeldaNota,
  FilaCalificacion,
  Nota,
  NotaCriterio,
  NotaEntrada,
  NotaEntregaPonderada,
  NotaRaPonderada,
  ResumenCalificaciones,
  ResultadoEntrega
} from '@shared/tipos'
import { calcularNotaEntrega, calcularNotaFinal, calcularNotaRa } from '../../domain/calificacion'
import { EsquemaNota } from '../../domain/esquemas'
import type { Bd } from '../conexion'
import { listarAlumnosDeGrupo } from './alumnos'
import { listarCriteriosDeEntrega, listarEntregas } from './entregas'
import { obtenerGrupo } from './grupos'

/** Devuelve el id de la entrega de un alumno, creándola si no existe. */
export function asegurarEntregaAlumno(db: Bd, entregaId: number, alumnoId: number): number {
  const existente = db
    .prepare('SELECT id FROM entregas_alumno WHERE entrega_id = ? AND alumno_id = ?')
    .get(entregaId, alumnoId) as { id: number } | undefined
  if (existente) return existente.id

  const resultado = db
    .prepare('INSERT INTO entregas_alumno (entrega_id, alumno_id, estado) VALUES (?, ?, ?)')
    .run(entregaId, alumnoId, 'pendiente')
  return Number(resultado.lastInsertRowid)
}

export function notasDeEntregaAlumno(db: Bd, entregaAlumnoId: number): Nota[] {
  return db
    .prepare(
      `SELECT id, entrega_alumno_id, ce_id, nota, comentario
         FROM notas WHERE entrega_alumno_id = ? ORDER BY ce_id`
    )
    .all(entregaAlumnoId) as Nota[]
}

/** Registra (o actualiza) la nota de un criterio de una entrega de alumno. */
export function registrarNota(db: Bd, entrada: NotaEntrada): Nota {
  const datos = EsquemaNota.parse(entrada)

  db.prepare(
    `INSERT INTO notas (entrega_alumno_id, ce_id, nota, comentario)
     VALUES (@entrega_alumno_id, @ce_id, @nota, @comentario)
     ON CONFLICT(entrega_alumno_id, ce_id) DO UPDATE SET
       nota = excluded.nota,
       comentario = excluded.comentario`
  ).run({ ...datos, comentario: datos.comentario ?? null })

  return db
    .prepare(
      `SELECT id, entrega_alumno_id, ce_id, nota, comentario
         FROM notas WHERE entrega_alumno_id = ? AND ce_id = ?`
    )
    .get(datos.entrega_alumno_id, datos.ce_id) as Nota
}

/** Registra la nota de un CE conociendo la entrega y el alumno (uso desde la interfaz). */
export function registrarNotaDe(
  db: Bd,
  entregaId: number,
  alumnoId: number,
  ceId: number,
  nota: number,
  comentario?: string | null
): Nota {
  const entregaAlumnoId = asegurarEntregaAlumno(db, entregaId, alumnoId)
  return registrarNota(db, { entrega_alumno_id: entregaAlumnoId, ce_id: ceId, nota, comentario })
}

/** Notas registradas de un alumno en una entrega concreta. */
export function notasDe(
  db: Bd,
  entregaId: number,
  alumnoId: number
): { ceId: number; nota: number; comentario: string | null }[] {
  const fila = db
    .prepare('SELECT id FROM entregas_alumno WHERE entrega_id = ? AND alumno_id = ?')
    .get(entregaId, alumnoId) as { id: number } | undefined
  if (!fila) return []
  return db
    .prepare(
      `SELECT ce_id AS ceId, nota, comentario FROM notas
        WHERE entrega_alumno_id = ? ORDER BY ce_id`
    )
    .all(fila.id) as { ceId: number; nota: number; comentario: string | null }[]
}

/** Registra la nota directa de una entrega (manda sobre el detalle por CE). */
export function registrarNotaEntrega(
  db: Bd,
  entregaId: number,
  alumnoId: number,
  nota: number | null
): void {
  if (nota !== null && (Number.isNaN(nota) || nota < 0 || nota > 10)) {
    throw new Error('La nota debe estar entre 0 y 10.')
  }
  const entregaAlumnoId = asegurarEntregaAlumno(db, entregaId, alumnoId)
  db.prepare('UPDATE entregas_alumno SET nota = ?, estado = ? WHERE id = ?').run(
    nota,
    nota === null ? 'pendiente' : 'entregada',
    entregaAlumnoId
  )
}

/** Nota de una entrega para un alumno, cruzando el mapeo de CE con las notas. */
export function calcularEntregaAlumno(db: Bd, entregaId: number, alumnoId: number): ResultadoEntrega {
  const fila = db
    .prepare('SELECT id, nota FROM entregas_alumno WHERE entrega_id = ? AND alumno_id = ?')
    .get(entregaId, alumnoId) as { id: number; nota: number | null } | undefined

  // La nota directa de la entrega manda, si está puesta.
  if (fila && fila.nota !== null) {
    return { nota: fila.nota, completa: true, ceSinNota: [] }
  }

  const criterios = listarCriteriosDeEntrega(db, entregaId)
  const notas = fila ? notasDeEntregaAlumno(db, fila.id) : []
  const porCe = new Map(notas.map((n) => [n.ce_id, n.nota]))

  const entrada: NotaCriterio[] = criterios.map((c) => ({
    ceId: c.ceId,
    peso: c.peso,
    nota: porCe.get(c.ceId) ?? null
  }))

  return calcularNotaEntrega(entrada)
}

/**
 * Resumen por RA de un grupo: para cada alumno matriculado, la nota de cada
 * entrega, la de cada RA y la nota final (cálculo por RA, complementario al
 * modelo de evaluación).
 */
export function resumenModulo(db: Bd, grupoId: number): ResumenCalificaciones {
  const grupo = obtenerGrupo(db, grupoId)
  if (!grupo) throw new Error(`El grupo ${grupoId} no existe`)
  const moduloCodigo = grupo.modulo_codigo

  const modulo = db
    .prepare('SELECT codigo, nombre FROM modulos WHERE codigo = ?')
    .get(moduloCodigo) as { codigo: string; nombre: string } | undefined
  if (!modulo) throw new Error(`El módulo ${moduloCodigo} no existe`)

  const entregas = listarEntregas(db, moduloCodigo)
  const ras = db
    .prepare(
      `SELECT id, codigo, descripcion, peso FROM resultados_aprendizaje
        WHERE modulo_codigo = ? ORDER BY numero`
    )
    .all(moduloCodigo) as { id: number; codigo: string; descripcion: string; peso: number }[]

  const alumnos = listarAlumnosDeGrupo(db, grupoId)

  const criteriosPorEntrega = new Map<number, ReturnType<typeof listarCriteriosDeEntrega>>()
  for (const entrega of entregas) {
    criteriosPorEntrega.set(entrega.id, listarCriteriosDeEntrega(db, entrega.id))
  }

  const filas = db
    .prepare(
      `SELECT ea.entrega_id AS entregaId, ea.alumno_id AS alumnoId,
              n.ce_id AS ceId, n.nota AS nota
         FROM notas n
         JOIN entregas_alumno ea ON ea.id = n.entrega_alumno_id
         JOIN entregas e ON e.id = ea.entrega_id
        WHERE e.modulo_codigo = ?`
    )
    .all(moduloCodigo) as { entregaId: number; alumnoId: number; ceId: number; nota: number }[]

  const notas = new Map<string, number>()
  for (const f of filas) notas.set(`${f.entregaId}|${f.alumnoId}|${f.ceId}`, f.nota)
  const notaDe = (entregaId: number, alumnoId: number, ceId: number): number | null =>
    notas.get(`${entregaId}|${alumnoId}|${ceId}`) ?? null

  const filasCalificacion: FilaCalificacion[] = alumnos.map((alumno) => {
    const celdas: CeldaNota[] = entregas.map((entrega) => {
      const criterios = criteriosPorEntrega.get(entrega.id) ?? []
      const entrada: NotaCriterio[] = criterios.map((c) => ({
        ceId: c.ceId,
        peso: c.peso,
        nota: notaDe(entrega.id, alumno.id, c.ceId)
      }))
      const resultado = calcularNotaEntrega(entrada)
      return { entregaId: entrega.id, nota: resultado.nota, completa: resultado.completa }
    })

    const notasRa: NotaRaPonderada[] = ras.map((ra) => {
      const parciales: NotaEntregaPonderada[] = []
      for (const entrega of entregas) {
        const delRa = (criteriosPorEntrega.get(entrega.id) ?? []).filter(
          (c) => c.raCodigo === ra.codigo
        )
        if (delRa.length === 0) continue
        const entrada: NotaCriterio[] = delRa.map((c) => ({
          ceId: c.ceId,
          peso: c.peso,
          nota: notaDe(entrega.id, alumno.id, c.ceId)
        }))
        parciales.push({
          entregaId: entrega.id,
          peso: entrega.peso,
          nota: calcularNotaEntrega(entrada).nota
        })
      }
      return { raId: ra.id, peso: ra.peso, nota: calcularNotaRa(parciales) }
    })

    return {
      alumno,
      celdas,
      ras: ras.map((ra, i) => ({
        raCodigo: ra.codigo,
        raDescripcion: ra.descripcion,
        peso: ra.peso,
        nota: notasRa[i].nota
      })),
      final: calcularNotaFinal(notasRa)
    }
  })

  return { modulo, entregas, filas: filasCalificacion }
}
