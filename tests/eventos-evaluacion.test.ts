import { beforeEach, describe, expect, it } from 'vitest'
import type { Ciclo } from '@shared/tipos'
import { abrirBd, type Bd } from '../src/main/db/conexion'
import { sembrarCiclos } from '../src/main/db/seed'
import { crearGrupoClase } from '../src/main/db/repositorios/grupos-clase'
import {
  actualizarEventoEvaluacion,
  borrarEventoEvaluacion,
  crearEventoEvaluacion,
  importarEventosEvaluacion,
  listarEventosEvaluacion
} from '../src/main/db/repositorios/eventos-evaluacion'

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

describe('fechas de evaluaciones y exámenes', () => {
  it('crea, lista, actualiza y borra una fecha', () => {
    const evento = crearEventoEvaluacion(db, grupoId, {
      tipo: 'examen',
      titulo: 'Examen AV1',
      fecha: '2026-11-19',
      hora: '09:00',
      avaluacion_id: 'AV1'
    })

    expect(evento.tipo).toBe('examen')
    expect(listarEventosEvaluacion(db, grupoId)).toHaveLength(1)

    const actualizado = actualizarEventoEvaluacion(db, evento.id, {
      tipo: 'evaluacion',
      titulo: 'Sesión de evaluación',
      fecha: '2026-12-10',
      hora: '17:00',
      avaluacion_id: 'AV1'
    })
    expect(actualizado?.tipo).toBe('evaluacion')
    expect(actualizado?.fecha).toBe('2026-12-10')

    expect(borrarEventoEvaluacion(db, evento.id)).toBe(true)
    expect(listarEventosEvaluacion(db, grupoId)).toHaveLength(0)
  })

  it('importa eventos válidos y conserva los errores', () => {
    const resultado = importarEventosEvaluacion(
      db,
      grupoId,
      JSON.stringify({
        eventos: [
          {
            tipo: 'examen',
            titulo: 'Examen AV1',
            fecha: '19/11/2026'
          },
          {
            tipo: 'evaluacion',
            titulo: 'Evaluación 1',
            fecha: '31/02/2026'
          }
        ]
      })
    )

    expect(resultado.creados).toBe(1)
    expect(resultado.errores).toHaveLength(1)
    expect(listarEventosEvaluacion(db, grupoId)).toHaveLength(1)
  })
})
