import { describe, expect, it } from 'vitest'
import { parsearEventosEvaluacion } from '../src/shared/importar-eventos'

describe('importación de fechas de evaluaciones y exámenes', () => {
  it('acepta un array de eventos', () => {
    const resultado = parsearEventosEvaluacion(
      JSON.stringify([
        {
          tipo: 'examen',
          titulo: 'Examen AV1',
          fecha: '19/11/2026',
          hora: '09:00',
          avaluacion: 'AV1'
        },
        {
          tipo: 'evaluacion',
          titulo: 'Sesión 1ª evaluación',
          fecha: '2026-12-10',
          avaluacion_id: 'AV1'
        }
      ])
    )

    expect(resultado.errores).toEqual([])
    expect(resultado.eventos).toHaveLength(2)
    expect(resultado.eventos[0].fecha).toBe('2026-11-19')
    expect(resultado.eventos[0].hora).toBe('09:00')
    expect(resultado.eventos[1].tipo).toBe('evaluacion')
  })

  it('acepta evaluaciones y exámenes separados', () => {
    const resultado = parsearEventosEvaluacion(
      JSON.stringify({
        evaluaciones: [{ titulo: '1ª evaluación', fecha: '10/12/2026' }],
        examenes: [{ titulo: 'Examen', fecha: '19/11/2026' }]
      })
    )

    expect(resultado.errores).toEqual([])
    expect(resultado.eventos.map((evento) => evento.tipo)).toEqual(['examen', 'evaluacion'])
  })

  it('devuelve errores de fecha y de JSON', () => {
    const fechas = parsearEventosEvaluacion(
      JSON.stringify([{ tipo: 'examen', titulo: 'Examen', fecha: '31/02/2026' }])
    )
    expect(fechas.errores[0]).toMatch(/fecha no válida/)

    const json = parsearEventosEvaluacion('no es json')
    expect(json.errores[0]).toMatch(/no es JSON/)
  })
})
