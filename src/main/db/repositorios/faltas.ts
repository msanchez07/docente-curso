/**
 * Control de faltas por grupo de clase.
 *
 * Los totales se guardan por alumno; los ajustes de cálculo (horas del módulo,
 * límite, justificadas y código del informe) se guardan en `config` para que
 * no cambien al mover o renombrar al alumnado.
 */
import type { Bd } from '../conexion'
import type {
  AjustesFaltas,
  AlumnoClase,
  DatosFaltas,
  FilaFaltas,
  FilaFaltasEntrada
} from '@shared/tipos'
import { listarAlumnosDeGrupoClase } from './alumnos-clase'
import { obtenerGrupoClase } from './grupos-clase'

function clave(grupoClaseId: number): string {
  return `faltas:${grupoClaseId}`
}

function normalizarAjustes(valor: unknown): AjustesFaltas {
  const datos = (valor ?? {}) as Partial<AjustesFaltas>
  return {
    horas: Math.max(0, Number(datos.horas) || 0),
    limite: Math.min(100, Math.max(1, Number(datos.limite) || 15)),
    incluirJustificadas: Boolean(datos.incluirJustificadas),
    codigoInforme: typeof datos.codigoInforme === 'string' ? datos.codigoInforme.trim() : ''
  }
}

function ajustesPorDefecto(db: Bd, grupoClaseId: number): AjustesFaltas {
  const grupo = obtenerGrupoClase(db, grupoClaseId)
  if (!grupo) throw new Error('El grupo no existe.')
  const modulo = db
    .prepare('SELECT horas_minimas_boe, siglas FROM modulos WHERE codigo = ?')
    .get(grupo.modulo_codigo) as
    { horas_minimas_boe: number | null; siglas: string | null } | undefined
  return {
    horas: modulo?.horas_minimas_boe ?? 0,
    limite: 15,
    incluirJustificadas: false,
    codigoInforme: modulo?.siglas ?? grupo.modulo_siglas ?? ''
  }
}

function leerAjustes(db: Bd, grupoClaseId: number): AjustesFaltas {
  const fila = db.prepare('SELECT valor FROM config WHERE clave = ?').get(clave(grupoClaseId)) as
    { valor: string } | undefined
  if (!fila) return ajustesPorDefecto(db, grupoClaseId)
  try {
    return normalizarAjustes(JSON.parse(fila.valor))
  } catch {
    return ajustesPorDefecto(db, grupoClaseId)
  }
}

function escribirAjustes(db: Bd, grupoClaseId: number, ajustes: AjustesFaltas): void {
  db.prepare(
    `INSERT INTO config (clave, valor) VALUES (?, ?)
     ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`
  ).run(clave(grupoClaseId), JSON.stringify(ajustes))
}

function filasDe(db: Bd, grupoClaseId: number): FilaFaltas[] {
  const alumnos = listarAlumnosDeGrupoClase(db, grupoClaseId)
  const guardadas = new Map(
    (
      db
        .prepare(
          'SELECT alumno_id, faltas, justificadas FROM faltas_alumno WHERE grupo_clase_id = ?'
        )
        .all(grupoClaseId) as { alumno_id: number; faltas: number; justificadas: number }[]
    ).map((fila) => [fila.alumno_id, fila])
  )
  return alumnos.map((alumno: AlumnoClase) => {
    const fila = guardadas.get(alumno.id)
    return {
      alumno,
      faltas: fila?.faltas ?? 0,
      justificadas: fila?.justificadas ?? 0
    }
  })
}

export function obtenerFaltas(db: Bd, grupoClaseId: number): DatosFaltas {
  if (!obtenerGrupoClase(db, grupoClaseId)) throw new Error('El grupo no existe.')
  return {
    ajustes: leerAjustes(db, grupoClaseId),
    filas: filasDe(db, grupoClaseId)
  }
}

export function guardarAjustesFaltas(
  db: Bd,
  grupoClaseId: number,
  ajustes: AjustesFaltas
): DatosFaltas {
  if (!obtenerGrupoClase(db, grupoClaseId)) throw new Error('El grupo no existe.')
  const normalizados = normalizarAjustes(ajustes)
  if (normalizados.horas <= 0) throw new Error('Indica las horas totales del módulo.')
  if (normalizados.limite < 1 || normalizados.limite > 100) {
    throw new Error('El límite debe estar entre 1 y 100 %.')
  }
  escribirAjustes(db, grupoClaseId, normalizados)
  return obtenerFaltas(db, grupoClaseId)
}

export function guardarFilasFaltas(
  db: Bd,
  grupoClaseId: number,
  filas: FilaFaltasEntrada[]
): DatosFaltas {
  if (!obtenerGrupoClase(db, grupoClaseId)) throw new Error('El grupo no existe.')
  const alumnos = new Set(listarAlumnosDeGrupoClase(db, grupoClaseId).map((alumno) => alumno.id))
  for (const fila of filas) {
    if (!alumnos.has(fila.alumnoId)) {
      throw new Error('Hay alumnado que no pertenece a este grupo.')
    }
    if (!Number.isFinite(fila.faltas) || fila.faltas < 0) {
      throw new Error('Las faltas no pueden ser negativas.')
    }
    if (!Number.isFinite(fila.justificadas) || fila.justificadas < 0) {
      throw new Error('Las faltas justificadas no pueden ser negativas.')
    }
  }

  const borrar = db.prepare('DELETE FROM faltas_alumno WHERE grupo_clase_id = ?')
  const insertar = db.prepare(
    `INSERT INTO faltas_alumno (grupo_clase_id, alumno_id, faltas, justificadas, actualizado_en)
     VALUES (?, ?, ?, ?, datetime('now'))`
  )
  db.transaction(() => {
    borrar.run(grupoClaseId)
    for (const fila of filas) {
      insertar.run(grupoClaseId, fila.alumnoId, fila.faltas, fila.justificadas)
    }
  })()
  return obtenerFaltas(db, grupoClaseId)
}
