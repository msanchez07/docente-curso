import { beforeEach, describe, expect, it } from 'vitest'
import type { Ciclo } from '@shared/tipos'
import { abrirBd, type Bd } from '../src/main/db/conexion'
import { sembrarCiclos } from '../src/main/db/seed'
import { crearGrupoClase } from '../src/main/db/repositorios/grupos-clase'
import {
  guardarProgramacion,
  listarProgramacion
} from '../src/main/db/repositorios/programacion-aula'

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
let otroGrupoId: number

beforeEach(() => {
  db = abrirBd(':memory:')
  sembrarCiclos(db, [cicloPrueba])
  grupoId = crearGrupoClase(db, {
    ciclo_id: 'daw',
    curso: '2',
    modalidad: 'presencial',
    modulo_codigo: '0613'
  }).id
  otroGrupoId = crearGrupoClase(db, {
    ciclo_id: 'daw',
    curso: '2',
    modalidad: 'semipresencial',
    modulo_codigo: '0613'
  }).id
})

describe('programación de aula', () => {
  it('guarda las filas ordenadas por fecha', () => {
    const filas = guardarProgramacion(db, grupoId, [
      {
        fecha: '2026-10-05',
        contenido: 'UD1: introducción',
        desviacion: '',
        observaciones: 'Aula 3'
      },
      {
        fecha: '2026-10-01',
        contenido: 'Presentación',
        desviacion: 'Sin desviación',
        observaciones: ''
      }
    ])

    expect(filas.map((f) => f.fecha)).toEqual(['2026-10-01', '2026-10-05'])
    expect(filas[1].contenido).toBe('UD1: introducción')
    expect(listarProgramacion(db, grupoId)).toHaveLength(2)
    expect(listarProgramacion(db, otroGrupoId)).toHaveLength(0)
  })

  it('permite varias sesiones el mismo día con hora y orden', () => {
    const filas = guardarProgramacion(db, grupoId, [
      {
        fecha: '2026-10-05',
        hora: '09:00',
        orden: 0,
        contenido: 'Primera sesión',
        desviacion: '',
        observaciones: ''
      },
      {
        fecha: '2026-10-05',
        hora: '11:00',
        orden: 1,
        contenido: 'Segunda sesión',
        desviacion: '',
        observaciones: ''
      }
    ])
    expect(filas).toHaveLength(2)
    expect(filas.map((fila) => fila.hora)).toEqual(['09:00', '11:00'])
    expect(listarProgramacion(db, grupoId)).toHaveLength(2)
  })

  it('actualiza, añade y borra según la tabla enviada', () => {
    const inicial = guardarProgramacion(db, grupoId, [
      { fecha: '2026-10-01', contenido: 'Presentación', desviacion: '', observaciones: '' },
      { fecha: '2026-10-05', contenido: 'UD1', desviacion: '', observaciones: '' }
    ])

    const resultado = guardarProgramacion(db, grupoId, [
      {
        id: inicial[0].id,
        fecha: '2026-10-02',
        contenido: 'Presentación (corregida)',
        desviacion: 'Se retrasó',
        observaciones: ''
      },
      { fecha: '2026-10-08', contenido: 'UD2', desviacion: '', observaciones: '' }
    ])

    expect(resultado).toHaveLength(2)
    expect(resultado.some((f) => f.fecha === '2026-10-05')).toBe(false)
    expect(resultado.find((f) => f.id === inicial[0].id)?.contenido).toBe(
      'Presentación (corregida)'
    )
    expect(resultado.some((f) => f.fecha === '2026-10-08')).toBe(true)
  })

  it('vacía la tabla si se envía una lista vacía', () => {
    guardarProgramacion(db, grupoId, [
      { fecha: '2026-10-01', contenido: 'Presentación', desviacion: '', observaciones: '' }
    ])

    expect(guardarProgramacion(db, grupoId, [])).toEqual([])
    expect(listarProgramacion(db, grupoId)).toEqual([])
  })

  it('rechaza fechas imposibles', () => {
    expect(() =>
      guardarProgramacion(db, grupoId, [
        { fecha: '2026-02-31', contenido: 'X', desviacion: '', observaciones: '' }
      ])
    ).toThrow(/fecha no es válida/)
  })

  it('rechaza un grupo inexistente', () => {
    expect(() => guardarProgramacion(db, 999, [])).toThrow(/no existe/)
  })
})
