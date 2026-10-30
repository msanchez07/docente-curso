import { describe, expect, it } from 'vitest'
import { modeloPorDefecto } from '@shared/modelo'
import { calcularResumenClase } from '@shared/calcular-calificaciones'
import type {
  AlumnoClase,
  CriterioDisponible,
  EntregaClase,
  GrupoClase,
  NotaGuardadaClase,
  UnidadProgramacion
} from '@shared/tipos'

const grupo: GrupoClase = {
  id: 1,
  curso_academico_id: 1,
  curso_academico_nombre: '26/26',
  ciclo_id: 'daw',
  ciclo_nombre: 'Desarrollo de Aplicaciones Web',
  curso: '2',
  modalidad: 'presencial',
  modulo_codigo: '0613',
  modulo_nombre: 'Desarrollo Web en entorno servidor',
  modulo_siglas: 'DWES',
  nombre: '2º DAW · DWES · Presencial',
  alumnos: 1,
  ra: 9,
  ce: 66,
  criterios: true,
  dias_semana: { 1: 2, 3: 1 },
  tutorias_semana: {},
  bloques_semana: { 1: ['08:00', '08:55'], 3: ['08:00'] },
  creado_en: '2026-10-27 09:00:00'
}

const alumno: AlumnoClase = {
  id: 1,
  nombre: 'Ana',
  apellidos: 'García',
  dni: '11111111H',
  email: 'ana@ejemplo.com',
  activo: true,
  grupos_clase: [1]
}

function entrega(id: number, avaluacion: string, categoria: string, titulo: string): EntregaClase {
  return {
    id,
    grupo_clase_id: 1,
    titulo,
    descripcion: null,
    tipo: 'tarea',
    fecha_limite: null,
    avaluacion_id: avaluacion,
    categoria_id: categoria,
    unidad_id: null,
    criterios: 1,
    ce_ids: [1],
    rubrica: null,
    rubrica_archivo: null,
    notas: 0,
    evidencias: 0,
    bloqueada: false,
    creada_en: '2026-10-27 09:00:00'
  }
}

const entregas = [
  entrega(1, 'AV1', 'examenes', 'Examen AV1'),
  entrega(2, 'AV1', 'actividades', 'Práctica'),
  entrega(3, 'AV2', 'proyectos', 'Proyecto')
]

function notas(valores: Record<number, number>): NotaGuardadaClase[] {
  return Object.entries(valores).map(([entregaId, nota]) => ({
    entrega_id: Number(entregaId),
    alumno_id: 1,
    nota,
    observaciones: null
  }))
}

describe('cálculo de calificaciones por grupo', () => {
  it('calcula avaluaciones, final y estado', () => {
    const resumen = calcularResumenClase(
      grupo,
      modeloPorDefecto('presencial'),
      entregas,
      [alumno],
      notas({ 1: 8, 2: 6, 3: 7 })
    )
    const fila = resumen.alumnos[0]

    expect(fila.avaluaciones[0].nota).toBe(7.33)
    expect(fila.avaluaciones[1].nota).toBe(7)
    expect(fila.avaluaciones[2].nota).toBeNull()
    expect(fila.notaFinal).toBe(7.17)
    expect(fila.aprobado).toBe(true)
    expect(fila.incompleta).toBe(false)
  })

  it('una entrega sin nota cuenta 0 y marca incompleta', () => {
    const resumen = calcularResumenClase(
      grupo,
      modeloPorDefecto('presencial'),
      entregas,
      [alumno],
      notas({ 1: 8, 3: 7 })
    )
    const fila = resumen.alumnos[0]

    expect(fila.incompleta).toBe(true)
    expect(fila.avaluaciones[0].nota).toBe(5.33)
    expect(fila.avaluaciones[0].suspensa).toBe(true)
    expect(fila.vaAConvocatoria).toBe(true)
  })

  it('suspende la categoría si una entrega no llega al mínimo', () => {
    const resumen = calcularResumenClase(
      grupo,
      modeloPorDefecto('presencial'),
      entregas,
      [alumno],
      notas({ 1: 3, 2: 9, 3: 9 })
    )
    const fila = resumen.alumnos[0]

    expect(fila.avaluaciones[0].categorias[0].suspensa).toBe(true)
    expect(fila.avaluaciones[0].suspensa).toBe(true)
    expect(fila.aprobado).toBe(false)
  })

  it('calcula los RA superados y los pendientes', () => {
    const criterios: CriterioDisponible[] = [
      {
        ceId: 1,
        ceCodigo: 'a',
        raCodigo: 'RA1',
        raDescripcion: 'RA uno',
        descripcion: 'CE de RA1'
      },
      {
        ceId: 2,
        ceCodigo: 'a',
        raCodigo: 'RA2',
        raDescripcion: 'RA dos',
        descripcion: 'CE de RA2'
      }
    ]
    const entregasRa: EntregaClase[] = [
      { ...entregas[0], ce_ids: [1] },
      { ...entregas[1], ce_ids: [2] },
      { ...entregas[2], ce_ids: [2] }
    ]

    const aprobado = calcularResumenClase(
      grupo,
      modeloPorDefecto('presencial'),
      entregasRa,
      [alumno],
      notas({ 1: 8, 2: 6, 3: 7 }),
      criterios
    ).alumnos[0]

    expect(aprobado.ras.map((ra) => ra.codigo)).toEqual(['RA1', 'RA2'])
    expect(aprobado.ras[0].nota).toBe(8)
    expect(aprobado.ras[1].nota).toBe(6.5)
    expect(aprobado.rasNoSuperados).toEqual([])
    expect(aprobado.todosRasSuperados).toBe(true)
    expect(aprobado.aprobado).toBe(true)

    const pendiente = calcularResumenClase(
      grupo,
      modeloPorDefecto('presencial'),
      entregasRa,
      [alumno],
      notas({ 1: 8, 2: 3, 3: 4 }),
      criterios
    ).alumnos[0]

    expect(pendiente.ras[1].nota).toBe(3.5)
    expect(pendiente.rasNoSuperados).toEqual(['RA2'])
    expect(pendiente.todosRasSuperados).toBe(false)
    expect(pendiente.aprobado).toBe(false)
    expect(pendiente.vaAConvocatoria).toBe(true)
  })

  it('no cuenta la avaluación sin entregas en la nota final', () => {
    const resumen = calcularResumenClase(
      grupo,
      modeloPorDefecto('presencial'),
      [entregas[0]],
      [alumno],
      notas({ 1: 8 })
    )
    const fila = resumen.alumnos[0]

    expect(fila.avaluaciones[1].nota).toBeNull()
    expect(fila.avaluaciones[2].nota).toBeNull()
    expect(fila.notaFinal).toBe(8)
  })
})

describe('cálculo por unidades didácticas', () => {
  const unidades = [
    {
      id: 10,
      grupo_clase_id: 1,
      codigo: 'UD1',
      nombre: 'Unidad 1',
      fecha_inicio: null,
      fecha_fin: null,
      avaluacion_id: 'AV1',
      peso: 60,
      categorias: [],
      requisitos: [],
      contenidos: '',
      observaciones: null,
      ra_codigos: ['RA1'],
      criterios: [],
      sesiones: [],
      creado_en: '',
      actualizado_en: ''
    },
    {
      id: 11,
      grupo_clase_id: 1,
      codigo: 'UD2',
      nombre: 'Unidad 2',
      fecha_inicio: null,
      fecha_fin: null,
      avaluacion_id: 'AV1',
      peso: 40,
      categorias: [],
      requisitos: [],
      contenidos: '',
      observaciones: null,
      ra_codigos: ['RA2'],
      criterios: [],
      sesiones: [],
      creado_en: '',
      actualizado_en: ''
    }
  ] as UnidadProgramacion[]

  it('calcula la nota de cada unidad y la final por pesos', () => {
    const modelo = {
      ...modeloPorDefecto('presencial'),
      modoCalificacion: 'unidades' as const
    }
    const entregasUnidad = entregas.map((item, indice) => ({
      ...item,
      unidad_id: indice === 2 ? 11 : 10
    }))
    const resumen = calcularResumenClase(
      grupo,
      modelo,
      entregasUnidad,
      [alumno],
      notas({ 1: 8, 2: 6, 3: 7 }),
      [],
      unidades
    )
    const fila = resumen.alumnos[0]
    expect(fila.unidades.map((unidad) => unidad.nota)).toEqual([7.33, 7])
    expect(fila.notaFinal).toBe(7.2)
    expect(fila.aprobado).toBe(true)
  })
})
