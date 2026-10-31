/**
 * Motor de evaluación según el modelo configurable.
 *
 *     media de categoría = media simple de las entregas de esa categoría
 *     nota de avaluación = Σ (peso de categoría × media de categoría)
 *     nota final         = Σ (peso de avaluación × nota de avaluación)
 *
 * Reglas del profesorado que se aplican aquí:
 *   - Una entrega no corregida cuenta como 0.
 *   - Una entrega por debajo de `notaMinimaEntrega` suspende su categoría.
 *   - Una categoría con media por debajo de `notaMinimaCategoria` queda suspensa.
 *   - Una avaluación con nota por debajo de `notaMinimaAvaluacion` queda suspensa.
 *   - Si alguna avaluación suspende, hay que ir a la convocatoria ordinaria.
 *
 * Los pesos se renormalizan sobre las categorías/avaluaciones que tienen
 * entregas, para que una categoría sin contenido no hunda la nota.
 */
import type {
  Alumno,
  Entrega,
  EvaluacionAlumno,
  EvaluacionAvaluacion,
  EvaluacionCategoria,
  EvaluacionEntrega,
  ModeloEvaluacion
} from '@shared/tipos'
import { redondear } from './calificacion'
import { valorRequisito } from './modelo'

/** Media simple. Un `null` (sin corregir) cuenta como 0. */
export function mediaSimple(notas: (number | null)[]): number | null {
  if (notas.length === 0) return null
  const suma = notas.reduce<number>((total, nota) => total + (nota ?? 0), 0)
  return redondear(suma / notas.length)
}

function ponderar(items: { peso: number; valor: number }[]): number | null {
  const totalPesos = items.reduce<number>((total, i) => total + i.peso, 0)
  if (items.length === 0 || totalPesos <= 0) return null
  const suma = items.reduce<number>((total, i) => total + i.peso * i.valor, 0)
  return redondear(suma / totalPesos)
}

export function evaluarAlumno(
  alumno: Alumno,
  modelo: ModeloEvaluacion,
  entregas: Entrega[],
  notaDe: (entregaId: number) => number | null
): EvaluacionAlumno {
  const minimoEntrega = valorRequisito(modelo, 'notaMinimaEntrega', 4)
  const minimoCategoria = valorRequisito(modelo, 'notaMinimaCategoria', 5)
  const minimoAvaluacion = valorRequisito(modelo, 'notaMinimaAvaluacion', 5)
  const minimoAprobado = valorRequisito(modelo, 'aprobado', 5)
  const avisos: string[] = []

  const avaluaciones: EvaluacionAvaluacion[] = modelo.avaluaciones.map((avaluacion) => {
    const pesosPropios =
      avaluacion.pesosCategorias && Object.keys(avaluacion.pesosCategorias).length > 0
        ? avaluacion.pesosCategorias
        : null
    const categorias: EvaluacionCategoria[] = modelo.categorias.map((categoria) => {
      const deCategoria = entregas.filter(
        (e) => e.avaluacion === avaluacion.id && e.categoria === categoria.id
      )
      const items: EvaluacionEntrega[] = deCategoria.map((entrega) => {
        const nota = notaDe(entrega.id)
        return { entregaId: entrega.id, titulo: entrega.titulo, nota, corregida: nota !== null }
      })
      const media = mediaSimple(items.map((i) => i.nota))

      const motivos: string[] = []
      if (items.length > 0) {
        if (items.some((i) => !i.corregida)) {
          motivos.push('Hay entregas sin corregir (cuentan como 0).')
        }
        const bajas = items.filter(
          (i) => i.corregida && (i.nota as number) < minimoEntrega
        )
        if (bajas.length > 0) {
          motivos.push(`${bajas.length} entrega(s) por debajo de ${minimoEntrega}.`)
        }
        if (media !== null && media < minimoCategoria) {
          motivos.push(`La media de ${categoria.nombre} no llega a ${minimoCategoria}.`)
        }
      }

      const peso = pesosPropios
        ? Number(pesosPropios[categoria.id] ?? 0)
        : Number(categoria.peso) || 0
      return {
        categoriaId: categoria.id,
        nombre: categoria.nombre,
        peso,
        media,
        suspensa: peso > 0 && items.length > 0 && motivos.length > 0,
        motivos,
        entregas: items
      }
    })

    const conEntregas = categorias.filter((c) => c.entregas.length > 0)
    const sinEntregas = categorias.filter((c) => c.entregas.length === 0)
    if (sinEntregas.length > 0) {
      avisos.push(
        `${avaluacion.nombre}: sin entregas en ${sinEntregas.map((c) => c.nombre).join(', ')}.`
      )
    }

    const nota = ponderar(conEntregas.map((c) => ({ peso: c.peso, valor: c.media ?? 0 })))

    const motivos: string[] = []
    for (const categoria of conEntregas) {
      if (categoria.suspensa) motivos.push(`${categoria.nombre}: ${categoria.motivos.join(' ')}`)
    }
    if (nota !== null && nota < minimoAvaluacion) {
      motivos.push(`La nota de ${avaluacion.nombre} no llega a ${minimoAvaluacion}.`)
    }

    return {
      avaluacionId: avaluacion.id,
      nombre: avaluacion.nombre,
      peso: avaluacion.peso,
      nota,
      suspensa: conEntregas.length > 0 && motivos.length > 0,
      motivos,
      categorias
    }
  })

  const conNota = avaluaciones.filter((a) => a.nota !== null)
  const notaFinal = ponderar(conNota.map((a) => ({ peso: a.peso, valor: a.nota ?? 0 })))

  const algunaSuspensa = avaluaciones.some((a) => a.suspensa)
  const incompleta = avaluaciones.some((a) =>
    a.categorias.some((c) => c.entregas.some((e) => !e.corregida))
  )
  const aprobado =
    notaFinal !== null && notaFinal >= minimoAprobado && !algunaSuspensa
  const vaAConvocatoria = algunaSuspensa || (notaFinal !== null && notaFinal < minimoAprobado)

  if (incompleta) avisos.push('Faltan notas por registrar.')
  if (algunaSuspensa) avisos.push('Hay evaluaciones suspensas: procede la convocatoria ordinaria.')

  return { alumno, avaluaciones, notaFinal, aprobado, incompleta, avisos, vaAConvocatoria }
}
