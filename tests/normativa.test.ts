import { describe, expect, it } from 'vitest'
import { validarHtmlNormativa } from '../src/shared/normativa'

describe('validación de la normativa FP', () => {
  it('acepta un documento HTML', () => {
    expect(() =>
      validarHtmlNormativa('<!doctype html><html><body>Normativa</body></html>')
    ).not.toThrow()
    expect(() => validarHtmlNormativa('<html lang="es"><body>Ok</body></html>')).not.toThrow()
  })

  it('rechaza contenido vacío o que no es HTML', () => {
    expect(() => validarHtmlNormativa('   ')).toThrow(/vacío/)
    expect(() => validarHtmlNormativa('{"no":"es html"}')).toThrow(/documento HTML/)
  })
})
