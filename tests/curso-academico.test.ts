import { describe, expect, it } from 'vitest'
import { cursoAcademicoActual } from '@shared/curso-academico'

describe('curso académico derivado de la fecha', () => {
  it('toma el septiembre anterior y el julio siguiente', () => {
    expect(cursoAcademicoActual(new Date('2026-10-28T12:00:00'))).toEqual({
      inicio: 2026,
      fin: 2027,
      nombre: '2026/2027'
    })
    expect(cursoAcademicoActual(new Date('2027-03-15T12:00:00'))).toEqual({
      inicio: 2026,
      fin: 2027,
      nombre: '2026/2027'
    })
    expect(cursoAcademicoActual(new Date('2027-07-01T12:00:00'))).toEqual({
      inicio: 2026,
      fin: 2027,
      nombre: '2026/2027'
    })
  })

  it('cambia de curso al llegar septiembre', () => {
    expect(cursoAcademicoActual(new Date('2027-08-31T12:00:00'))).toEqual({
      inicio: 2026,
      fin: 2027,
      nombre: '2026/2027'
    })
    expect(cursoAcademicoActual(new Date('2027-09-01T12:00:00'))).toEqual({
      inicio: 2027,
      fin: 2028,
      nombre: '2027/2028'
    })
  })
})
