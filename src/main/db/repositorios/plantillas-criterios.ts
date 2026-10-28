/**
 * Plantillas de criterios.
 *
 * Se crean desde un grupo y toman su nombre: «Plantilla 2º DAW · DWES ·
 * Presencial». Quedan asociadas al módulo y la modalidad del grupo, de modo
 * que un grupo nuevo de ese módulo y modalidad las usa automáticamente.
 */
import type { Bd } from '../conexion'
import type { ModeloEvaluacion, PlantillaCriterios, PlantillaParaGrupo } from '@shared/tipos'
import { modeloPorDefecto, normalizarModelo, validarModelo } from '../../domain/modelo'
import { obtenerGrupoClase } from './grupos-clase'

const CAMPOS = `id, nombre, modulo_codigo, modalidad, creado_en, actualizado_en`

function validar(modelo: ModeloEvaluacion): ModeloEvaluacion {
  const resultado = validarModelo(modelo)
  if (!resultado.ok) throw new Error(resultado.errores.join(' '))
  const normalizado = normalizarModelo(modelo)
  if (!normalizado) throw new Error('El modelo de evaluación no es válido.')
  return normalizado
}

export function plantillaParaGrupo(db: Bd, grupoClaseId: number): PlantillaParaGrupo {
  const grupo = obtenerGrupoClase(db, grupoClaseId)
  if (!grupo) throw new Error('El grupo no existe.')

  const fila = db
    .prepare(
      `SELECT nombre, modelo
         FROM plantillas_criterios
        WHERE modulo_codigo = ? AND modalidad = ?`
    )
    .get(grupo.modulo_codigo, grupo.modalidad) as { nombre: string; modelo: string } | undefined

  if (!fila) {
    return { nombre: null, modelo: modeloPorDefecto(grupo.modalidad) }
  }

  let modelo: ModeloEvaluacion | null = null
  try {
    modelo = normalizarModelo(JSON.parse(fila.modelo))
  } catch {
    modelo = null
  }

  return {
    nombre: fila.nombre,
    modelo: modelo ?? modeloPorDefecto(grupo.modalidad)
  }
}

export function crearPlantillaDesdeGrupo(
  db: Bd,
  grupoClaseId: number,
  modelo: ModeloEvaluacion
): PlantillaCriterios {
  const grupo = obtenerGrupoClase(db, grupoClaseId)
  if (!grupo) throw new Error('El grupo no existe.')
  const normalizado = validar(modelo)
  const nombre = `Plantilla ${grupo.nombre}`

  db.prepare(
    `INSERT INTO plantillas_criterios (nombre, modulo_codigo, modalidad, modelo)
     VALUES (@nombre, @modulo_codigo, @modalidad, @modelo)
     ON CONFLICT(modulo_codigo, modalidad) DO UPDATE SET
       nombre         = excluded.nombre,
       modelo         = excluded.modelo,
       actualizado_en = datetime('now')`
  ).run({
    nombre,
    modulo_codigo: grupo.modulo_codigo,
    modalidad: grupo.modalidad,
    modelo: JSON.stringify(normalizado)
  })

  return db
    .prepare(
      `SELECT ${CAMPOS}
         FROM plantillas_criterios
        WHERE modulo_codigo = ? AND modalidad = ?`
    )
    .get(grupo.modulo_codigo, grupo.modalidad) as PlantillaCriterios
}

export function listarPlantillas(db: Bd): PlantillaCriterios[] {
  return db
    .prepare(`SELECT ${CAMPOS} FROM plantillas_criterios ORDER BY nombre`)
    .all() as PlantillaCriterios[]
}

export function obtenerPlantilla(db: Bd, id: number): ModeloEvaluacion | null {
  const fila = db.prepare('SELECT modelo FROM plantillas_criterios WHERE id = ?').get(id) as
    { modelo: string } | undefined
  if (!fila) return null
  try {
    return normalizarModelo(JSON.parse(fila.modelo))
  } catch {
    return null
  }
}

export function guardarPlantilla(db: Bd, id: number, modelo: ModeloEvaluacion): ModeloEvaluacion {
  const normalizado = validar(modelo)
  const resultado = db
    .prepare(
      `UPDATE plantillas_criterios
          SET modelo = ?, actualizado_en = datetime('now')
        WHERE id = ?`
    )
    .run(JSON.stringify(normalizado), id)
  if (resultado.changes === 0) throw new Error('La plantilla no existe.')
  return normalizado
}

export function borrarPlantilla(db: Bd, id: number): boolean {
  return db.prepare('DELETE FROM plantillas_criterios WHERE id = ?').run(id).changes > 0
}
