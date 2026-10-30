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

function configModulo(clave: ClaveCursoFaltas, moduloCodigo: string): string {
  return `faltas_modulo:${claveConfig(clave)}:${moduloCodigo}`
}

function moduloConfigurado(
  db: Bd,
  clave: ClaveCursoFaltas,
  moduloCodigo: string,
  predeterminado: {
    nombre: string
    siglas: string | null
    horas: number | null
    grupoId: number | null
  }
): ConfigModuloFaltas {
  const fila = db
    .prepare('SELECT valor FROM config WHERE clave = ?')
    .get(configModulo(clave, moduloCodigo)) as { valor: string } | undefined
  let guardado: { nombreInforme?: string; horas?: number } = {}
  if (fila) {
    try {
      guardado = JSON.parse(fila.valor) as { nombreInforme?: string; horas?: number }
    } catch {
      guardado = {}
    }
  }
  return {
    moduloCodigo,
    grupoId: predeterminado.grupoId,
    nombre: predeterminado.nombre,
    nombreInforme: guardado.nombreInforme || predeterminado.siglas || moduloCodigo,
    horas: Number(guardado.horas) || predeterminado.horas || 0
  }
}

function modulosDeCurso(
  db: Bd,
  clave: ClaveCursoFaltas,
  grupos: FilaGrupo[]
): ConfigModuloFaltas[] {
  const modulos = db
    .prepare(
      `SELECT codigo, nombre, siglas, horas_minimas_boe
         FROM modulos
        WHERE ciclo_id = ? AND (curso = ? OR curso IS NULL)
        ORDER BY curso, codigo`
    )
    .all(clave.cicloId, clave.curso) as {
    codigo: string
    nombre: string
    siglas: string | null
    horas_minimas_boe: number | null
  }[]

  return modulos.map((modulo) => {
    const grupo = grupos.find((item) => item.modulo_codigo === modulo.codigo)
    return moduloConfigurado(db, clave, modulo.codigo, {
      nombre: modulo.nombre,
      siglas: modulo.siglas,
      horas: modulo.horas_minimas_boe,
      grupoId: grupo?.id ?? null
    })
  })
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
    modulos: modulosDeCurso(db, clave, grupos),
    alumnos: alumnosDe(db, clave),
    ...ajustes
  }
}

export function guardarModuloFaltas(
  db: Bd,
  clave: ClaveCursoFaltas,
  moduloCodigo: string,
  nombreInforme: string,
  horas: number
): void {
  const modulo = db
    .prepare('SELECT 1 FROM modulos WHERE codigo = ? AND ciclo_id = ?')
    .get(moduloCodigo, clave.cicloId)
  if (!modulo) throw new Error('El módulo no pertenece al ciclo del curso.')
  if (!Number.isFinite(horas) || horas <= 0) throw new Error('Indica las horas del módulo.')
  db.prepare(
    `INSERT INTO config (clave, valor) VALUES (?, ?)
     ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`
  ).run(
    configModulo(clave, moduloCodigo),
    JSON.stringify({ nombreInforme: nombreInforme.trim(), horas })
  )
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
  const modulosValidos = new Set(curso.modulos.map((modulo) => modulo.moduloCodigo))
  for (const modulo of datos.modulos) {
    if (!modulosValidos.has(modulo.moduloCodigo)) {
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
