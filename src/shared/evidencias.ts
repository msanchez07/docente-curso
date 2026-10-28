import type { CategoriaEvidencia } from './tipos'

export interface OpcionCategoriaEvidencia {
  id: CategoriaEvidencia
  etiqueta: string
  descripcion: string
}

export const CATEGORIAS_EVIDENCIA: OpcionCategoriaEvidencia[] = [
  {
    id: 'material',
    etiqueta: 'Material',
    descripcion: 'Enunciado, recursos o documentación de la entrega'
  },
  {
    id: 'solucion',
    etiqueta: 'Solución',
    descripcion: 'Solución corregida o propuesta de resolución'
  },
  {
    id: 'apuntes',
    etiqueta: 'Apuntes de notas',
    descripcion: 'Apuntes, correcciones o notas de clase'
  },
  {
    id: 'entrega',
    etiqueta: 'Entrega del alumnado',
    descripcion: 'Trabajo recibido del grupo'
  },
  {
    id: 'otro',
    etiqueta: 'Otro',
    descripcion: 'Cualquier otro documento de la entrega'
  }
]

export function etiquetaCategoriaEvidencia(categoria: CategoriaEvidencia): string {
  return CATEGORIAS_EVIDENCIA.find((opcion) => opcion.id === categoria)?.etiqueta ?? categoria
}
