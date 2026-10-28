import { beforeEach, describe, expect, it } from 'vitest'
import type { Ciclo } from '@shared/tipos'
import { abrirBd, type Bd } from '../src/main/db/conexion'
import { sembrarCiclos } from '../src/main/db/seed'
import { crearGrupoClase } from '../src/main/db/repositorios/grupos-clase'
import { crearAlumnoEnGrupoClase } from '../src/main/db/repositorios/alumnos-clase'
import {
  actualizarFormacionEmpresa,
  borrarFormacionEmpresa,
  crearFormacionEmpresa,
  listarFormacionEmpresa
} from '../src/main/db/repositorios/formacion-empresa'

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
let grupoId: number
let alumnoId: number
let otroAlumnoId: number

beforeEach(() => {
  db = abrirBd(':memory:')
  sembrarCiclos(db, [cicloPrueba])
  grupoId = crearGrupoClase(db, {
    ciclo_id: 'daw',
    curso: '2',
    modalidad: 'presencial',
    modulo_codigo: '0613'
  }).id
  alumnoId = crearAlumnoEnGrupoClase(db, grupoId, {
    nombre: 'Ana',
    apellidos: 'García'
  }).alumno.id
  otroAlumnoId = crearAlumnoEnGrupoClase(db, grupoId, {
    nombre: 'Luis',
    apellidos: 'Pérez'
  }).alumno.id
})

describe('formación en empresa', () => {
  it('exige empresa y fechas válidas', () => {
    expect(() =>
      crearFormacionEmpresa(db, grupoId, alumnoId, {
        fecha_inicio: '2026-11-10',
        fecha_fin: '2026-11-20',
        empresa: ''
      })
    ).toThrow(/empresa/)

    expect(() =>
      crearFormacionEmpresa(db, grupoId, alumnoId, {
        fecha_inicio: '2026-11-20',
        fecha_fin: '2026-11-10',
        empresa: 'Acme'
      })
    ).toThrow(/posterior/)
  })

  it('crea, actualiza y borra periodos', () => {
    const periodo = crearFormacionEmpresa(db, grupoId, alumnoId, {
      fecha_inicio: '2026-11-10',
      fecha_fin: '2026-11-20',
      empresa: 'Acme Web SL',
      horas: 80,
      observaciones: 'Tutor: Ana'
    })

    expect(periodo.empresa).toBe('Acme Web SL')
    expect(periodo.horas).toBe(80)
    expect(listarFormacionEmpresa(db, grupoId, alumnoId)).toHaveLength(1)
    expect(listarFormacionEmpresa(db, grupoId, otroAlumnoId)).toHaveLength(0)

    const actualizado = actualizarFormacionEmpresa(db, periodo.id, {
      fecha_inicio: '2026-11-11',
      fecha_fin: '2026-11-21',
      empresa: 'Acme Web SL',
      horas: 90,
      observaciones: null
    })
    expect(actualizado?.fecha_inicio).toBe('2026-11-11')
    expect(actualizado?.horas).toBe(90)
    expect(actualizado?.observaciones).toBeNull()

    expect(borrarFormacionEmpresa(db, periodo.id)).toBe(true)
    expect(listarFormacionEmpresa(db, grupoId, alumnoId)).toHaveLength(0)
  })

  it('no permite solapar periodos del mismo alumno', () => {
    crearFormacionEmpresa(db, grupoId, alumnoId, {
      fecha_inicio: '2026-11-10',
      fecha_fin: '2026-11-20',
      empresa: 'Acme'
    })

    expect(() =>
      crearFormacionEmpresa(db, grupoId, alumnoId, {
        fecha_inicio: '2026-11-15',
        fecha_fin: '2026-11-25',
        empresa: 'Otra'
      })
    ).toThrow(/solapa/)
  })
})
