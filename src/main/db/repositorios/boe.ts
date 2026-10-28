/**
 * Repositorio de lectura de los datos del BOE (ciclos, módulos, RA y CE).
 */
import type { Ciclo, Modulo, ResumenCiclo, ResumenModulo } from '@shared/tipos'
import type { Bd } from '../conexion'

export function listarCiclos(db: Bd): ResumenCiclo[] {
  return db
    .prepare(
      `SELECT c.id, c.denominacion, c.nivel,
              (SELECT COUNT(*) FROM modulos m WHERE m.ciclo_id = c.id) AS modulos,
              (SELECT COUNT(*) FROM resultados_aprendizaje r
                 JOIN modulos m2 ON m2.codigo = r.modulo_codigo
                WHERE m2.ciclo_id = c.id) AS ra,
              (SELECT COUNT(*) FROM criterios_evaluacion ce
                 JOIN resultados_aprendizaje r2 ON r2.id = ce.ra_id
                 JOIN modulos m3 ON m3.codigo = r2.modulo_codigo
                WHERE m3.ciclo_id = c.id) AS ce
         FROM ciclos c
        ORDER BY c.denominacion`
    )
    .all() as ResumenCiclo[]
}

export function listarModulos(db: Bd, cicloId: string): ResumenModulo[] {
  return db
    .prepare(
      `SELECT m.codigo, m.nombre, m.siglas, m.curso, m.ects, m.horas_minimas_boe,
              (SELECT COUNT(*) FROM resultados_aprendizaje r
                WHERE r.modulo_codigo = m.codigo) AS ra,
              (SELECT COUNT(*) FROM criterios_evaluacion ce
                 JOIN resultados_aprendizaje r2 ON r2.id = ce.ra_id
                WHERE r2.modulo_codigo = m.codigo) AS ce
         FROM modulos m
        WHERE m.ciclo_id = ?
        ORDER BY m.codigo`
    )
    .all(cicloId) as ResumenModulo[]
}

export function obtenerCiclo(db: Bd, id: string): Ciclo | null {
  const ciclo = db
    .prepare(
      `SELECT id, denominacion, nivel, familia_profesional, duracion_horas, ects,
              rd, rd_actualizacion, boe_url, boe_url_actualizacion
         FROM ciclos WHERE id = ?`
    )
    .get(id) as Omit<Ciclo, 'modulos'> | undefined
  if (!ciclo) return null

  const modulos = db
    .prepare(
      `SELECT codigo, nombre, siglas, curso, ects, horas_minimas_boe
         FROM modulos WHERE ciclo_id = ? ORDER BY codigo`
    )
    .all(id) as Omit<Modulo, 'ra'>[]

  const ras = db
    .prepare(
      `SELECT r.id, r.modulo_codigo, r.codigo, r.numero, r.descripcion
         FROM resultados_aprendizaje r
         JOIN modulos m ON m.codigo = r.modulo_codigo
        WHERE m.ciclo_id = ?
        ORDER BY r.modulo_codigo, r.numero`
    )
    .all(id) as {
    id: number
    modulo_codigo: string
    codigo: string
    numero: number
    descripcion: string
  }[]

  const ces = db
    .prepare(
      `SELECT ce.ra_id, ce.codigo, ce.descripcion
         FROM criterios_evaluacion ce
         JOIN resultados_aprendizaje r ON r.id = ce.ra_id
         JOIN modulos m ON m.codigo = r.modulo_codigo
        WHERE m.ciclo_id = ?
        ORDER BY ce.ra_id, ce.codigo`
    )
    .all(id) as { ra_id: number; codigo: string; descripcion: string }[]

  const cePorRa = new Map<number, { codigo: string; descripcion: string }[]>()
  for (const ce of ces) {
    const lista = cePorRa.get(ce.ra_id) ?? []
    lista.push({ codigo: ce.codigo, descripcion: ce.descripcion })
    cePorRa.set(ce.ra_id, lista)
  }

  const raPorModulo = new Map<string, Modulo['ra']>()
  for (const ra of ras) {
    const lista = raPorModulo.get(ra.modulo_codigo) ?? []
    lista.push({
      codigo: ra.codigo,
      numero: ra.numero,
      descripcion: ra.descripcion,
      ce: cePorRa.get(ra.id) ?? []
    })
    raPorModulo.set(ra.modulo_codigo, lista)
  }

  return {
    ...ciclo,
    modulos: modulos.map((m) => ({ ...m, ra: raPorModulo.get(m.codigo) ?? [] }))
  }
}

/**
 * Módulo con sus RA y CE, para consultarlos desde cualquier sección.
 */
export function obtenerModulo(db: Bd, codigo: string): Modulo | null {
  const modulo = db
    .prepare(
      `SELECT codigo, nombre, siglas, curso, ects, horas_minimas_boe
         FROM modulos WHERE codigo = ?`
    )
    .get(codigo) as Omit<Modulo, 'ra'> | undefined
  if (!modulo) return null

  const ras = db
    .prepare(
      `SELECT id, codigo, numero, descripcion
         FROM resultados_aprendizaje
        WHERE modulo_codigo = ?
        ORDER BY numero`
    )
    .all(codigo) as { id: number; codigo: string; numero: number; descripcion: string }[]

  const ces = db
    .prepare(
      `SELECT ce.ra_id, ce.codigo, ce.descripcion
         FROM criterios_evaluacion ce
         JOIN resultados_aprendizaje r ON r.id = ce.ra_id
        WHERE r.modulo_codigo = ?
        ORDER BY ce.ra_id, ce.codigo`
    )
    .all(codigo) as { ra_id: number; codigo: string; descripcion: string }[]

  const cePorRa = new Map<number, { codigo: string; descripcion: string }[]>()
  for (const ce of ces) {
    const lista = cePorRa.get(ce.ra_id) ?? []
    lista.push({ codigo: ce.codigo, descripcion: ce.descripcion })
    cePorRa.set(ce.ra_id, lista)
  }

  return {
    ...modulo,
    ra: ras.map((ra) => ({
      codigo: ra.codigo,
      numero: ra.numero,
      descripcion: ra.descripcion,
      ce: cePorRa.get(ra.id) ?? []
    }))
  }
}

/**
 * Guarda el peso de cada RA dentro de la nota final del módulo.
 * `pesos` es un mapa `codigo del RA → peso` (porcentaje).
 */
export function guardarPesosRa(db: Bd, moduloCodigo: string, pesos: Record<string, number>): void {
  const actualizar = db.prepare(
    'UPDATE resultados_aprendizaje SET peso = ? WHERE modulo_codigo = ? AND codigo = ?'
  )
  db.transaction(() => {
    for (const [codigo, peso] of Object.entries(pesos)) {
      actualizar.run(Number(peso) || 0, moduloCodigo, codigo)
    }
  })()
}
