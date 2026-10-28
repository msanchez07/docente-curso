import { beforeEach, describe, expect, it } from 'vitest'
import type { Ciclo } from '@shared/tipos'
import { modeloPorDefecto } from '@shared/modelo'
import { abrirBd, type Bd } from '../src/main/db/conexion'
import { sembrarCiclos } from '../src/main/db/seed'
import { crearGrupoClase } from '../src/main/db/repositorios/grupos-clase'
import { guardarCriterios } from '../src/main/db/repositorios/criterios-grupo'
import { bloquearEntregaClase, crearEntregaClase } from '../src/main/db/repositorios/entregas-clase'
import {
  borrarEvidenciaClase,
  listarEvidenciasClase,
  subirEvidenciasClase
} from '../src/main/db/repositorios/evidencias-clase'

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
let entregaId: number

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
  entregaId = crearEntregaClase(db, grupoId, {
    titulo: 'Práctica',
    rubrica: 'Criterios de prueba',
    avaluacion_id: 'AV1',
    categoria_id: 'actividades',
    ce_ids: []
  }).id
})

describe('evidencias de una entrega', () => {
  it('sube, lista y borra archivos globales', () => {
    const evidencias = subirEvidenciasClase(db, grupoId, entregaId, [
      {
        categoria: 'solucion',
        nombre: 'solucion.txt',
        tipo: 'text/plain',
        tamano: 5,
        datos: 'SGVsbG8='
      },
      {
        nombre: 'apuntes.txt',
        tipo: 'text/plain',
        tamano: 5,
        datos: 'QWRpb3M='
      }
    ])

    expect(evidencias).toHaveLength(2)
    expect(evidencias.find((item) => item.nombre === 'solucion.txt')?.categoria).toBe('solucion')
    expect(evidencias.find((item) => item.nombre === 'apuntes.txt')?.categoria).toBe('material')
    expect(listarEvidenciasClase(db, grupoId, entregaId)).toHaveLength(2)

    expect(borrarEvidenciaClase(db, evidencias[0].id)).toBe(true)
    expect(listarEvidenciasClase(db, grupoId, entregaId)).toHaveLength(1)
  })

  it('no permite modificar evidencias de una entrega bloqueada', () => {
    const [evidencia] = subirEvidenciasClase(db, grupoId, entregaId, [
      {
        categoria: 'apuntes',
        nombre: 'notas.txt',
        tipo: 'text/plain',
        tamano: 5,
        datos: 'Tm90YXM='
      }
    ])
    bloquearEntregaClase(db, entregaId, true)

    expect(() =>
      subirEvidenciasClase(db, grupoId, entregaId, [
        {
          nombre: 'otra.txt',
          tipo: 'text/plain',
          tamano: 4,
          datos: 'T3RyYQ=='
        }
      ])
    ).toThrow(/bloqueada/)
    expect(() => borrarEvidenciaClase(db, evidencia.id)).toThrow(/bloqueada/)
  })

  it('rechaza archivos de otra entrega del grupo', () => {
    const otra = crearEntregaClase(db, grupoId, {
      titulo: 'Otra',
      rubrica: 'Criterios',
      avaluacion_id: 'AV1',
      categoria_id: 'examenes',
      ce_ids: []
    })

    expect(() =>
      subirEvidenciasClase(db, grupoId, otra.id, [
        {
          nombre: 'archivo.txt',
          tipo: 'text/plain',
          tamano: 5,
          datos: 'SGVsbG8='
        }
      ])
    ).not.toThrow()
    expect(listarEvidenciasClase(db, grupoId, entregaId)).toHaveLength(0)
  })
})
