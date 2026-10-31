/**
 * Siembra de los datos del BOE en la base de datos.
 *
 * Es idempotente y **conserva los pesos** que el profesorado haya ajustado: los
 * datos oficiales (descripciones, códigos) se actualizan, pero los pesos puestos
 * a mano no se pisan.
 */
import type { CatalogoHorarios, Ciclo } from '@shared/tipos'
import type { Bd } from './conexion'

export function sembrarCiclos(db: Bd, ciclos: Ciclo[]): void {
  const upsertCiclo = db.prepare(`
    INSERT INTO ciclos (id, denominacion, nivel, familia_profesional, duracion_horas, ects,
                        rd, rd_actualizacion, boe_url, boe_url_actualizacion,
                        abreviatura, origen)
    VALUES (@id, @denominacion, @nivel, @familia_profesional, @duracion_horas, @ects,
            @rd, @rd_actualizacion, @boe_url, @boe_url_actualizacion,
            @abreviatura, 'boe')
    ON CONFLICT(id) DO UPDATE SET
      denominacion          = excluded.denominacion,
      nivel                 = excluded.nivel,
      familia_profesional   = excluded.familia_profesional,
      duracion_horas        = excluded.duracion_horas,
      ects                  = excluded.ects,
      rd                    = excluded.rd,
      rd_actualizacion      = excluded.rd_actualizacion,
      boe_url               = excluded.boe_url,
      boe_url_actualizacion = excluded.boe_url_actualizacion,
      abreviatura           = COALESCE(ciclos.abreviatura, excluded.abreviatura),
      origen                = 'boe'
  `)

  const upsertModulo = db.prepare(`
    INSERT INTO modulos (codigo, ciclo_id, nombre, siglas, curso, ects, horas_minimas_boe)
    VALUES (@codigo, @ciclo_id, @nombre, @siglas, @curso, @ects, @horas_minimas_boe)
    ON CONFLICT(codigo) DO UPDATE SET
      ciclo_id          = excluded.ciclo_id,
      nombre            = excluded.nombre,
      siglas            = excluded.siglas,
      curso             = excluded.curso,
      ects              = excluded.ects,
      horas_minimas_boe = excluded.horas_minimas_boe
  `)

  const upsertRa = db.prepare(`
    INSERT INTO resultados_aprendizaje (modulo_codigo, codigo, numero, descripcion)
    VALUES (@modulo_codigo, @codigo, @numero, @descripcion)
    ON CONFLICT(modulo_codigo, codigo) DO UPDATE SET
      numero      = excluded.numero,
      descripcion = excluded.descripcion
  `)

  const idRa = db.prepare(
    `SELECT id FROM resultados_aprendizaje WHERE modulo_codigo = ? AND codigo = ?`
  )

  const upsertCe = db.prepare(`
    INSERT INTO criterios_evaluacion (ra_id, codigo, descripcion)
    VALUES (@ra_id, @codigo, @descripcion)
    ON CONFLICT(ra_id, codigo) DO UPDATE SET
      descripcion = excluded.descripcion
  `)

  const transaccion = db.transaction((ciclos: Ciclo[]) => {
    for (const ciclo of ciclos) {
      upsertCiclo.run({
        id: ciclo.id,
        denominacion: ciclo.denominacion,
        nivel: ciclo.nivel ?? null,
        familia_profesional: ciclo.familia_profesional ?? null,
        duracion_horas: ciclo.duracion_horas ?? null,
        ects: ciclo.ects ?? null,
        rd: ciclo.rd ?? null,
        rd_actualizacion: ciclo.rd_actualizacion ?? null,
        boe_url: ciclo.boe_url ?? null,
        boe_url_actualizacion: ciclo.boe_url_actualizacion ?? null,
        abreviatura: ciclo.abreviatura?.trim() || ciclo.id.toUpperCase()
      })

      for (const modulo of ciclo.modulos) {
        upsertModulo.run({
          codigo: modulo.codigo,
          ciclo_id: ciclo.id,
          nombre: modulo.nombre,
          siglas: modulo.siglas ?? null,
          curso: modulo.curso ?? null,
          ects: modulo.ects ?? null,
          horas_minimas_boe: modulo.horas_minimas_boe ?? null
        })

        for (const ra of modulo.ra) {
          upsertRa.run({
            modulo_codigo: modulo.codigo,
            codigo: ra.codigo,
            numero: ra.numero,
            descripcion: ra.descripcion
          })
          const fila = idRa.get(modulo.codigo, ra.codigo) as { id: number } | undefined
          if (!fila) continue
          for (const ce of ra.ce) {
            upsertCe.run({ ra_id: fila.id, codigo: ce.codigo, descripcion: ce.descripcion })
          }
        }
      }
    }
  })

  transaccion(ciclos)
}

export interface RecuentoBoe {
  ciclos: number
  modulos: number
  ra: number
  ce: number
}

export function contarBoe(db: Bd): RecuentoBoe {
  const uno = (sql: string): number => (db.prepare(sql).get() as { n: number }).n
  return {
    ciclos: uno('SELECT COUNT(*) AS n FROM ciclos'),
    modulos: uno('SELECT COUNT(*) AS n FROM modulos'),
    ra: uno('SELECT COUNT(*) AS n FROM resultados_aprendizaje'),
    ce: uno('SELECT COUNT(*) AS n FROM criterios_evaluacion')
  }
}

/**
 * Siembra el catálogo de secuenciación y horarios.
 *
 * Se reemplaza entero en cada arranque para que una actualización de los PDFs
 * no deje ciclos o módulos antiguos. No toca `ciclos` ni `modulos`: esos se
 * materializan solo al crear un grupo.
 */
export function sembrarCatalogo(db: Bd, catalogo: CatalogoHorarios): void {
  const insertarCiclo = db.prepare(`
    INSERT INTO catalogo_ciclos
      (id, denominacion, nivel, familia_profesional, abreviatura, curso_academico)
    VALUES (@id, @denominacion, @nivel, @familia_profesional, @abreviatura, @curso_academico)
  `)
  const insertarModulo = db.prepare(`
    INSERT INTO catalogo_modulos
      (ciclo_id, curso, codigo, nombre, horas_semanales, horas_anuales)
    VALUES (@ciclo_id, @curso, @codigo, @nombre, @horas_semanales, @horas_anuales)
  `)

  db.transaction(() => {
    db.prepare('DELETE FROM catalogo_modulos').run()
    db.prepare('DELETE FROM catalogo_ciclos').run()
    for (const ciclo of catalogo.ciclos) {
      insertarCiclo.run({
        id: ciclo.id,
        denominacion: ciclo.denominacion,
        nivel: ciclo.nivel,
        familia_profesional: ciclo.familia_profesional,
        abreviatura: ciclo.abreviatura,
        curso_academico: catalogo.curso_academico
      })
      for (const modulo of ciclo.modulos) {
        insertarModulo.run({
          ciclo_id: ciclo.id,
          curso: modulo.curso,
          codigo: modulo.codigo,
          nombre: modulo.nombre,
          horas_semanales: modulo.horas_semanales,
          horas_anuales: modulo.horas_anuales
        })
      }
    }
  })()
}
