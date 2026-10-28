import { describe, expect, it } from 'vitest'
import { normalizarNombre } from '../src/main/domain/texto'

describe('normalizarNombre', () => {
  it('convierte todo mayúsculas a mayúscula inicial', () => {
    expect(normalizarNombre('GARCÍA RUIZ')).toBe('García Ruiz')
    expect(normalizarNombre('MARÍA JOSÉ')).toBe('María José')
  })

  it('respeta las partículas', () => {
    expect(normalizarNombre('DE LA FUENTE')).toBe('De la Fuente')
    expect(normalizarNombre('PÉREZ DE LOS COBOS')).toBe('Pérez de los Cobos')
    expect(normalizarNombre('SANZ Y GIL')).toBe('Sanz y Gil')
  })

  it('respeta guiones y apóstrofes', () => {
    expect(normalizarNombre('MARÍA-JOSÉ')).toBe('María-José')
    expect(normalizarNombre("O'CONNOR")).toBe("O'Connor")
    expect(normalizarNombre('GARCÍA-ROJO GÓMEZ')).toBe('García-Rojo Gómez')
  })

  it('no toca los nombres que ya vienen bien', () => {
    expect(normalizarNombre('Ana García')).toBe('Ana García')
    expect(normalizarNombre('McDonald')).toBe('McDonald')
  })

  it('recorta y colapsa espacios', () => {
    expect(normalizarNombre('  ANA   GARCÍA  ')).toBe('Ana García')
  })

  it('devuelve cadena vacía con entrada vacía', () => {
    expect(normalizarNombre('   ')).toBe('')
  })
})
