import { describe, expect, it } from 'vitest'
import { esFinDeSemana } from '../src/shared/fechas'

describe('fechas compartidas', () => {
  it('detecta sábados y domingos', () => {
    expect(esFinDeSemana('2026-11-07')).toBe(true)
    expect(esFinDeSemana('2026-11-08')).toBe(true)
    expect(esFinDeSemana('2026-11-06')).toBe(false)
    expect(esFinDeSemana('2026-11-09')).toBe(false)
  })

  it('ignora valores que no son fechas ISO', () => {
    expect(esFinDeSemana('')).toBe(false)
    expect(esFinDeSemana('07/11/2026')).toBe(false)
  })
})
