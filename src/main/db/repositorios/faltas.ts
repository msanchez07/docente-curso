/**
 * Control de faltas por curso (ciclo + nivel + modalidad).
 *
 * La tutoría ve todos los módulos del curso. Cada PDF subido se guarda como un
 * informe histórico independiente con los totales por alumno y módulo.
 */
import type { Bd } from '../conexion'
import type {
  AlumnoFaltasCurso,
  ClaveCursoFaltas,
  ConfigModuloFaltas,
  CursoFaltasResumen,
  DatosCursoFaltas,
  InformeFaltas,
  InformeFaltasDatos,
  InformeFaltasResumen
} from '@shared/tipos'
import { etiquetaModalidad } from '@shared/grupos'

interface FilaGrupo {
  id: number
  curso_academico_id: number
  curso_academico_nombre: string
  ciclo_id: string
  ciclo_nombre: string
  curso: '1' | '2'
  modalidad: 'presencial' | 'semipresencial'
  modulo_codigo: string
  modulo_nombre: string
  modulo_siglas: string | null
  nombre: string
}

function claveConfig(clave: ClaveCursoFaltas): string {
  return `faltas_curso:${clave.cursoAcademicoId}:${clave.cicloId}:${clave.curso}:${clave.modalidad}`
}

function gruposDe(db: Bd, clave: ClaveCursoFaltas): FilaGrupo[] {
  return db
    .prepare(
      `SELECT gc.id, gc.curso_academico_id, ca.nombre AS curso_academico_nombre,
              gc.ciclo_id, c.denominacion AS ciclo_nombre, gc.curso, gc.modalidad,
              gc.modulo_codigo, m.nombre AS modulo_nombre, m.siglas AS modulo_siglas,
              gc.nombre
         FROM grupos_clase gc
         JOIN cursos_academicos ca ON ca.id = gc.curso_academico_id
         JOIN ciclos c ON c.id = gc.ciclo_id
         JOIN modulos m ON m.codigo = gc.modulo_codigo
        WHERE gc.curso_academico_id = ? AND gc.ciclo_id = ? AND gc.curso = ?
          AND gc.modalidad = ?
        ORDER BY m.siglas, gc.modulo_codigo`
    )
    .all(clave.cursoAcademicoId, clave.cicloId, clave.curso, clave.modalidad) as FilaGrupo[]
}

function alumnosDe(db: Bd, clave: ClaveCursoFaltas): AlumnoFaltasCurso[] {
  return db
    .prepare(
      `SELECT DISTINCT a.id, a.nombre, a.apellidos
         FROM alumnos a
         JOIN matriculas_clase mc ON mc.alumno_id = a.id
         JOIN grupos_clase gc ON gc.id = mc.grupo_clase_id
        WHERE gc.curso_academico_id = ? AND gc.ciclo_id = ? AND gc.curso = ?
          AND gc.modalidad = ?
        ORDER BY a.apellidos, a.nombre`
    )
    .all(clave.cursoAcademicoId, clave.cicloId, clave.curso, clave.modalidad) as AlumnoFaltasCurso[]
}

function moduloDe(db: Bd, grupo: FilaGrupo): ConfigModuloFaltas {
  const config = db
    .prepare('SELECT nombre_informe, horas FROM faltas_modulo_config WHERE grupo_clase_id = ?')
    .get(grupo.id) as { nombre_informe: string; horas: number } | undefined
  const modulo = db
    .prepare('SELECT horas_minimas_boe, siglas FROM modulos WHERE codigo = ?')
    .get(grupo.modulo_codigo) as
    { horas_minimas_boe: number | null; siglas: string | null } | undefined
  return {
    grupoId: grupo.id,
    moduloCodigo: grupo.modulo_codigo,
    nombre: grupo.modulo_nombre,
    nombreInforme:
      config?.nombre_informe || modulo?.siglas || grupo.modulo_siglas || grupo.modulo_codigo,
    horas: config?.horas ?? modulo?.horas_minimas_boe ?? 0
  }
}

function leerAjustes(
  db: Bd,
  clave: ClaveCursoFaltas
): { limite: number; incluirJustificadas: boolean } {
  const fila = db.prepare('SELECT valor FROM config WHERE clave = ?').get(claveConfig(clave)) as
    { valor: string } | undefined
  if (!fila) return { limite: 15, incluirJustificadas: false }
  try {
    const datos = JSON.parse(fila.valor) as { limite?: number; incluirJustificadas?: boolean }
    return {
      limite: Math.min(100, Math.max(1, Number(datos.limite) || 15)),
      incluirJustificadas: Boolean(datos.incluirJustificadas)
    }
  } catch {
    return { limite: 15, incluirJustificadas: false }
  }
}

function escribirAjustes(
  db: Bd,
  clave: ClaveCursoFaltas,
  limite: number,
  incluirJustificadas: boolean
): void {
  db.prepare(
    `INSERT INTO config (clave, valor) VALUES (?, ?)
     ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`
  ).run(claveConfig(clave), JSON.stringify({ limite, incluirJustificadas }))
}

export function listarCursosFaltas(db: Bd): CursoFaltasResumen[] {
  const filas = db
    .prepare(
      `SELECT gc.curso_academico_id, ca.nombre AS curso_academico_nombre,
              gc.ciclo_id, c.denominacion AS ciclo_nombre, gc.curso, gc.modalidad,
              gc.modulo_codigo, m.nombre AS modulo_nombre, m.siglas AS modulo_siglas, gc.nombre,
              gc.id
         FROM grupos_clase gc
         JOIN cursos_academicos ca ON ca.id = gc.curso_academico_id
         JOIN ciclos c ON c.id = gc.ciclo_id
         JOIN modulos m ON m.codigo = gc.modulo_codigo
        ORDER BY ca.actual DESC, ca.nombre DESC, c.denominacion, gc.curso, gc.modalidad`
    )
    .all() as FilaGrupo[]

  const mapa = new Map<string, CursoFaltasResumen>()
  for (const fila of filas) {
    const key = `${fila.curso_academico_id}|${fila.ciclo_id}|${fila.curso}|${fila.modalidad}`
    const existente = mapa.get(key)
    if (existente) {
      existente.modulos += 1
      continue
    }
    const clave: ClaveCursoFaltas = {
      cursoAcademicoId: fila.curso_academico_id,
      cicloId: fila.ciclo_id,
      curso: fila.curso,
      modalidad: fila.modalidad
    }
    mapa.set(key, {
      ...clave,
      cursoAcademicoNombre: fila.curso_academico_nombre,
      cicloNombre: fila.ciclo_nombre,
      nombre: `${fila.curso}º ${fila.ciclo_id.toUpperCase()} · ${etiquetaModalidad(fila.modalidad)}`,
      modulos: 1,
      alumnos: alumnosDe(db, clave).length
    })
  }
  return [...mapa.values()]
}

export function obtenerCursoFaltas(db: Bd, clave: ClaveCursoFaltas): DatosCursoFaltas {
  const grupos = gruposDe(db, clave)
  if (grupos.length === 0) throw new Error('No hay módulos para este curso.')
  const ajustes = leerAjustes(db, clave)
  return {
    ...clave,
    cursoAcademicoNombre: grupos[0].curso_academico_nombre,
    cicloNombre: grupos[0].ciclo_nombre,
    modulos: grupos.map((grupo) => moduloDe(db, grupo)),
    alumnos: alumnosDe(db, clave),
    ...ajustes
  }
}

export function guardarModuloFaltas(
  db: Bd,
  grupoClaseId: number,
  nombreInforme: string,
  horas: number
): void {
  const grupo = db.prepare('SELECT 1 FROM grupos_clase WHERE id = ?').get(grupoClaseId)
  if (!grupo) throw new Error('El grupo no existe.')
  if (!Number.isFinite(horas) || horas <= 0) throw new Error('Indica las horas del módulo.')
  db.prepare(
    `INSERT INTO faltas_modulo_config (grupo_clase_id, nombre_informe, horas, actualizado_en)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(grupo_clase_id) DO UPDATE SET
       nombre_informe = excluded.nombre_informe,
       horas = excluded.horas,
       actualizado_en = datetime('now')`
  ).run(grupoClaseId, nombreInforme.trim(), horas)
}

export function guardarAjustesFaltas(
  db: Bd,
  clave: ClaveCursoFaltas,
  limite: number,
  incluirJustificadas: boolean
): DatosCursoFaltas {
  if (limite < 1 || limite > 100) throw new Error('El límite debe estar entre 1 y 100 %.')
  escribirAjustes(db, clave, limite, incluirJustificadas)
  return obtenerCursoFaltas(db, clave)
}

export function listarInformesFaltas(db: Bd, clave: ClaveCursoFaltas): InformeFaltasResumen[] {
  const filas = db
    .prepare(
      `SELECT id, archivo, subido_en, datos
         FROM faltas_informes
        WHERE curso_academico_id = ? AND ciclo_id = ? AND curso = ? AND modalidad = ?
        ORDER BY subido_en DESC, id DESC`
    )
    .all(clave.cursoAcademicoId, clave.cicloId, clave.curso, clave.modalidad) as {
    id: number
    archivo: string
    subido_en: string
    datos: string
  }[]
  return filas.map((fila) => {
    let datos: InformeFaltasDatos | null = null
    try {
      datos = JSON.parse(fila.datos) as InformeFaltasDatos
    } catch {
      datos = null
    }
    return {
      id: fila.id,
      archivo: fila.archivo,
      subidoEn: fila.subido_en,
      totalAlumnos: datos?.alumnos.length ?? 0,
      totalModulos: datos?.modulos.length ?? 0
    }
  })
}

export function obtenerInformeFaltas(db: Bd, id: number): InformeFaltas | null {
  const fila = db
    .prepare(
      `SELECT id, curso_academico_id, ciclo_id, curso, modalidad, archivo, subido_en, datos
         FROM faltas_informes WHERE id = ?`
    )
    .get(id) as
    | {
        id: number
        curso_academico_id: number
        ciclo_id: string
        curso: '1' | '2'
        modalidad: 'presencial' | 'semipresencial'
        archivo: string
        subido_en: string
        datos: string
      }
    | undefined
  if (!fila) return null
  let datos: InformeFaltasDatos
  try {
    datos = JSON.parse(fila.datos) as InformeFaltasDatos
  } catch {
    return null
  }
  return {
    id: fila.id,
    cursoAcademicoId: fila.curso_academico_id,
    cicloId: fila.ciclo_id,
    curso: fila.curso,
    modalidad: fila.modalidad,
    archivo: fila.archivo,
    subidoEn: fila.subido_en,
    totalAlumnos: datos.alumnos.length,
    totalModulos: datos.modulos.length,
    datos
  }
}

export function importarInformeFaltas(
  db: Bd,
  clave: ClaveCursoFaltas,
  archivo: string,
  datos: InformeFaltasDatos
): InformeFaltas {
  const curso = obtenerCursoFaltas(db, clave)
  const modulosValidos = new Set(curso.modulos.map((modulo) => modulo.grupoId))
  for (const modulo of datos.modulos) {
    if (!modulosValidos.has(modulo.grupoId)) {
      throw new Error('El informe contiene módulos que no pertenecen a este curso.')
    }
  }
  const alumnosValidos = new Set(curso.alumnos.map((alumno) => alumno.id))
  for (const alumno of datos.alumnos) {
    if (!alumnosValidos.has(alumno.alumnoId)) {
      throw new Error('El informe contiene alumnado que no pertenece a este curso.')
    }
  }
  const datosNormalizados: InformeFaltasDatos = {
    modulos: curso.modulos,
    alumnos: datos.alumnos,
    limite: curso.limite,
    incluirJustificadas: curso.incluirJustificadas
  }
  const resultado = db
    .prepare(
      `INSERT INTO faltas_informes
         (curso_academico_id, ciclo_id, curso, modalidad, archivo, datos)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      clave.cursoAcademicoId,
      clave.cicloId,
      clave.curso,
      clave.modalidad,
      archivo.trim() || 'Informe sin nombre',
      JSON.stringify(datosNormalizados)
    )
  return obtenerInformeFaltas(db, Number(resultado.lastInsertRowid))!
}
