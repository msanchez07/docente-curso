import { describe, expect, it } from 'vitest'
import { parsearUnidadesProgramacion } from '../src/shared/importar-unidades'

describe('importación de unidades de programación', () => {
  it('acepta un array con RA y sesiones', () => {
    const resultado = parsearUnidadesProgramacion(
      JSON.stringify([
        {
          codigo: 'UD1',
          nombre: 'Introducción',
          fecha_inicio: '15/09/2026',
          fecha_fin: '2026-10-15',
          contenidos: 'Entorno y sintaxis',
          ra_codigos: ['RA1', 'RA2'],
          sesiones: [{ fecha: '16/09/2026', contenido: 'Presentación' }]
        }
      ])
    )
    expect(resultado.errores).toEqual([])
    expect(resultado.unidades).toHaveLength(1)
    expect(resultado.unidades[0].fecha_inicio).toBe('2026-09-15')
    expect(resultado.unidades[0].ra_codigos).toEqual(['RA1', 'RA2'])
    expect(resultado.unidades[0].sesiones?.[0].fecha).toBe('2026-09-16')
  })

  it('acepta { unidades: [...] } y valida fechas', () => {
    const resultado = parsearUnidadesProgramacion(
      JSON.stringify({
        unidades: [{ nombre: 'UD1', fecha_inicio: '2026-10-15', fecha_fin: '2026-10-01' }]
      })
    )
    expect(resultado.errores[0]).toMatch(/posterior/)
  })
})
