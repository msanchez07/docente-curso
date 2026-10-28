import { describe, expect, it } from 'vitest'
import {
  calcularNotaEntrega,
  calcularNotaFinal,
  calcularNotaRa,
  pesosSumanCien,
  redondear,
  validarPesos
} from '../src/main/domain/calificacion'
import type { NotaCriterio } from '@shared/tipos'

describe('redondear', () => {
  it('redondea a dos decimales por defecto', () => {
    expect(redondear(6.666)).toBe(6.67)
    expect(redondear(6.664)).toBe(6.66)
    expect(redondear(10)).toBe(10)
  })
})

describe('calcularNotaEntrega', () => {
  it('hace la media simple cuando todos los CE pesan igual', () => {
    const criterios: NotaCriterio[] = [
      { ceId: 1, peso: 1, nota: 4 },
      { ceId: 2, peso: 1, nota: 8 }
    ]
    expect(calcularNotaEntrega(criterios)).toEqual({ nota: 6, completa: true, ceSinNota: [] })
  })

  it('respeta los pesos de cada criterio', () => {
    const criterios: NotaCriterio[] = [
      { ceId: 1, peso: 3, nota: 10 },
      { ceId: 2, peso: 1, nota: 2 }
    ]
    // (3*10 + 1*2) / 4 = 8
    expect(calcularNotaEntrega(criterios).nota).toBe(8)
  })

  it('ignora los criterios con peso 0', () => {
    const criterios: NotaCriterio[] = [
      { ceId: 1, peso: 1, nota: 5 },
      { ceId: 2, peso: 0, nota: 0 }
    ]
    expect(calcularNotaEntrega(criterios).nota).toBe(5)
  })

  it('marca como incompleta y cuenta 0 los CE sin corregir', () => {
    const criterios: NotaCriterio[] = [
      { ceId: 1, peso: 1, nota: 8 },
      { ceId: 2, peso: 1, nota: null }
    ]
    const resultado = calcularNotaEntrega(criterios)
    expect(resultado).toEqual({ nota: 4, completa: false, ceSinNota: [2] })
  })

  it('devuelve nota nula si no hay criterios con peso', () => {
    expect(calcularNotaEntrega([{ ceId: 1, peso: 0, nota: 10 }]).nota).toBeNull()
    expect(calcularNotaEntrega([]).nota).toBeNull()
  })
})

describe('calcularNotaRa', () => {
  it('pondera las entregas del RA', () => {
    expect(
      calcularNotaRa([
        { entregaId: 1, peso: 60, nota: 7 },
        { entregaId: 2, peso: 40, nota: 3 }
      ])
    ).toBe(5.4)
  })

  it('trata la entrega sin corregir como 0', () => {
    expect(
      calcularNotaRa([
        { entregaId: 1, peso: 50, nota: 10 },
        { entregaId: 2, peso: 50, nota: null }
      ])
    ).toBe(5)
  })
})

describe('calcularNotaFinal', () => {
  const rasBase = [
    { raId: 1, peso: 40, nota: 7 },
    { raId: 2, peso: 60, nota: 4 }
  ]

  it('calcula la media ponderada y marca aprobado', () => {
    const resultado = calcularNotaFinal(rasBase)
    // (40*7 + 60*4) / 100 = 5.2
    expect(resultado.nota).toBe(5.2)
    expect(resultado.aprobado).toBe(true)
    expect(resultado.incompleta).toBe(false)
    expect(resultado.avisos).toEqual([])
  })

  it('suspende por debajo del umbral', () => {
    const resultado = calcularNotaFinal([
      { raId: 1, peso: 50, nota: 2 },
      { raId: 2, peso: 50, nota: 3 }
    ])
    expect(resultado.nota).toBe(2.5)
    expect(resultado.aprobado).toBe(false)
  })

  it('avisa si los pesos de los RA no suman 100', () => {
    const resultado = calcularNotaFinal([
      { raId: 1, peso: 40, nota: 5 },
      { raId: 2, peso: 40, nota: 5 }
    ])
    expect(resultado.avisos.some((a) => a.includes('80 %'))).toBe(true)
  })

  it('avisa y marca incompleta si hay RA sin nota', () => {
    const resultado = calcularNotaFinal([
      { raId: 1, peso: 50, nota: 8 },
      { raId: 2, peso: 50, nota: null }
    ])
    expect(resultado.incompleta).toBe(true)
    expect(resultado.nota).toBe(4)
    expect(resultado.avisos.some((a) => a.includes('sin nota'))).toBe(true)
  })

  it('respeta el umbral de aprobado configurado', () => {
    const resultado = calcularNotaFinal([{ raId: 1, peso: 100, nota: 6 }], 7)
    expect(resultado.aprobado).toBe(false)
  })

  it('devuelve nota nula si no hay RA con peso', () => {
    expect(calcularNotaFinal([{ raId: 1, peso: 0, nota: 9 }]).nota).toBeNull()
  })

  it('no avisa por los RA sin ponderar', () => {
    const resultado = calcularNotaFinal([
      { raId: 1, peso: 100, nota: 8 },
      { raId: 2, peso: 0, nota: null }
    ])
    expect(resultado.nota).toBe(8)
    expect(resultado.incompleta).toBe(false)
    expect(resultado.avisos).toEqual([])
  })
})

describe('validarPesos', () => {
  it('acepta pesos que suman 100', () => {
    expect(validarPesos([40, 30, 30])).toEqual({ ok: true, suma: 100, desviacion: 0 })
  })

  it('detecta desviaciones', () => {
    const resultado = validarPesos([40, 30, 20])
    expect(resultado.ok).toBe(false)
    expect(resultado.desviacion).toBe(-10)
  })

  it('tolera pequeñas diferencias de redondeo', () => {
    expect(pesosSumanCien([33.33, 33.33, 33.34])).toBe(true)
  })
})
