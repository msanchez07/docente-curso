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

  it('acepta criterios concretos por RA y CE', () => {
    const resultado = parsearUnidadesProgramacion(
      JSON.stringify([
        {
          nombre: 'UD criterios',
          criterios: [
            { raCodigo: 'RA1', ceCodigo: 'a' },
            { raCodigo: 'RA1', ceCodigo: 'b' },
            'RA2.c'
          ]
        }
      ])
    )
    expect(resultado.errores).toEqual([])
    expect(resultado.unidades[0].criterios).toEqual([
      { raCodigo: 'RA1', ceCodigo: 'a' },
      { raCodigo: 'RA1', ceCodigo: 'b' },
      { raCodigo: 'RA2', ceCodigo: 'c' }
    ])
  })

  it('acepta fechas ISO completas y criterios separados por comas', () => {
    const resultado = parsearUnidadesProgramacion(
      JSON.stringify([
        {
          nombre: 'UD con fechas completas',
          fecha_inicio: '2026-09-15T00:00:00.000Z',
          fecha_fin: '2026-10-15T23:59:59+02:00',
          criterios: 'RA1.a, RA1.b; RA2.c'
        }
      ])
    )
    expect(resultado.errores).toEqual([])
    expect(resultado.unidades[0].fecha_inicio).toBe('2026-09-15')
    expect(resultado.unidades[0].fecha_fin).toBe('2026-10-15')
    expect(resultado.unidades[0].criterios).toEqual([
      { raCodigo: 'RA1', ceCodigo: 'a' },
      { raCodigo: 'RA1', ceCodigo: 'b' },
      { raCodigo: 'RA2', ceCodigo: 'c' }
    ])
  })

  it('acepta criterios con claves ra_codigo y ce_codigo', () => {
    const resultado = parsearUnidadesProgramacion(
      JSON.stringify([
        { nombre: 'UD snake_case', criterios: [{ ra_codigo: 'RA1', ce_codigo: 'a' }] }
      ])
    )
    expect(resultado.errores).toEqual([])
    expect(resultado.unidades[0].criterios).toEqual([{ raCodigo: 'RA1', ceCodigo: 'a' }])
  })

  it('acepta { unidades: [...] } y valida fechas', () => {
    const resultado = parsearUnidadesProgramacion(
      JSON.stringify({
        unidades: [{ nombre: 'UD1', fecha_inicio: '2026-10-15', fecha_fin: '2026-10-01' }]
      })
    )
    expect(resultado.errores[0]).toMatch(/posterior/)
  })

  it('rechaza fechas imposibles', () => {
    const resultado = parsearUnidadesProgramacion(
      JSON.stringify([{ nombre: 'UD imposible', fecha_inicio: '2026-02-30' }])
    )
    expect(resultado.errores[0]).toMatch(/fecha de inicio no válida/)
  })
})
