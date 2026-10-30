import { beforeEach, describe, expect, it } from 'vitest'
import type { Ciclo } from '@shared/tipos'
import { abrirBd, type Bd } from '../src/main/db/conexion'
import { sembrarCiclos } from '../src/main/db/seed'
import { crearGrupoClase } from '../src/main/db/repositorios/grupos-clase'
import { crearAlumnoEnGrupoClase } from '../src/main/db/repositorios/alumnos-clase'
import {
  guardarAjustesFaltas,
  guardarFilasFaltas,
  obtenerFaltas
} from '../src/main/db/repositorios/faltas'

const ciclo: Ciclo = {
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

beforeEach(() => {
  db = abrirBd(':memory:')
  sembrarCiclos(db, [ciclo])
  const grupo = crearGrupoClase(db, {
    ciclo_id: 'daw',
    curso: '2',
    modalidad: 'presencial',
    modulo_codigo: '0613'
  })
  grupoId = grupo.id
  const alumno = crearAlumnoEnGrupoClase(db, grupo.id, {
    nombre: 'Ana',
    apellidos: 'García',
    dni: '11111111H'
  })
  alumnoId = alumno.alumno.id
})

describe('control de faltas', () => {
  it('parte de las horas del módulo y permite guardar ajustes', () => {
    const inicial = obtenerFaltas(db, grupoId)
    expect(inicial.ajustes.horas).toBe(100)
    expect(inicial.ajustes.codigoInforme).toBe('DWES')

    const actualizado = guardarAjustesFaltas(db, grupoId, {
      ...inicial.ajustes,
      limite: 10,
      incluirJustificadas: true
    })
    expect(actualizado.ajustes.limite).toBe(10)
    expect(actualizado.ajustes.incluirJustificadas).toBe(true)
  })

  it('guarda los totales por alumno y los devuelve en el listado', () => {
    const datos = guardarFilasFaltas(db, grupoId, [{ alumnoId, faltas: 4, justificadas: 2 }])
    expect(datos.filas[0].faltas).toBe(4)
    expect(datos.filas[0].justificadas).toBe(2)
    expect(obtenerFaltas(db, grupoId).filas[0].faltas).toBe(4)
  })
})
