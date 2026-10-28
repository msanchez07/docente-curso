import { describe, expect, it } from 'vitest'
import { parsearDiasProgramacion } from '../src/shared/importar-programacion'

describe('importación de días de programación', () => {
  it('lee un array de fechas ISO', () => {
    const resultado = parsearDiasProgramacion('["2026-10-28", "2026-10-29"]')

    expect(resultado.dias).toEqual([
      { fecha: '2026-10-28', contenido: '', desviacion: '', observaciones: '' },
      { fecha: '2026-10-29', contenido: '', desviacion: '', observaciones: '' }
    ])
    expect(resultado.errores).toEqual([])
  })

  it('lee objetos con contenido, desviación y observaciones', () => {
    const resultado = parsearDiasProgramacion(
      JSON.stringify([
        {
          fecha: '2026-11-03',
          contenido: 'UD2: sesiones',
          desviacion: 'Sin desviación',
          observaciones: 'Aula 3'
        }
      ])
    )

    expect(resultado.dias[0]).toEqual({
      fecha: '2026-11-03',
      contenido: 'UD2: sesiones',
      desviacion: 'Sin desviación',
      observaciones: 'Aula 3'
    })
  })

  it('acepta un envoltorio «dias» y fechas dd/mm/aaaa', () => {
    const resultado = parsearDiasProgramacion('{"dias": ["05/11/2026"]}')

    expect(resultado.dias[0].fecha).toBe('2026-11-05')
  })

  it('ordena, rechaza fechas imposibles y avisa de duplicados', () => {
    const resultado = parsearDiasProgramacion(
      '["2026-12-02", "2026-02-31", "2026-12-02", "2026-11-30"]'
    )

    expect(resultado.dias.map((d) => d.fecha)).toEqual(['2026-11-30', '2026-12-02'])
    expect(resultado.errores).toHaveLength(2)
  })

  it('devuelve un error si el texto no es JSON', () => {
    expect(parsearDiasProgramacion('no es json').errores[0]).toMatch(
      /fecha no válida|no es JSON válido/
    )
  })
})

describe('importación de programación pegada desde hoja de cálculo', () => {
  it('acepta filas TSV sin cabecera', () => {
    const resultado = parsearDiasProgramacion(
      '28/10/2026\tPresentación del módulo\t\tAula 3\n29/10/2026\tRepaso de PHP\tSin desviación\tAula 2'
    )
    expect(resultado.errores).toEqual([])
    expect(resultado.dias).toHaveLength(2)
    expect(resultado.dias[0]).toMatchObject({
      fecha: '2026-10-28',
      contenido: 'Presentación del módulo',
      observaciones: 'Aula 3'
    })
    expect(resultado.dias[1].desviacion).toBe('Sin desviación')
  })

  it('acepta CSV con cabecera y punto y coma', () => {
    const resultado = parsearDiasProgramacion(
      'fecha;contenido;desviación;observaciones\n05/11/2026;Base de datos;Sin desviación;Aula 4'
    )
    expect(resultado.errores).toEqual([])
    expect(resultado.dias).toEqual([
      {
        fecha: '2026-11-05',
        contenido: 'Base de datos',
        desviacion: 'Sin desviación',
        observaciones: 'Aula 4'
      }
    ])
  })
})
