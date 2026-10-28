import { beforeEach, describe, expect, it } from 'vitest'
import type { Ciclo } from '@shared/tipos'
import { cursoAcademicoActual } from '@shared/curso-academico'
import { abrirBd, type Bd } from '../src/main/db/conexion'
import { sembrarCiclos } from '../src/main/db/seed'
import {
  actualizarCursoAcademico,
  asegurarCursoActual,
  borrarCursoAcademico,
  crearCursoAcademico,
  listarCursosAcademicos
} from '../src/main/db/repositorios/cursos-academicos'
import {
  actualizarGrupoClase,
  crearGrupoClase,
  listarGruposClase
} from '../src/main/db/repositorios/grupos-clase'

const cicloPrueba: Ciclo = {
  id: 'daw',
  denominacion: 'Desarrollo de Aplicaciones Web',
  nivel: 'Formación Profesional de Grado Superior',
  familia_profesional: 'Informática y Comunicaciones',
  duracion_horas: 2000,
  ects: 120,
  rd: 'RD de prueba',
  boe_url: 'https://www.boe.es/',
  modulos: [
    {
      codigo: '0613',
      nombre: 'Desarrollo Web en entorno servidor',
      siglas: 'DWES',
      curso: '2',
      ects: 12,
      horas_minimas_boe: 100,
      ra: []
    }
  ]
}

let db: Bd

beforeEach(() => {
  db = abrirBd(':memory:')
  sembrarCiclos(db, [cicloPrueba])
})

describe('cursos académicos', () => {
  it('crea una sola vez el curso derivado de la fecha', () => {
    const actual = asegurarCursoActual(db)
    const esperado = cursoAcademicoActual()

    expect(actual.nombre).toBe(esperado.nombre)
    expect(actual.inicio).toBe(esperado.inicio)
    expect(actual.fin).toBe(esperado.fin)
    expect(asegurarCursoActual(db).id).toBe(actual.id)
    expect(listarCursosAcademicos(db)).toHaveLength(1)
  })

  it('no permite crear un curso distinto del actual', () => {
    const actual = cursoAcademicoActual()
    const anterior = `${actual.inicio - 1}/${actual.fin - 1}`

    expect(() => crearCursoAcademico(db, { nombre: anterior })).toThrow(/curso académico actual/)
    expect(() => crearCursoAcademico(db, { nombre: actual.nombre })).toThrow(/Ya existe/)
  })

  it('permite renombrar un curso y borrar uno anterior vacío', () => {
    const actual = asegurarCursoActual(db)
    const renombrado = actualizarCursoAcademico(db, actual.id, { nombre: 'Curso actual' })
    expect(renombrado?.nombre).toBe('Curso actual')

    const anterior = db
      .prepare('INSERT INTO cursos_academicos (nombre, inicio, fin, actual) VALUES (?, ?, ?, 0)')
      .run('2024/2025', 2024, 2025)
    const idAnterior = Number(anterior.lastInsertRowid)

    expect(borrarCursoAcademico(db, idAnterior)).toBe(true)
    expect(borrarCursoAcademico(db, actual.id)).toBe(true)
    expect(listarCursosAcademicos(db)).toHaveLength(0)
  })

  it('recrea el curso actual al crear un grupo si se había borrado', () => {
    const actual = asegurarCursoActual(db)
    expect(borrarCursoAcademico(db, actual.id)).toBe(true)
    expect(listarCursosAcademicos(db)).toHaveLength(0)

    const grupo = crearGrupoClase(db, {
      ciclo_id: 'daw',
      curso: '2',
      modalidad: 'presencial',
      modulo_codigo: '0613'
    })
    expect(grupo.curso_academico_nombre).toBe(cursoAcademicoActual().nombre)
    expect(listarCursosAcademicos(db)).toHaveLength(1)
    expect(borrarCursoAcademico(db, grupo.curso_academico_id)).toBe(true)
    expect(listarCursosAcademicos(db)).toHaveLength(0)
    expect(listarGruposClase(db)).toHaveLength(0)
  })

  it('asigna el curso actual al crear un grupo y lo conserva al editarlo', () => {
    const actual = asegurarCursoActual(db)
    const grupo = crearGrupoClase(db, {
      ciclo_id: 'daw',
      curso: '2',
      modalidad: 'presencial',
      modulo_codigo: '0613'
    })

    expect(grupo.curso_academico_id).toBe(actual.id)
    expect(grupo.curso_academico_nombre).toBe(actual.nombre)
    expect(listarGruposClase(db, actual.id)).toHaveLength(1)

    const editado = actualizarGrupoClase(db, grupo.id, {
      curso_academico_id: 999,
      ciclo_id: 'daw',
      curso: '2',
      modalidad: 'semipresencial',
      modulo_codigo: '0613'
    })
    expect(editado?.curso_academico_id).toBe(actual.id)
    expect(editado?.modalidad).toBe('semipresencial')
  })
})
