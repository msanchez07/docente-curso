import { beforeEach, describe, expect, it } from 'vitest'
import type { Ciclo } from '@shared/tipos'
import {
  contarBloques,
  normalizarBloquesSemana,
  normalizarDiasSemana,
  normalizarTutoriasSemana,
  siglasDesdeNombre
} from '@shared/grupos'
import { abrirBd, type Bd } from '../src/main/db/conexion'
import { sembrarCiclos } from '../src/main/db/seed'
import { crearAlumno } from '../src/main/db/repositorios/alumnos'
import {
  actualizarGrupoClase,
  borrarGrupoClase,
  crearGrupoClase,
  listarGruposClase,
  obtenerGrupoClase
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
      ra: [
        {
          codigo: 'RA1',
          numero: 1,
          descripcion: 'RA uno',
          ce: [
            { codigo: 'a', descripcion: 'CE a' },
            { codigo: 'b', descripcion: 'CE b' }
          ]
        },
        {
          codigo: 'RA2',
          numero: 2,
          descripcion: 'RA dos',
          ce: [{ codigo: 'a', descripcion: 'CE a del RA2' }]
        }
      ]
    },
    {
      codigo: '0487',
      nombre: 'Entornos de desarrollo',
      siglas: 'ED',
      curso: '1',
      ects: 6,
      horas_minimas_boe: 50,
      ra: []
    },
    {
      codigo: '0612',
      nombre: 'Desarrollo Web en entorno cliente',
      siglas: 'DWEC',
      curso: '2',
      ects: 9,
      horas_minimas_boe: 80,
      ra: []
    }
  ]
}

const otroCiclo: Ciclo = {
  ...cicloPrueba,
  id: 'smr',
  denominacion: 'Sistemas Microinformáticos y Redes',
  modulos: []
}

let db: Bd

beforeEach(() => {
  db = abrirBd(':memory:')
  sembrarCiclos(db, [cicloPrueba, otroCiclo])
})

describe('siglas de módulo', () => {
  it('genera las iniciales significativas cuando el módulo no trae siglas', () => {
    expect(siglasDesdeNombre('Desarrollo Web en entorno servidor')).toBe('DWES')
    expect(siglasDesdeNombre('Formación y orientación laboral')).toBe('FOL')
    expect(siglasDesdeNombre('Programación')).toBe('PROG')
  })
})

describe('horario semanal del grupo', () => {
  it('normaliza los días y descarta cantidades no válidas', () => {
    expect(normalizarDiasSemana({ 1: 2, 3: 1, 0: 0, 8: 4, 5: -1 })).toEqual({ 1: 2, 3: 1 })
    expect(normalizarDiasSemana(null)).toEqual({})
  })

  it('normaliza los bloques de 55 minutos y cuenta las sesiones', () => {
    expect(normalizarBloquesSemana({ 1: ['08:00', '25:00', '08:00', '14:40'] })).toEqual({
      1: [
        { inicio: '08:00', tipo: 'sesion' },
        { inicio: '14:40', tipo: 'sesion' }
      ]
    })
    expect(
      contarBloques({
        1: [
          { inicio: '08:00', tipo: 'sesion' },
          { inicio: '08:55', tipo: 'sesion' }
        ],
        3: [{ inicio: '09:50', tipo: 'sesion' }]
      })
    ).toEqual({ 1: 2, 3: 1 })
  })

  it('admite varias tutorías por día y limpia las horas no válidas', () => {
    expect(
      normalizarTutoriasSemana({
        1: { presencial: ['17:00', '19:00', '25:00'], individual: ['18:00', '18:00'] },
        2: { presencial: '16:30', individual: '' },
        3: { presencial: [], individual: [] }
      })
    ).toEqual({
      1: { presencial: ['17:00', '19:00'], individual: ['18:00'] },
      2: { presencial: ['16:30'], individual: [] }
    })
  })

  it('guarda las sesiones por día y las conserva al actualizar sin enviarlas', () => {
    const grupo = crearGrupoClase(db, {
      ciclo_id: 'daw',
      curso: '2',
      modalidad: 'presencial',
      modulo_codigo: '0613',
      dias_semana: { 1: 2, 3: 1 }
    })
    expect(grupo.dias_semana).toEqual({ 1: 2, 3: 1 })

    const actualizado = actualizarGrupoClase(db, grupo.id, {
      ciclo_id: 'daw',
      curso: '2',
      modalidad: 'presencial',
      modulo_codigo: '0612'
    })
    expect(actualizado?.dias_semana).toEqual({ 1: 2, 3: 1 })
    expect(obtenerGrupoClase(db, grupo.id)?.dias_semana).toEqual({ 1: 2, 3: 1 })
  })

  it('guarda varias tutorías por día y las conserva al actualizar', () => {
    const grupo = crearGrupoClase(db, {
      ciclo_id: 'daw',
      curso: '2',
      modalidad: 'semipresencial',
      modulo_codigo: '0613',
      tutorias_semana: {
        1: { presencial: ['17:00', '19:00'], individual: ['18:00'] }
      }
    })
    expect(grupo.tutorias_semana).toEqual({
      1: { presencial: ['17:00', '19:00'], individual: ['18:00'] }
    })

    const actualizado = actualizarGrupoClase(db, grupo.id, {
      ciclo_id: 'daw',
      curso: '2',
      modalidad: 'semipresencial',
      modulo_codigo: '0613'
    })
    expect(actualizado?.tutorias_semana).toEqual({
      1: { presencial: ['17:00', '19:00'], individual: ['18:00'] }
    })
  })

  it('guarda los bloques del calendario semanal', () => {
    const grupo = crearGrupoClase(db, {
      ciclo_id: 'daw',
      curso: '2',
      modalidad: 'presencial',
      modulo_codigo: '0613',
      bloques_semana: { 1: ['08:00', '08:55'], 3: ['14:40'] }
    })
    expect(grupo.bloques_semana).toEqual({
      1: [
        { inicio: '08:00', tipo: 'sesion' },
        { inicio: '08:55', tipo: 'sesion' }
      ],
      3: [{ inicio: '14:40', tipo: 'sesion' }]
    })
    expect(grupo.dias_semana).toEqual({ 1: 2, 3: 1 })
  })
})

describe('grupos de clase', () => {
  it('crea un grupo con nombre generado y devuelve el módulo', () => {
    const grupo = crearGrupoClase(db, {
      ciclo_id: 'daw',
      curso: '2',
      modalidad: 'presencial',
      modulo_codigo: '0613'
    })

    expect(grupo.nombre).toBe('2º DAW · DWES · Presencial')
    expect(grupo.modulo_nombre).toBe('Desarrollo Web en entorno servidor')
    expect(grupo.ciclo_nombre).toBe('Desarrollo de Aplicaciones Web')
    expect(grupo.alumnos).toBe(0)
    expect(grupo.ra).toBe(2)
    expect(grupo.ce).toBe(3)
    expect(listarGruposClase(db)).toHaveLength(1)
  })

  it('no permite duplicar la misma combinación', () => {
    const entrada = {
      ciclo_id: 'daw',
      curso: '2' as const,
      modalidad: 'semipresencial' as const,
      modulo_codigo: '0613'
    }
    crearGrupoClase(db, entrada)

    expect(() => crearGrupoClase(db, entrada)).toThrow(/Ya existe el grupo/)
  })

  it('permite el mismo módulo y curso en otra modalidad', () => {
    crearGrupoClase(db, {
      ciclo_id: 'daw',
      curso: '2',
      modalidad: 'presencial',
      modulo_codigo: '0613'
    })
    crearGrupoClase(db, {
      ciclo_id: 'daw',
      curso: '2',
      modalidad: 'semipresencial',
      modulo_codigo: '0613'
    })

    expect(listarGruposClase(db)).toHaveLength(2)
  })

  it('rechaza un módulo que no pertenece al ciclo', () => {
    expect(() =>
      crearGrupoClase(db, {
        ciclo_id: 'smr',
        curso: '1',
        modalidad: 'presencial',
        modulo_codigo: '0613'
      })
    ).toThrow(/no pertenece al ciclo/)
  })

  it('rechaza un módulo de otro curso', () => {
    expect(() =>
      crearGrupoClase(db, {
        ciclo_id: 'daw',
        curso: '1',
        modalidad: 'presencial',
        modulo_codigo: '0613'
      })
    ).toThrow(/es de 2º curso/)
  })

  it('actualiza el grupo y regenera el nombre', () => {
    const grupo = crearGrupoClase(db, {
      ciclo_id: 'daw',
      curso: '1',
      modalidad: 'presencial',
      modulo_codigo: '0487'
    })

    const actualizado = actualizarGrupoClase(db, grupo.id, {
      ciclo_id: 'daw',
      curso: '2',
      modalidad: 'semipresencial',
      modulo_codigo: '0612'
    })

    expect(actualizado?.nombre).toBe('2º DAW · DWEC · Semipresencial')
    expect(actualizado?.modulo_nombre).toBe('Desarrollo Web en entorno cliente')
  })

  it('no permite actualizar a una combinación ya existente', () => {
    const primero = crearGrupoClase(db, {
      ciclo_id: 'daw',
      curso: '1',
      modalidad: 'presencial',
      modulo_codigo: '0487'
    })
    crearGrupoClase(db, {
      ciclo_id: 'daw',
      curso: '2',
      modalidad: 'presencial',
      modulo_codigo: '0613'
    })

    expect(() =>
      actualizarGrupoClase(db, primero.id, {
        ciclo_id: 'daw',
        curso: '2',
        modalidad: 'presencial',
        modulo_codigo: '0613'
      })
    ).toThrow(/Ya existe el grupo/)
  })

  it('cuenta el alumnado matriculado en el grupo', () => {
    const grupo = crearGrupoClase(db, {
      ciclo_id: 'daw',
      curso: '2',
      modalidad: 'presencial',
      modulo_codigo: '0613'
    })
    const alumno = crearAlumno(db, { nombre: 'Ana', apellidos: 'García' })
    db.prepare('INSERT INTO matriculas_clase (alumno_id, grupo_clase_id) VALUES (?, ?)').run(
      alumno.id,
      grupo.id
    )

    expect(listarGruposClase(db)[0].alumnos).toBe(1)
    expect(obtenerGrupoClase(db, grupo.id)?.alumnos).toBe(1)
  })

  it('borra el grupo', () => {
    const grupo = crearGrupoClase(db, {
      ciclo_id: 'daw',
      curso: '2',
      modalidad: 'presencial',
      modulo_codigo: '0613'
    })

    expect(borrarGrupoClase(db, grupo.id)).toBe(true)
    expect(listarGruposClase(db)).toHaveLength(0)
    expect(borrarGrupoClase(db, grupo.id)).toBe(false)
  })
})
