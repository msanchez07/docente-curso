import { beforeEach, describe, expect, it } from 'vitest'
import type { Ciclo, Grupo } from '@shared/tipos'
import { abrirBd, type Bd } from '../src/main/db/conexion'
import { sembrarCiclos } from '../src/main/db/seed'
import {
  aplicarModeloATodos,
  guardarModeloDeGrupo,
  obtenerModelo
} from '../src/main/db/repositorios/evaluacion'
import { crearGrupo } from '../src/main/db/repositorios/grupos'
import { modeloPorDefecto } from '../src/main/domain/modelo'

const ciclo: Ciclo = {
  id: 'test',
  denominacion: 'Ciclo de prueba',
  nivel: 'FP',
  familia_profesional: 'Informática',
  duracion_horas: 2000,
  ects: 120,
  rd: 'RD de prueba',
  boe_url: 'https://www.boe.es/',
  modulos: [
    {
      codigo: '0001',
      nombre: 'Módulo uno',
      ects: 10,
      horas_minimas_boe: 100,
      ra: [
        { codigo: 'RA1', numero: 1, descripcion: 'RA', ce: [{ codigo: 'a', descripcion: 'CE' }] }
      ]
    }
  ]
}

let db: Bd
let presencial: Grupo
let semipresencial: Grupo

beforeEach(() => {
  db = abrirBd(':memory:')
  sembrarCiclos(db, [ciclo])
  presencial = crearGrupo(db, {
    modulo_codigo: '0001',
    nombre: 'Presencial',
    modalidad: 'presencial'
  })
  semipresencial = crearGrupo(db, {
    modulo_codigo: '0001',
    nombre: 'Semipresencial',
    modalidad: 'semipresencial'
  })
})

describe('modelo de evaluación por grupo', () => {
  it('el mismo módulo en dos modalidades tiene dos grupos', () => {
    expect(presencial.modulo_codigo).toBe('0001')
    expect(semipresencial.modulo_codigo).toBe('0001')
    expect(presencial.id).not.toBe(semipresencial.id)
  })

  it('cada grupo tiene su propio modelo', () => {
    guardarModeloDeGrupo(db, semipresencial.id, modeloPorDefecto('semipresencial'))

    expect(obtenerModelo(db, semipresencial.id).categorias.map((c) => c.id)).toEqual([
      'examenes',
      'actividades'
    ])
    // El otro grupo del MISMO módulo no se ve afectado.
    expect(obtenerModelo(db, presencial.id).categorias.map((c) => c.id)).toEqual([
      'examenes',
      'actividades',
      'proyectos'
    ])
  })

  it('sin modelo propio, se usa la plantilla de la modalidad del grupo', () => {
    expect(obtenerModelo(db, semipresencial.id).categorias.map((c) => c.id)).toEqual([
      'examenes',
      'actividades'
    ])
    expect(obtenerModelo(db, presencial.id).categorias.map((c) => c.id)).toEqual([
      'examenes',
      'actividades',
      'proyectos'
    ])
  })

  it('copia el modelo a todos los grupos del ciclo', () => {
    const total = aplicarModeloATodos(db, 'test', modeloPorDefecto('semipresencial'))
    expect(total).toBe(2)
    expect(obtenerModelo(db, presencial.id).categorias.map((c) => c.id)).toEqual([
      'examenes',
      'actividades'
    ])
    expect(obtenerModelo(db, semipresencial.id).categorias.map((c) => c.id)).toEqual([
      'examenes',
      'actividades'
    ])
  })

  it('guarda pesos de categoría propios de un trimestre', () => {
    const modelo = modeloPorDefecto('presencial')
    modelo.avaluaciones[0] = {
      ...modelo.avaluaciones[0],
      pesosCategorias: { examenes: 50, actividades: 0, proyectos: 50 }
    }
    guardarModeloDeGrupo(db, presencial.id, modelo)
    expect(obtenerModelo(db, presencial.id).avaluaciones[0].pesosCategorias).toEqual({
      examenes: 50,
      actividades: 0,
      proyectos: 50
    })
  })

  it('rechaza pesos propios de un trimestre que no suman 100', () => {
    const invalido = modeloPorDefecto('presencial')
    invalido.avaluaciones[0] = {
      ...invalido.avaluaciones[0],
      pesosCategorias: { examenes: 50, actividades: 20, proyectos: 0 }
    }
    expect(() => guardarModeloDeGrupo(db, presencial.id, invalido)).toThrow(
      /pesos de la avaluación/i
    )
  })

  it('rechaza un modelo con pesos que no suman 100', () => {
    const invalido = modeloPorDefecto('presencial')
    invalido.categorias = [{ id: 'x', nombre: 'X', peso: 10 }]
    expect(() => guardarModeloDeGrupo(db, presencial.id, invalido)).toThrow()
  })
})
