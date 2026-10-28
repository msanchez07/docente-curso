/**
 * Repositorio de grupos de clase (FP).
 *
 * Un grupo de clase es la clase de FP en la que se imparte un módulo:
 * ciclo + curso + modalidad + módulo. El nombre se genera a partir de esos
 * datos (con las siglas del módulo) y no se edita a mano: así no puede
 * contradecirlos.
 */
import type { Bd } from '../conexion'
import {
  CURSOS,
  MODALIDADES,
  contarBloques,
  nombreGrupoClase,
  normalizarBloquesSemana,
  normalizarDiasSemana,
  normalizarTutoriasSemana,
  siglasDesdeNombre,
  tutoriasDesdeBloques
} from '@shared/grupos'
import { asegurarCursoActual, obtenerCursoActual } from './cursos-academicos'
import type {
  BloquesSemana,
  DiasSemana,
  GrupoClase,
  GrupoClaseEntrada,
  TutoriasSemana
} from '@shared/tipos'

const CAMPOS = `gc.id, gc.curso_academico_id, ca.nombre AS curso_academico_nombre,
                gc.ciclo_id, c.denominacion AS ciclo_nombre, gc.curso,
                gc.modalidad, gc.modulo_codigo, m.nombre AS modulo_nombre,
                m.siglas AS modulo_siglas, gc.nombre, gc.dias_semana, gc.tutorias_semana,
                gc.bloques_semana, gc.creado_en,
                (SELECT COUNT(*) FROM matriculas_clase mc
                  WHERE mc.grupo_clase_id = gc.id) AS alumnos,
                (SELECT COUNT(*) FROM resultados_aprendizaje r
                  WHERE r.modulo_codigo = gc.modulo_codigo) AS ra,
                (SELECT COUNT(*) FROM criterios_evaluacion ce
                   JOIN resultados_aprendizaje r2 ON r2.id = ce.ra_id
                  WHERE r2.modulo_codigo = gc.modulo_codigo) AS ce,
                EXISTS (SELECT 1 FROM criterios_grupo_clase cg
                         WHERE cg.grupo_clase_id = gc.id) AS criterios`

const DESDE = `FROM grupos_clase gc
               JOIN cursos_academicos ca ON ca.id = gc.curso_academico_id
               JOIN ciclos c ON c.id = gc.ciclo_id
               JOIN modulos m ON m.codigo = gc.modulo_codigo`

type FilaGrupo = Omit<
  GrupoClase,
  'modulo_siglas' | 'criterios' | 'dias_semana' | 'tutorias_semana' | 'bloques_semana'
> & {
  modulo_siglas: string | null
  criterios: number
  dias_semana: string | null
  tutorias_semana: string | null
  bloques_semana: string | null
}

interface ModuloFila {
  ciclo_id: string
  nombre: string
  siglas: string | null
  curso: string | null
}

interface Validado {
  datos: GrupoClaseEntrada
  modulo: ModuloFila
}

function siglasDe(modulo: ModuloFila): string {
  return modulo.siglas?.trim() || siglasDesdeNombre(modulo.nombre)
}

function diasSemanaDe(texto: string | null): DiasSemana {
  if (!texto) return {}
  try {
    return normalizarDiasSemana(JSON.parse(texto))
  } catch {
    return {}
  }
}

function tutoriasDe(texto: string | null): TutoriasSemana {
  if (!texto) return {}
  try {
    return normalizarTutoriasSemana(JSON.parse(texto))
  } catch {
    return {}
  }
}

function bloquesDe(texto: string | null): BloquesSemana {
  if (!texto) return {}
  try {
    return normalizarBloquesSemana(JSON.parse(texto))
  } catch {
    return {}
  }
}

function normalizar(fila: FilaGrupo): GrupoClase {
  return {
    ...fila,
    modulo_siglas: fila.modulo_siglas?.trim() || siglasDesdeNombre(fila.modulo_nombre),
    criterios: fila.criterios === 1,
    dias_semana: diasSemanaDe(fila.dias_semana),
    tutorias_semana: tutoriasDe(fila.tutorias_semana),
    bloques_semana: bloquesDe(fila.bloques_semana)
  }
}

function validar(db: Bd, entrada: GrupoClaseEntrada): Validado {
  if (!entrada.ciclo_id) throw new Error('Hay que indicar el ciclo.')
  if (!CURSOS.includes(entrada.curso)) throw new Error('El curso debe ser 1º o 2º.')
  if (!MODALIDADES.includes(entrada.modalidad)) throw new Error('Modalidad no válida.')
  if (!entrada.modulo_codigo) throw new Error('Hay que indicar el módulo.')

  const cursoAcademicoId = entrada.curso_academico_id ?? obtenerCursoActual(db)?.id
  if (!cursoAcademicoId) throw new Error('No hay ningún curso académico definido.')
  const cursoAcademico = db
    .prepare('SELECT 1 FROM cursos_academicos WHERE id = ?')
    .get(cursoAcademicoId)
  if (!cursoAcademico) throw new Error('El curso académico indicado no existe.')

  const modulo = db
    .prepare('SELECT ciclo_id, nombre, siglas, curso FROM modulos WHERE codigo = ?')
    .get(entrada.modulo_codigo) as ModuloFila | undefined
  if (!modulo) throw new Error('El módulo indicado no existe.')
  if (modulo.ciclo_id !== entrada.ciclo_id) {
    throw new Error('El módulo no pertenece al ciclo indicado.')
  }
  if (modulo.curso && modulo.curso !== entrada.curso) {
    throw new Error(`El módulo ${siglasDe(modulo)} es de ${modulo.curso}º curso.`)
  }
  const bloquesSemana = normalizarBloquesSemana(entrada.bloques_semana)
  return {
    datos: {
      ...entrada,
      curso_academico_id: cursoAcademicoId,
      dias_semana:
        Object.keys(bloquesSemana).length > 0
          ? contarBloques(bloquesSemana)
          : normalizarDiasSemana(entrada.dias_semana),
      tutorias_semana:
        Object.keys(bloquesSemana).length > 0
          ? tutoriasDesdeBloques(bloquesSemana)
          : normalizarTutoriasSemana(entrada.tutorias_semana),
      bloques_semana: bloquesSemana
    },
    modulo
  }
}

function nombreDe(validado: Validado): string {
  return nombreGrupoClase(
    validado.datos.ciclo_id,
    validado.datos.curso,
    validado.datos.modalidad,
    siglasDe(validado.modulo)
  )
}

export function listarGruposClase(db: Bd, cursoAcademicoId?: number): GrupoClase[] {
  const filtro = cursoAcademicoId ? 'WHERE gc.curso_academico_id = ?' : ''
  const filas = db
    .prepare(
      `SELECT ${CAMPOS}
         ${DESDE}
         ${filtro}
        ORDER BY ca.actual DESC, ca.nombre DESC, c.denominacion, gc.curso,
                 gc.modulo_codigo, gc.modalidad`
    )
    .all(...(cursoAcademicoId ? [cursoAcademicoId] : [])) as FilaGrupo[]
  return filas.map(normalizar)
}

export function obtenerGrupoClase(db: Bd, id: number): GrupoClase | null {
  const fila = db.prepare(`SELECT ${CAMPOS} ${DESDE} WHERE gc.id = ?`).get(id) as
    FilaGrupo | undefined
  return fila ? normalizar(fila) : null
}

function existeCombinacion(
  db: Bd,
  entrada: GrupoClaseEntrada,
  exceptoId: number | null = null
): boolean {
  const fila = db
    .prepare(
      `SELECT 1
         FROM grupos_clase
        WHERE curso_academico_id = @curso_academico_id
          AND ciclo_id = @ciclo_id AND curso = @curso AND modalidad = @modalidad
          AND modulo_codigo = @modulo_codigo
          AND (@exceptoId IS NULL OR id <> @exceptoId)`
    )
    .get({ ...entrada, exceptoId })
  return fila !== undefined
}

export function crearGrupoClase(db: Bd, entrada: GrupoClaseEntrada): GrupoClase {
  const curso = asegurarCursoActual(db)
  const validado = validar(db, { ...entrada, curso_academico_id: curso.id })
  if (existeCombinacion(db, validado.datos)) {
    throw new Error(`Ya existe el grupo «${nombreDe(validado)}».`)
  }
  const resultado = db
    .prepare(
      `INSERT INTO grupos_clase
         (curso_academico_id, ciclo_id, curso, modalidad, modulo_codigo, nombre,
          dias_semana, tutorias_semana, bloques_semana)
       VALUES (@curso_academico_id, @ciclo_id, @curso, @modalidad, @modulo_codigo, @nombre,
               @dias_semana, @tutorias_semana, @bloques_semana)`
    )
    .run({
      ...validado.datos,
      nombre: nombreDe(validado),
      dias_semana: JSON.stringify(validado.datos.dias_semana ?? {}),
      tutorias_semana: JSON.stringify(validado.datos.tutorias_semana ?? {}),
      bloques_semana: JSON.stringify(validado.datos.bloques_semana ?? {})
    })
  return obtenerGrupoClase(db, Number(resultado.lastInsertRowid))!
}

export function actualizarGrupoClase(
  db: Bd,
  id: number,
  entrada: GrupoClaseEntrada
): GrupoClase | null {
  const grupoActual = obtenerGrupoClase(db, id)
  if (!grupoActual) return null
  const validado = validar(db, {
    ...entrada,
    curso_academico_id: grupoActual.curso_academico_id,
    dias_semana: entrada.dias_semana === undefined ? grupoActual.dias_semana : entrada.dias_semana,
    tutorias_semana:
      entrada.tutorias_semana === undefined ? grupoActual.tutorias_semana : entrada.tutorias_semana
  })
  if (existeCombinacion(db, validado.datos, id)) {
    throw new Error(`Ya existe el grupo «${nombreDe(validado)}».`)
  }
  db.prepare(
    `UPDATE grupos_clase
        SET curso_academico_id = @curso_academico_id,
            ciclo_id = @ciclo_id, curso = @curso, modalidad = @modalidad,
            modulo_codigo = @modulo_codigo, nombre = @nombre,
            dias_semana = @dias_semana, tutorias_semana = @tutorias_semana,
            bloques_semana = @bloques_semana
      WHERE id = @id`
  ).run({
    ...validado.datos,
    nombre: nombreDe(validado),
    dias_semana: JSON.stringify(validado.datos.dias_semana ?? {}),
    tutorias_semana: JSON.stringify(validado.datos.tutorias_semana ?? {}),
    bloques_semana: JSON.stringify(validado.datos.bloques_semana ?? {}),
    id
  })
  return obtenerGrupoClase(db, id)
}

export function borrarGrupoClase(db: Bd, id: number): boolean {
  return db.prepare('DELETE FROM grupos_clase WHERE id = ?').run(id).changes > 0
}
