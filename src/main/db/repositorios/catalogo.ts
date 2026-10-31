/**
 * Catálogo de secuenciación y horarios oficiales.
 *
 * Los PDFs de la Conselleria se convierten en `catalogo_ciclos` y
 * `catalogo_modulos`. El catálogo es de solo lectura para la app; cuando se
 * crea un grupo se materializan en `ciclos` y `modulos` las filas mínimas que
 * necesitan las claves foráneas y el resto de la aplicación.
 */
import type { CicloCatalogo, ModuloCatalogo, NivelCatalogo } from '@shared/tipos'
import { siglasDesdeNombre } from '@shared/grupos'
import type { Bd } from '../conexion'

interface FilaCiclo {
  id: string
  denominacion: string
  nivel: NivelCatalogo
  familia_profesional: string
  abreviatura: string
}

interface FilaModulo {
  ciclo_id: string
  curso: string
  codigo: string
  nombre: string
  horas_semanales: number | null
  horas_anuales: number | null
}

const NIVEL_COMPLETO: Record<NivelCatalogo, string> = {
  GB: 'Formación Profesional de Grado Básico',
  GM: 'Formación Profesional de Grado Medio',
  GS: 'Formación Profesional de Grado Superior'
}

/** Devuelve todos los ciclos del catálogo con sus módulos de 1º y 2º. */
export function listarCatalogo(db: Bd): CicloCatalogo[] {
  const ciclos = db
    .prepare(
      `SELECT id, denominacion, nivel, familia_profesional, abreviatura
         FROM catalogo_ciclos
        ORDER BY CASE nivel WHEN 'GB' THEN 1 WHEN 'GM' THEN 2 ELSE 3 END,
                 denominacion`
    )
    .all() as FilaCiclo[]

  const filas = db
    .prepare(
      `SELECT ciclo_id, curso, codigo, nombre, horas_semanales, horas_anuales
         FROM catalogo_modulos
        ORDER BY curso, codigo`
    )
    .all() as FilaModulo[]

  const porCiclo = new Map<string, ModuloCatalogo[]>()
  for (const fila of filas) {
    const lista = porCiclo.get(fila.ciclo_id) ?? []
    lista.push({
      curso: fila.curso === '2' ? '2' : '1',
      codigo: fila.codigo,
      nombre: fila.nombre,
      horas_semanales: fila.horas_semanales,
      horas_anuales: fila.horas_anuales
    })
    porCiclo.set(fila.ciclo_id, lista)
  }

  return ciclos.map((ciclo) => ({
    ...ciclo,
    modulos: porCiclo.get(ciclo.id) ?? []
  }))
}

/**
 * Asegura que un ciclo/módulo del catálogo exista en las tablas BOE.
 *
 * `modulos.codigo` es único en el esquema actual. Si un módulo compartido ya
 * existe asignado a otro ciclo, se reutiliza; la pertenencia al ciclo se
 * comprueba contra `catalogo_modulos` en `validar`.
 */
export function asegurarCicloYModulo(
  db: Bd,
  cicloId: string,
  curso: string,
  moduloCodigo: string
): void {
  const ciclo = db
    .prepare(
      `SELECT id, denominacion, nivel, familia_profesional, abreviatura
         FROM catalogo_ciclos WHERE id = ?`
    )
    .get(cicloId) as FilaCiclo | undefined

  if (ciclo) {
    db.prepare(
      `INSERT INTO ciclos
         (id, denominacion, nivel, familia_profesional, abreviatura, origen)
       VALUES (@id, @denominacion, @nivel, @familia, @abreviatura, 'horario')
       ON CONFLICT(id) DO UPDATE SET
         abreviatura = COALESCE(ciclos.abreviatura, excluded.abreviatura)`
    ).run({
      id: ciclo.id,
      denominacion: ciclo.denominacion,
      nivel: NIVEL_COMPLETO[ciclo.nivel] ?? ciclo.nivel,
      familia: ciclo.familia_profesional,
      abreviatura: ciclo.abreviatura
    })
  }

  const modulo = db
    .prepare(
      `SELECT codigo, nombre, horas_anuales
         FROM catalogo_modulos
        WHERE ciclo_id = ? AND curso = ? AND codigo = ?`
    )
    .get(cicloId, curso, moduloCodigo) as
    { codigo: string; nombre: string; horas_anuales: number | null } | undefined
  if (!modulo) return

  const existente = db
    .prepare('SELECT codigo, curso FROM modulos WHERE codigo = ?')
    .get(moduloCodigo) as { codigo: string; curso: string | null } | undefined

  if (!existente) {
    db.prepare(
      `INSERT INTO modulos (codigo, ciclo_id, nombre, siglas, curso, ects, horas_minimas_boe)
       VALUES (?, ?, ?, ?, ?, NULL, NULL)`
    ).run(
      modulo.codigo,
      cicloId,
      modulo.nombre,
      siglasDesdeNombre(modulo.nombre),
      curso === '2' ? '2' : '1'
    )
    return
  }

  if (!existente.curso) {
    db.prepare('UPDATE modulos SET curso = ? WHERE codigo = ? AND curso IS NULL').run(
      curso === '2' ? '2' : '1',
      moduloCodigo
    )
  }
}
