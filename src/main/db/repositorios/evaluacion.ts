/**
 * Repositorio de evaluación: el modelo configurable **por grupo** y el resumen.
 *
 * Cada grupo (un módulo en una modalidad) tiene su propio modelo. Si un grupo
 * no tiene modelo propio se hereda, por este orden: el del módulo, el global de
 * versiones anteriores y, por último, la plantilla de su modalidad.
 */
import type { Grupo, ModeloEvaluacion, ResumenEvaluacion } from '@shared/tipos'
import { evaluarAlumno } from '../../domain/evaluacion'
import { modeloPorDefecto, normalizarModelo, validarModelo } from '../../domain/modelo'
import type { Bd } from '../conexion'
import { listarAlumnosDeGrupo } from './alumnos'
import { listarEntregas } from './entregas'
import { obtenerGrupo } from './grupos'
import { calcularEntregaAlumno } from './notas'

const CLAVE_GLOBAL = 'modelo_evaluacion'

function claveGrupo(grupoId: number): string {
  return `${CLAVE_GLOBAL}:grupo:${grupoId}`
}

function claveModulo(moduloCodigo: string): string {
  return `${CLAVE_GLOBAL}:${moduloCodigo}`
}

function leerClave(db: Bd, clave: string): ModeloEvaluacion | null {
  const fila = db.prepare('SELECT valor FROM config WHERE clave = ?').get(clave) as
    | { valor: string }
    | undefined
  if (!fila) return null
  try {
    return normalizarModelo(JSON.parse(fila.valor))
  } catch {
    return null
  }
}

function escribirClave(db: Bd, clave: string, modelo: ModeloEvaluacion): void {
  db.prepare(
    `INSERT INTO config (clave, valor) VALUES (?, ?)
     ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`
  ).run(clave, JSON.stringify(modelo))
}

/** Modelo de un grupo, con la cadena de herencia. */
export function obtenerModeloDeGrupo(db: Bd, grupo: Grupo): ModeloEvaluacion {
  return (
    leerClave(db, claveGrupo(grupo.id)) ??
    leerClave(db, claveModulo(grupo.modulo_codigo)) ??
    leerClave(db, CLAVE_GLOBAL) ??
    modeloPorDefecto(grupo.modalidad)
  )
}

/** Modelo de un grupo por su identificador. */
export function obtenerModelo(db: Bd, grupoId: number): ModeloEvaluacion {
  const grupo = obtenerGrupo(db, grupoId)
  if (!grupo) return modeloPorDefecto('presencial')
  return obtenerModeloDeGrupo(db, grupo)
}

export function guardarModeloDeGrupo(
  db: Bd,
  grupoId: number,
  modelo: ModeloEvaluacion
): ModeloEvaluacion {
  const grupo = obtenerGrupo(db, grupoId)
  if (!grupo) throw new Error(`El grupo ${grupoId} no existe`)

  const validacion = validarModelo(modelo)
  if (!validacion.ok) throw new Error(validacion.errores.join(' '))

  escribirClave(db, claveGrupo(grupoId), modelo)
  return obtenerModeloDeGrupo(db, grupo)
}

/** Copia el modelo a todos los grupos de un ciclo. */
export function aplicarModeloATodos(
  db: Bd,
  cicloId: string,
  modelo: ModeloEvaluacion
): number {
  const validacion = validarModelo(modelo)
  if (!validacion.ok) throw new Error(validacion.errores.join(' '))

  const grupos = db
    .prepare(
      `SELECT g.id FROM grupos g
         JOIN modulos m ON m.codigo = g.modulo_codigo
        WHERE m.ciclo_id = ?`
    )
    .all(cicloId) as { id: number }[]

  db.transaction(() => {
    for (const grupo of grupos) escribirClave(db, claveGrupo(grupo.id), modelo)
  })()

  return grupos.length
}

export function resumenEvaluacion(db: Bd, grupoId: number): ResumenEvaluacion {
  const grupo = obtenerGrupo(db, grupoId)
  if (!grupo) throw new Error(`El grupo ${grupoId} no existe`)

  const modulo = db
    .prepare('SELECT codigo, nombre FROM modulos WHERE codigo = ?')
    .get(grupo.modulo_codigo) as { codigo: string; nombre: string } | undefined
  if (!modulo) throw new Error(`El módulo ${grupo.modulo_codigo} no existe`)

  const modelo = obtenerModeloDeGrupo(db, grupo)
  const entregas = listarEntregas(db, grupo.modulo_codigo)
  const alumnos = listarAlumnosDeGrupo(db, grupoId)

  return {
    grupo,
    modulo,
    modelo,
    alumnos: alumnos.map((alumno) =>
      evaluarAlumno(alumno, modelo, entregas, (entregaId) =>
        calcularEntregaAlumno(db, entregaId, alumno.id).nota
      )
    )
  }
}
