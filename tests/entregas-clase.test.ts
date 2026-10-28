import { beforeEach, describe, expect, it } from 'vitest'
import type { Ciclo } from '@shared/tipos'
import { modeloPorDefecto } from '@shared/modelo'
import { abrirBd, type Bd } from '../src/main/db/conexion'
import { sembrarCiclos } from '../src/main/db/seed'
import { crearGrupoClase } from '../src/main/db/repositorios/grupos-clase'
import { guardarCriterios } from '../src/main/db/repositorios/criterios-grupo'
import {
  actualizarEntregaClase,
  bloquearEntregaClase,
  borrarEntregaClase,
  crearEntregaClase,
  criteriosDisponiblesClase,
  listarEntregasClase
} from '../src/main/db/repositorios/entregas-clase'

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
    }
  ]
}

let db: Bd
let grupoId: number
let sinCriteriosId: number

beforeEach(() => {
  db = abrirBd(':memory:')
  sembrarCiclos(db, [cicloPrueba])
  grupoId = crearGrupoClase(db, {
    ciclo_id: 'daw',
    curso: '2',
    modalidad: 'presencial',
    modulo_codigo: '0613'
  }).id
  sinCriteriosId = crearGrupoClase(db, {
    ciclo_id: 'daw',
    curso: '2',
    modalidad: 'semipresencial',
    modulo_codigo: '0613'
  }).id
  guardarCriterios(db, grupoId, modeloPorDefecto('presencial'))
})

describe('entregas por grupo de clase', () => {
  it('lista los CE disponibles del módulo', () => {
    const ce = criteriosDisponiblesClase(db, grupoId)
    expect(ce).toHaveLength(3)
    expect(ce[0].raCodigo).toBe('RA1')
  })

  it('crea una entrega con mapeo a CE y la lista', () => {
    const ce = criteriosDisponiblesClase(db, grupoId)
    const entrega = crearEntregaClase(db, grupoId, {
      titulo: 'Examen AV1',
      descripcion: 'Prueba',
      tipo: 'examen',
      fecha_limite: '2026-11-19',
      avaluacion_id: 'AV1',
      categoria_id: 'examenes',
      ce_ids: [ce[0].ceId, ce[1].ceId]
    })

    expect(entrega.criterios).toBe(2)
    expect(entrega.ce_ids).toEqual([ce[0].ceId, ce[1].ceId])
    expect(listarEntregasClase(db, grupoId)).toHaveLength(1)
    expect(listarEntregasClase(db, sinCriteriosId)).toHaveLength(0)
  })

  it('guarda la rúbrica asociada a la entrega', () => {
    const entrega = crearEntregaClase(db, grupoId, {
      titulo: 'Práctica con rúbrica',
      fecha_limite: '2026-11-06',
      rubrica: 'Criterios: funcionalidad 60 %, presentación 40 %.',
      avaluacion_id: 'AV1',
      categoria_id: 'actividades',
      ce_ids: []
    })

    expect(entrega.rubrica).toBe('Criterios: funcionalidad 60 %, presentación 40 %.')
  })

  it('guarda la rúbrica adjunta como archivo', () => {
    const entrega = crearEntregaClase(db, grupoId, {
      titulo: 'Entrega con rúbrica adjunta',
      avaluacion_id: 'AV1',
      categoria_id: 'examenes',
      rubrica_archivo: {
        nombre: 'rubrica.txt',
        tipo: 'text/plain',
        datos: 'SGVsbG8='
      },
      ce_ids: []
    })

    expect(entrega.rubrica_archivo).toEqual({
      nombre: 'rubrica.txt',
      tipo: 'text/plain',
      datos: 'SGVsbG8='
    })

    const actualizada = actualizarEntregaClase(db, entrega.id, {
      titulo: 'Entrega con rúbrica adjunta',
      avaluacion_id: 'AV1',
      categoria_id: 'examenes',
      rubrica: 'Rúbrica en texto',
      rubrica_archivo: null,
      ce_ids: []
    })
    expect(actualizada?.rubrica).toBe('Rúbrica en texto')
    expect(actualizada?.rubrica_archivo).toBeNull()
  })

  it('bloquea y desbloquea una entrega', () => {
    const entrega = crearEntregaClase(db, grupoId, {
      titulo: 'Entrega calificada',
      avaluacion_id: 'AV1',
      categoria_id: 'examenes',
      ce_ids: []
    })

    const bloqueada = bloquearEntregaClase(db, entrega.id, true)
    expect(bloqueada?.bloqueada).toBe(true)
    expect(() =>
      actualizarEntregaClase(db, entrega.id, {
        titulo: 'No debería cambiar',
        avaluacion_id: 'AV1',
        categoria_id: 'examenes',
        ce_ids: []
      })
    ).toThrow(/bloqueada/)
    expect(() => borrarEntregaClase(db, entrega.id)).toThrow(/bloqueada/)

    bloquearEntregaClase(db, entrega.id, false)
    const actualizada = actualizarEntregaClase(db, entrega.id, {
      titulo: 'Ya se puede cambiar',
      avaluacion_id: 'AV1',
      categoria_id: 'examenes',
      ce_ids: []
    })
    expect(actualizada?.titulo).toBe('Ya se puede cambiar')
  })

  it('actualiza datos y mapeo', () => {
    const ce = criteriosDisponiblesClase(db, grupoId)
    const entrega = crearEntregaClase(db, grupoId, {
      titulo: 'Práctica',
      avaluacion_id: 'AV1',
      categoria_id: 'actividades',
      ce_ids: [ce[0].ceId]
    })

    const actualizada = actualizarEntregaClase(db, entrega.id, {
      titulo: 'Práctica corregida',
      avaluacion_id: 'AV2',
      categoria_id: 'proyectos',
      ce_ids: [ce[2].ceId]
    })

    expect(actualizada?.titulo).toBe('Práctica corregida')
    expect(actualizada?.avaluacion_id).toBe('AV2')
    expect(actualizada?.categoria_id).toBe('proyectos')
    expect(actualizada?.ce_ids).toEqual([ce[2].ceId])
  })

  it('rechaza crear sin criterios definidos', () => {
    expect(() =>
      crearEntregaClase(db, sinCriteriosId, {
        titulo: 'Entrega',
        avaluacion_id: 'AV1',
        categoria_id: 'examenes',
        ce_ids: []
      })
    ).toThrow(/criterios de calificación/)
  })

  it('rechaza una categoría que no existe en los criterios', () => {
    expect(() =>
      crearEntregaClase(db, grupoId, {
        titulo: 'Entrega',
        avaluacion_id: 'AV1',
        categoria_id: 'inexistente',
        ce_ids: []
      })
    ).toThrow(/categoría/)
  })

  it('borra la entrega', () => {
    const entrega = crearEntregaClase(db, grupoId, {
      titulo: 'Entrega',
      avaluacion_id: 'AV1',
      categoria_id: 'examenes',
      ce_ids: []
    })

    expect(borrarEntregaClase(db, entrega.id)).toBe(true)
    expect(listarEntregasClase(db, grupoId)).toHaveLength(0)
  })
})
