import { describe, expect, it } from 'vitest'
import { parsearCalendarioEscolar } from '../src/shared/importar-calendario'

describe('importación del calendario escolar', () => {
  it('acepta un array de días y normaliza dd/mm/aaaa', () => {
    const resultado = parsearCalendarioEscolar(
      JSON.stringify([
        { fecha: '15/09/2026', tipo: 'lectivo', descripcion: 'Inicio' },
        { fecha: '2026-10-12', tipo: 'festivo' }
      ])
    )
    expect(resultado.errores).toEqual([])
    expect(resultado.dias).toHaveLength(2)
    expect(resultado.dias[0].fecha).toBe('2026-09-15')
    expect(resultado.dias[1].tipo).toBe('festivo')
  })

  it('acepta listas de festivos, no lectivos y vacaciones', () => {
    const resultado = parsearCalendarioEscolar(
      JSON.stringify({
        festivos: ['2026-10-12', '2026-11-02'],
        no_lectivos: [{ fecha: '2026-12-07', descripcion: 'Día del centro' }],
        vacaciones: ['2026-12-23']
      })
    )
    expect(resultado.errores).toEqual([])
    expect(resultado.dias.map((dia) => dia.tipo)).toEqual([
      'festivo',
      'festivo',
      'no_lectivo',
      'vacaciones'
    ])
  })

  it('acepta { dias: [...] } y rechaza tipos no válidos', () => {
    const resultado = parsearCalendarioEscolar(
      JSON.stringify({ dias: [{ fecha: '2026-09-15', tipo: 'vacaciones' }] })
    )
    expect(resultado.dias).toHaveLength(1)

    const invalido = parsearCalendarioEscolar(
      JSON.stringify([{ fecha: '2026-09-15', tipo: 'puente' }])
    )
    expect(invalido.errores[0]).toMatch(/tipo no válido/)
  })
})
