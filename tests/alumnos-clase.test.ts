import { beforeEach, describe, expect, it } from 'vitest'
import type { Ciclo } from '@shared/tipos'
import { abrirBd, type Bd } from '../src/main/db/conexion'
import { sembrarCiclos } from '../src/main/db/seed'
import { crearGrupoClase } from '../src/main/db/repositorios/grupos-clase'
import {
  activarAlumnoClase,
  crearAlumnoEnGrupoClase,
  desmatricularDeGrupoClase,
  listarAlumnosDeGrupoClase,
  obtenerAlumnoClase
} from '../src/main/db/repositorios/alumnos-clase'

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
let presencial: number
let semipresencial: number

beforeEach(() => {
  db = abrirBd(':memory:')
  sembrarCiclos(db, [cicloPrueba])
  presencial = crearGrupoClase(db, {
    ciclo_id: 'daw',
    curso: '2',
    modalidad: 'presencial',
    modulo_codigo: '0613'
  }).id
  semipresencial = crearGrupoClase(db, {
    ciclo_id: 'daw',
    curso: '2',
    modalidad: 'semipresencial',
    modulo_codigo: '0613'
  }).id
})

describe('alumnado por grupo de clase', () => {
  it('da de alta y lista por apellidos', () => {
    crearAlumnoEnGrupoClase(db, presencial, {
      nombre: 'Luis',
      apellidos: 'Pérez',
      dni: '22222222J'
    })
    crearAlumnoEnGrupoClase(db, presencial, {
      nombre: 'Ana',
      apellidos: 'García',
      dni: '11111111H'
    })

    expect(listarAlumnosDeGrupoClase(db, presencial).map((a) => a.apellidos)).toEqual([
      'García',
      'Pérez'
    ])
  })

  it('no duplica por DNI y lo matricula en el nuevo grupo', () => {
    const primero = crearAlumnoEnGrupoClase(db, presencial, {
      nombre: 'Ana',
      apellidos: 'García',
      dni: '11111111H'
    })
    const segundo = crearAlumnoEnGrupoClase(db, semipresencial, {
      nombre: 'Ana',
      apellidos: 'García',
      dni: '11111111H'
    })

    expect(primero.creado).toBe(true)
    expect(segundo.creado).toBe(false)
    expect(segundo.alumno.id).toBe(primero.alumno.id)
    expect(segundo.alumno.grupos_clase).toEqual([presencial, semipresencial])
    expect(listarAlumnosDeGrupoClase(db, semipresencial)).toHaveLength(1)
  })

  it('reconoce por nombre y apellidos si no hay DNI ni correo', () => {
    const primero = crearAlumnoEnGrupoClase(db, presencial, {
      nombre: 'Luis',
      apellidos: 'Pérez'
    })
    const segundo = crearAlumnoEnGrupoClase(db, presencial, {
      nombre: 'Luis',
      apellidos: 'Pérez'
    })

    expect(segundo.creado).toBe(false)
    expect(segundo.alumno.id).toBe(primero.alumno.id)
  })

  it('desactiva sin desmatricular y reactiva', () => {
    const alta = crearAlumnoEnGrupoClase(db, presencial, {
      nombre: 'Ana',
      apellidos: 'García'
    })

    const inactivo = activarAlumnoClase(db, alta.alumno.id, false)
    expect(inactivo?.activo).toBe(false)
    expect(listarAlumnosDeGrupoClase(db, presencial)).toHaveLength(1)

    const activo = activarAlumnoClase(db, alta.alumno.id, true)
    expect(activo?.activo).toBe(true)
  })

  it('quita del grupo sin borrar al alumno', () => {
    const alta = crearAlumnoEnGrupoClase(db, presencial, {
      nombre: 'Ana',
      apellidos: 'García'
    })

    expect(desmatricularDeGrupoClase(db, presencial, alta.alumno.id)).toBe(true)
    expect(listarAlumnosDeGrupoClase(db, presencial)).toHaveLength(0)
    expect(obtenerAlumnoClase(db, alta.alumno.id)?.grupos_clase).toEqual([])
  })

  it('rechaza un grupo inexistente', () => {
    expect(() => crearAlumnoEnGrupoClase(db, 999, { nombre: 'Ana', apellidos: 'García' })).toThrow(
      /no existe/
    )
  })
})
