/**
 * Valores por defecto del modelo de evaluación.
 *
 * Vive en `shared` porque lo usan el proceso principal (cálculo y persistencia)
 * y la previsualización web (plantillas). Las reglas de cálculo siguen en
 * `src/main/domain`.
 */
import type {
  Avaluacion,
  CategoriaEvaluacion,
  ConvocatoriasEvaluacion,
  Modalidad,
  ModeloEvaluacion,
  RequisitoEvaluacion
} from './tipos'

export const REQUISITOS_POR_DEFECTO: RequisitoEvaluacion[] = [
  {
    id: 'notaMinimaEntrega',
    nombre: 'Nota mínima de cada entrega',
    valor: 4,
    descripcion: 'Una entrega por debajo de esta nota suspende su categoría.'
  },
  {
    id: 'notaMinimaCategoria',
    nombre: 'Media mínima de cada categoría',
    valor: 5,
    descripcion:
      'Si la media de una categoría (exámenes, actividades…) no llega, la avaluación queda suspensa.'
  },
  {
    id: 'notaMinimaAvaluacion',
    nombre: 'Nota mínima de cada avaluación',
    valor: 5,
    descripcion: 'Si el trimestre no llega a esta nota, hay que ir a la convocatoria ordinaria.'
  },
  {
    id: 'aprobado',
    nombre: 'Aprobado del módulo',
    valor: 5,
    descripcion: 'Nota final mínima para aprobar el módulo.'
  }
]

export const CONVOCATORIAS_POR_DEFECTO: ConvocatoriasEvaluacion = {
  extraordinaria: 'suspensas',
  perdidaEvaluacionContinua: 'global'
}

function copiar<T>(valor: T): T {
  return JSON.parse(JSON.stringify(valor)) as T
}

const CATEGORIAS_PRESENCIAL: CategoriaEvaluacion[] = [
  { id: 'examenes', nombre: 'Exámenes', peso: 50 },
  { id: 'actividades', nombre: 'Actividades', peso: 25 },
  { id: 'proyectos', nombre: 'Proyectos', peso: 25 }
]

const CATEGORIAS_SEMIPRESENCIAL: CategoriaEvaluacion[] = [
  { id: 'examenes', nombre: 'Exámenes', peso: 70 },
  { id: 'actividades', nombre: 'Actividades evaluables', peso: 30 }
]

const AVALUACIONES_PRESENCIAL: Avaluacion[] = [
  { id: 'AV1', nombre: '1ª evaluación', peso: 33 },
  { id: 'AV2', nombre: '2ª evaluación', peso: 33 },
  { id: 'AV3', nombre: '3ª evaluación', peso: 34 }
]

const AVALUACIONES_SEMIPRESENCIAL: Avaluacion[] = [
  { id: 'AV1', nombre: '1ª evaluación', peso: 33.3 },
  { id: 'AV2', nombre: '2ª evaluación', peso: 33.3 },
  { id: 'AV3', nombre: '3ª evaluación', peso: 33.4 }
]

export function modeloPorDefecto(modalidad: Modalidad): ModeloEvaluacion {
  const semipresencial = modalidad === 'semipresencial'
  return {
    categorias: copiar(semipresencial ? CATEGORIAS_SEMIPRESENCIAL : CATEGORIAS_PRESENCIAL),
    avaluaciones: copiar(semipresencial ? AVALUACIONES_SEMIPRESENCIAL : AVALUACIONES_PRESENCIAL),
    requisitos: copiar(REQUISITOS_POR_DEFECTO),
    convocatorias: copiar(CONVOCATORIAS_POR_DEFECTO)
  }
}

export const MODELO_PRESENCIAL = modeloPorDefecto('presencial')
export const MODELO_SEMIPRESENCIAL = modeloPorDefecto('semipresencial')
