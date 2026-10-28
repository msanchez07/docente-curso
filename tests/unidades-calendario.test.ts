import { beforeEach, describe, expect, it } from 'vitest'
import type { Ciclo } from '@shared/tipos'
import { abrirBd, type Bd } from '../src/main/db/conexion'
import { sembrarCiclos } from '../src/main/db/seed'
import { crearGrupoClase } from '../src/main/db/repositorios/grupos-clase'
import {
  guardarProgramacion,
  listarProgramacion
} from '../src/main/db/repositorios/programacion-aula'
import {
  actualizarUnidadProgramacion,
  borrarUnidadProgramacion,
  crearUnidadProgramacion,
  importarUnidadesProgramacion,
  listarUnidadesProgramacion
} from '../src/main/db/repositorios/unidades-programacion'
import {
  importarCalendarioEscolar,
  listarCalendarioEscolar
} from '../src/main/db/repositorios/calendario-escolar'

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
let cursoId: number

beforeEach(() => {
  db = abrirBd(':memory:')
  sembrarCiclos(db, [cicloPrueba])
  const grupo = crearGrupoClase(db, {
    ciclo_id: 'daw',
    curso: '2',
    modalidad: 'presencial',
    modulo_codigo: '0613'
  })
  grupoId = grupo.id
  cursoId = grupo.curso_academico_id
})

describe('unidades de programación', () => {
  it('crea una unidad con RA y asigna sesiones', () => {
    const unidad = crearUnidadProgramacion(db, grupoId, {
      codigo: 'UD1',
      nombre: 'Introducción',
      fecha_inicio: '2026-09-15',
      fecha_fin: '2026-10-15',
      contenidos: 'Entorno y primeros pasos',
      ra_codigos: ['RA1', 'RA2']
    })
    expect(unidad.ra_codigos).toEqual(['RA1', 'RA2'])

    guardarProgramacion(db, grupoId, [
      {
        fecha: '2026-09-16',
        contenido: 'Presentación',
        desviacion: '',
        observaciones: '',
        unidad_id: unidad.id
      }
    ])

    const lista = listarUnidadesProgramacion(db, grupoId)
    expect(lista[0].sesiones).toHaveLength(1)
    expect(lista[0].sesiones[0].unidad_id).toBe(unidad.id)
  })

  it('importa unidades con sus sesiones', () => {
    const resultado = importarUnidadesProgramacion(
      db,
      grupoId,
      JSON.stringify({
        unidades: [
          {
            codigo: 'UD1',
            nombre: 'Importada',
            ra_codigos: ['RA1'],
            sesiones: [{ fecha: '2026-09-16', contenido: 'Sesión importada' }]
          }
        ]
      })
    )
    expect(resultado.creados).toBe(1)
    const unidad = listarUnidadesProgramacion(db, grupoId)[0]
    expect(unidad.sesiones).toHaveLength(1)
    expect(unidad.sesiones[0].contenido).toBe('Sesión importada')
  })

  it('actualiza y borra la unidad sin perder la sesión', () => {
    const unidad = crearUnidadProgramacion(db, grupoId, {
      nombre: 'UD1',
      ra_codigos: ['RA1']
    })
    const actualizada = actualizarUnidadProgramacion(db, unidad.id, {
      nombre: 'UD1 revisada',
      ra_codigos: ['RA1', 'RA3']
    })
    expect(actualizada?.nombre).toBe('UD1 revisada')
    expect(actualizada?.ra_codigos).toEqual(['RA1', 'RA3'])

    guardarProgramacion(db, grupoId, [
      {
        fecha: '2026-09-16',
        contenido: 'Sesión',
        desviacion: '',
        observaciones: '',
        unidad_id: unidad.id
      }
    ])
    expect(borrarUnidadProgramacion(db, unidad.id)).toBe(true)
    expect(listarProgramacion(db, grupoId)[0].unidad_id).toBeNull()
  })
})

describe('calendario escolar', () => {
  it('importa y sustituye los días del curso', () => {
    const resultado = importarCalendarioEscolar(
      db,
      cursoId,
      JSON.stringify([
        { fecha: '2026-09-15', tipo: 'lectivo', descripcion: 'Inicio' },
        { fecha: '2026-10-12', tipo: 'festivo' }
      ])
    )
    expect(resultado.creados).toBe(2)
    expect(listarCalendarioEscolar(db, cursoId)).toHaveLength(2)

    const segundo = importarCalendarioEscolar(
      db,
      cursoId,
      JSON.stringify([{ fecha: '2026-12-25', tipo: 'vacaciones' }])
    )
    expect(segundo.creados).toBe(1)
    expect(listarCalendarioEscolar(db, cursoId)[0].fecha).toBe('2026-12-25')
  })
})
