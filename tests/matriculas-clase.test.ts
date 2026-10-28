import { beforeEach, describe, expect, it } from 'vitest'
import type { Ciclo } from '@shared/tipos'
import { abrirBd, type Bd } from '../src/main/db/conexion'
import { sembrarCiclos } from '../src/main/db/seed'
import { crearGrupoClase, listarGruposClase } from '../src/main/db/repositorios/grupos-clase'
import { importarAlumnosEnGrupoClase } from '../src/main/db/repositorios/matriculas-clase'

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

beforeEach(() => {
  db = abrirBd(':memory:')
  sembrarCiclos(db, [cicloPrueba])
  grupoId = crearGrupoClase(db, {
    ciclo_id: 'daw',
    curso: '2',
    modalidad: 'presencial',
    modulo_codigo: '0613'
  }).id
})

describe('importación de alumnado en un grupo de clase', () => {
  it('crea el alumnado y lo matricula en el grupo', () => {
    const resultado = importarAlumnosEnGrupoClase(
      db,
      grupoId,
      'nombre,apellidos,dni,correo\nAna,García,11111111H,ana@ejemplo.com\nLuis,Pérez,,luis@ejemplo.com'
    )

    expect(resultado).toEqual({ creados: 2, existentes: 0, errores: [] })
    expect(listarGruposClase(db)[0].alumnos).toBe(2)
  })

  it('no duplica al alumnado cuyo DNI ya existe', () => {
    importarAlumnosEnGrupoClase(db, grupoId, 'nombre,apellidos,dni\nAna,García,11111111H')

    const resultado = importarAlumnosEnGrupoClase(
      db,
      grupoId,
      'nombre,apellidos,dni\nAna,García,11111111H'
    )

    expect(resultado.creados).toBe(0)
    expect(resultado.existentes).toBe(1)
    expect(listarGruposClase(db)[0].alumnos).toBe(1)
  })

  it('reconoce por nombre y apellidos si no hay DNI ni correo', () => {
    importarAlumnosEnGrupoClase(db, grupoId, 'nombre,apellidos\nAna,García')

    const resultado = importarAlumnosEnGrupoClase(db, grupoId, 'nombre,apellidos\nAna,García')

    expect(resultado.creados).toBe(0)
    expect(resultado.existentes).toBe(1)
    expect(listarGruposClase(db)[0].alumnos).toBe(1)
  })

  it('separa los errores por fila sin abortar el resto', () => {
    const resultado = importarAlumnosEnGrupoClase(
      db,
      grupoId,
      'nombre,apellidos\n,García\nLuis,Pérez'
    )

    expect(resultado.creados).toBe(1)
    expect(resultado.errores).toHaveLength(1)
    expect(resultado.errores[0]).toMatch(/faltan nombre o apellidos/)
  })

  it('rechaza un grupo inexistente', () => {
    expect(() => importarAlumnosEnGrupoClase(db, 999, 'Ana,García')).toThrow(/no existe/)
  })
})
