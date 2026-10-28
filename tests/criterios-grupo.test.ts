import { beforeEach, describe, expect, it } from 'vitest'
import type { Ciclo } from '@shared/tipos'
import { modeloPorDefecto } from '@shared/modelo'
import { abrirBd, type Bd } from '../src/main/db/conexion'
import { sembrarCiclos } from '../src/main/db/seed'
import { crearGrupoClase, listarGruposClase } from '../src/main/db/repositorios/grupos-clase'
import {
  copiarCriteriosMismoModulo,
  guardarCriterios,
  obtenerCriterios
} from '../src/main/db/repositorios/criterios-grupo'
import {
  borrarPlantilla,
  crearPlantillaDesdeGrupo,
  guardarPlantilla,
  listarPlantillas,
  obtenerPlantilla,
  plantillaParaGrupo
} from '../src/main/db/repositorios/plantillas-criterios'

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
let presencial: number
let semipresencial: number

beforeEach(() => {
  db = abrirBd(':memory:')
  sembrarCiclos(db, [cicloPrueba])
  presencial = crearGrupoClase(db, {
    ciclo_id: 'daw',
    curso: '2',
    modalidad: 'presencial',
    modulo_codigo: '0613'
  }).id
  semipresencial = crearGrupoClase(db, {
    ciclo_id: 'daw',
    curso: '2',
    modalidad: 'semipresencial',
    modulo_codigo: '0613'
  }).id
})

describe('criterios por grupo de clase', () => {
  it('arranca sin criterios y guarda el modelo con convocatorias', () => {
    expect(obtenerCriterios(db, presencial)).toBeNull()

    const guardado = guardarCriterios(db, presencial, modeloPorDefecto('presencial'))

    expect(guardado.convocatorias).toEqual({
      extraordinaria: 'suspensas',
      perdidaEvaluacionContinua: 'global'
    })
    expect(obtenerCriterios(db, presencial)?.categorias.map((c) => c.id)).toEqual([
      'examenes',
      'actividades',
      'proyectos'
    ])
    expect(listarGruposClase(db).find((g) => g.id === presencial)?.criterios).toBe(true)
    expect(listarGruposClase(db).find((g) => g.id === semipresencial)?.criterios).toBe(false)
  })

  it('rechaza avaluaciones que no suman exactamente 100', () => {
    const modelo = modeloPorDefecto('presencial')
    modelo.avaluaciones = [{ id: 'AV1', nombre: 'Única', peso: 99.5 }]

    expect(() => guardarCriterios(db, presencial, modelo)).toThrow(/exactamente 100/)
  })

  it('rechaza categorías que no suman exactamente 100', () => {
    const modelo = modeloPorDefecto('presencial')
    modelo.categorias = [{ id: 'examenes', nombre: 'Exámenes', peso: 99.5 }]

    expect(() => guardarCriterios(db, presencial, modelo)).toThrow(/exactamente 100/)
  })

  it('acepta los decimales de la plantilla semipresencial', () => {
    expect(() =>
      guardarCriterios(db, semipresencial, modeloPorDefecto('semipresencial'))
    ).not.toThrow()
  })

  it('rechaza guardar en un grupo inexistente', () => {
    expect(() => guardarCriterios(db, 999, modeloPorDefecto('presencial'))).toThrow(/no existe/)
  })

  it('copia los criterios a los demás grupos del mismo módulo', () => {
    const modelo = modeloPorDefecto('presencial')
    modelo.categorias = [
      { id: 'examenes', nombre: 'Exámenes', peso: 60 },
      { id: 'proyectos', nombre: 'Proyectos', peso: 40 }
    ]
    guardarCriterios(db, presencial, modelo)

    const copiados = copiarCriteriosMismoModulo(db, presencial)

    expect(copiados).toBe(1)
    expect(obtenerCriterios(db, semipresencial)?.categorias.map((c) => c.id)).toEqual([
      'examenes',
      'proyectos'
    ])
    expect(listarGruposClase(db).find((g) => g.id === semipresencial)?.criterios).toBe(true)
  })
})

describe('plantillas de criterios', () => {
  it('usa los valores por defecto si el grupo no tiene plantilla', () => {
    const base = plantillaParaGrupo(db, presencial)

    expect(base.nombre).toBeNull()
    expect(base.modelo.categorias.map((c) => c.id)).toEqual([
      'examenes',
      'actividades',
      'proyectos'
    ])
  })

  it('crea la plantilla con el nombre del grupo y la aplica', () => {
    const modelo = modeloPorDefecto('presencial')
    const plantilla = crearPlantillaDesdeGrupo(db, presencial, modelo)

    expect(plantilla.nombre).toBe('Plantilla 2º DAW · DWES · Presencial')
    expect(plantilla.modulo_codigo).toBe('0613')
    expect(listarPlantillas(db)).toHaveLength(1)
    expect(plantillaParaGrupo(db, presencial).nombre).toBe(plantilla.nombre)
    expect(obtenerPlantilla(db, plantilla.id)?.requisitos).toHaveLength(4)
  })

  it('guarda y borra una plantilla', () => {
    const plantilla = crearPlantillaDesdeGrupo(db, presencial, modeloPorDefecto('presencial'))
    const modelo = modeloPorDefecto('presencial')
    modelo.categorias = [
      { id: 'examenes', nombre: 'Exámenes', peso: 60 },
      { id: 'proyectos', nombre: 'Proyectos', peso: 40 }
    ]

    expect(guardarPlantilla(db, plantilla.id, modelo).categorias).toHaveLength(2)
    expect(obtenerPlantilla(db, plantilla.id)?.categorias).toHaveLength(2)
    expect(borrarPlantilla(db, plantilla.id)).toBe(true)
    expect(plantillaParaGrupo(db, presencial).nombre).toBeNull()
  })

  it('crea una plantilla distinta para cada modalidad', () => {
    crearPlantillaDesdeGrupo(db, presencial, modeloPorDefecto('presencial'))
    crearPlantillaDesdeGrupo(db, semipresencial, modeloPorDefecto('semipresencial'))

    expect(listarPlantillas(db).map((p) => p.modalidad)).toEqual(['presencial', 'semipresencial'])
  })
})
