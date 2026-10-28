import { beforeEach, describe, expect, it } from 'vitest'
import type { Ciclo } from '@shared/tipos'
import { modeloPorDefecto } from '@shared/modelo'
import { abrirBd, type Bd } from '../src/main/db/conexion'
import { sembrarCiclos } from '../src/main/db/seed'
import { crearGrupoClase } from '../src/main/db/repositorios/grupos-clase'
import { guardarCriterios } from '../src/main/db/repositorios/criterios-grupo'
import { crearAlumnoEnGrupoClase } from '../src/main/db/repositorios/alumnos-clase'
import { bloquearEntregaClase, crearEntregaClase } from '../src/main/db/repositorios/entregas-clase'
import { guardarNotasClase, listarNotasClase } from '../src/main/db/repositorios/notas-clase'

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
let entregaId: number
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
  guardarCriterios(db, grupoId, modeloPorDefecto('presencial'))
  alumnoId = crearAlumnoEnGrupoClase(db, grupoId, {
    nombre: 'Ana',
    apellidos: 'García'
  }).alumno.id
  otroAlumnoId = crearAlumnoEnGrupoClase(db, grupoId, {
    nombre: 'Luis',
    apellidos: 'Pérez'
  }).alumno.id
  entregaId = crearEntregaClase(db, grupoId, {
    titulo: 'Examen AV1',
    avaluacion_id: 'AV1',
    categoria_id: 'examenes',
    ce_ids: []
  }).id
})

describe('notas de entregas por alumno', () => {
  it('guarda, actualiza y borra una nota', () => {
    guardarNotasClase(db, grupoId, alumnoId, [{ entregaId, nota: 7.5 }])
    expect(listarNotasClase(db, grupoId)).toEqual([
      { entrega_id: entregaId, alumno_id: alumnoId, nota: 7.5, observaciones: null }
    ])

    guardarNotasClase(db, grupoId, alumnoId, [{ entregaId, nota: 9 }])
    expect(listarNotasClase(db, grupoId)[0].nota).toBe(9)

    guardarNotasClase(db, grupoId, alumnoId, [{ entregaId, nota: null }])
    expect(listarNotasClase(db, grupoId)).toEqual([])
  })

  it('guarda decimales y anotaciones de texto', () => {
    guardarNotasClase(db, grupoId, alumnoId, [
      { entregaId, nota: 7.75, observaciones: '  Buen trabajo, revisa el punto 3.  ' }
    ])

    const notas = listarNotasClase(db, grupoId)
    expect(notas[0].nota).toBe(7.75)
    expect(notas[0].observaciones).toBe('Buen trabajo, revisa el punto 3.')

    guardarNotasClase(db, grupoId, alumnoId, [
      { entregaId, nota: null, observaciones: 'Solo anotación' }
    ])
    expect(listarNotasClase(db, grupoId)[0]).toMatchObject({
      nota: null,
      observaciones: 'Solo anotación'
    })

    guardarNotasClase(db, grupoId, alumnoId, [{ entregaId, nota: null, observaciones: null }])
    expect(listarNotasClase(db, grupoId)).toEqual([])
  })

  it('no permite cambiar notas de una entrega bloqueada', () => {
    guardarNotasClase(db, grupoId, alumnoId, [{ entregaId, nota: 8 }])
    bloquearEntregaClase(db, entregaId, true)

    expect(() => guardarNotasClase(db, grupoId, alumnoId, [{ entregaId, nota: 9 }])).toThrow(
      /bloqueada/
    )
  })

  it('separa las notas por alumno', () => {
    guardarNotasClase(db, grupoId, alumnoId, [{ entregaId, nota: 8 }])
    guardarNotasClase(db, grupoId, otroAlumnoId, [{ entregaId, nota: 5 }])

    const notas = listarNotasClase(db, grupoId)
    expect(notas).toHaveLength(2)
    expect(notas.find((n) => n.alumno_id === alumnoId)?.nota).toBe(8)
    expect(notas.find((n) => n.alumno_id === otroAlumnoId)?.nota).toBe(5)
  })

  it('rechaza notas fuera de rango', () => {
    expect(() => guardarNotasClase(db, grupoId, alumnoId, [{ entregaId, nota: 11 }])).toThrow(
      /entre 0 y 10/
    )
  })

  it('rechaza un alumno no matriculado', () => {
    expect(() => guardarNotasClase(db, grupoId, 999, [{ entregaId, nota: 5 }])).toThrow(
      /no está matriculado/
    )
  })
})
