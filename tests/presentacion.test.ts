import { beforeEach, describe, expect, it } from 'vitest'
import { abrirBd, type Bd } from '../src/main/db/conexion'
import {
  construirDatosPresentacion,
  normalizarPresentacion,
  renderizarPlantilla
} from '../src/shared/presentacion'
import { obtenerPresentacion, guardarPresentacion } from '../src/main/db/repositorios/presentacion'
import type {
  EventoEvaluacionClase,
  GrupoClase,
  ModeloEvaluacion,
  UnidadProgramacion
} from '../src/shared/tipos'

describe('motor de plantillas de presentación', () => {
  it('sustituye variables, escapa HTML y permite HTML crudo', () => {
    const html = renderizarPlantilla('<h1>{{titulo}}</h1><div>{{{html}}}</div>', {
      titulo: 'A & B',
      html: '<strong>ok</strong>'
    })
    expect(html).toBe('<h1>A &amp; B</h1><div><strong>ok</strong></div>')
  })

  it('repite listas, anida secciones y usa el caso vacío', () => {
    const html = renderizarPlantilla(
      '{{#unidades}}[{{codigo}}:{{#criterios}}{{ra}}.{{ce}};{{/criterios}}]{{/unidades}}{{^unidades}}vacío{{/unidades}}',
      {
        unidades: [
          {
            codigo: 'UD1',
            criterios: [
              { ra: 'RA1', ce: 'a' },
              { ra: 'RA1', ce: 'b' }
            ]
          }
        ]
      }
    )
    expect(html).toBe('[UD1:RA1.a;RA1.b;]')
    expect(renderizarPlantilla('{{^unidades}}vacío{{/unidades}}', { unidades: [] })).toBe('vacío')
  })
})

describe('datos de presentación', () => {
  it('agrupa unidades por evaluación y formatea RA/CE', () => {
    const grupo = {
      id: 1,
      curso_academico_nombre: '2026/2027',
      ciclo_nombre: 'DAW',
      nombre: '2º DAW · DWES',
      modulo_nombre: 'Desarrollo Web en entorno servidor',
      modulo_codigo: '0613',
      modalidad: 'presencial'
    } as GrupoClase

    const unidades = [
      {
        id: 1,
        codigo: 'UD1',
        nombre: 'Introducción',
        fecha_inicio: '2026-09-15',
        fecha_fin: '2026-10-15',
        contenidos: 'Contenidos UD1',
        criterios: [
          { raCodigo: 'RA1', ceCodigo: 'a' },
          { raCodigo: 'RA1', ceCodigo: 'b' },
          { raCodigo: 'RA2', ceCodigo: 'a' }
        ],
        ra_codigos: ['RA1', 'RA2'],
        sesiones: [],
        observaciones: null,
        grupo_clase_id: 1,
        creado_en: '',
        actualizado_en: ''
      }
    ] as UnidadProgramacion[]

    const eventos = [
      {
        id: 1,
        grupo_clase_id: 1,
        tipo: 'evaluacion',
        titulo: '1ª evaluación',
        fecha: '2026-12-10',
        hora: null,
        avaluacion_id: 'AV1',
        observaciones: null,
        creado_en: '',
        actualizado_en: ''
      }
    ] as EventoEvaluacionClase[]

    const modelo = {
      avaluaciones: [{ id: 'AV1', nombre: '1ª evaluación', peso: 33 }],
      categorias: [],
      requisitos: []
    } as ModeloEvaluacion

    const datos = construirDatosPresentacion(
      grupo,
      unidades,
      modelo,
      eventos,
      normalizarPresentacion(null)
    )
    expect(datos.trimestres).toHaveLength(1)
    expect(datos.trimestres[0].nombre).toBe('1ª evaluación')
    expect(datos.trimestres[0].unidades[0].ra).toBe('1, 2')
    expect(datos.trimestres[0].unidades[0].ce).toBe('1.a – b; 2.a')
    expect(datos.totalCes).toBe(3)
  })
})

describe('configuración persistente de la presentación', () => {
  let db: Bd

  beforeEach(() => {
    db = abrirBd(':memory:')
  })

  it('guarda y recupera la plantilla y los datos del docente', () => {
    const config = normalizarPresentacion({
      titulo: 'Mi presentación',
      profesor: 'Docente',
      contacto: 'docente@example.com'
    })
    guardarPresentacion(db, config)
    const recuperada = obtenerPresentacion(db)
    expect(recuperada.titulo).toBe('Mi presentación')
    expect(recuperada.profesor).toBe('Docente')
    expect(recuperada.contacto).toBe('docente@example.com')
    expect(recuperada.plantilla.length).toBeGreaterThan(100)
  })
})
