import { describe, expect, it } from 'vitest'
import {
  ESQUEMA_ALUMNADO,
  ESQUEMA_EVENTOS,
  ESQUEMA_PROGRAMACION
} from '../src/shared/esquemas-importacion'

describe('esquemas de importación', () => {
  it('los tres esquemas declaran JSON Schema y título', () => {
    for (const esquema of [ESQUEMA_ALUMNADO, ESQUEMA_PROGRAMACION, ESQUEMA_EVENTOS]) {
      expect(esquema.$schema).toBe('https://json-schema.org/draft/2020-12/schema')
      expect(esquema.title.length).toBeGreaterThan(0)
    }
  })

  it('alumnado exige nombre y apellidos', () => {
    expect(ESQUEMA_ALUMNADO.items.required).toEqual(['nombre', 'apellidos'])
  })

  it('programación admite fechas sueltas y objetos', () => {
    expect(ESQUEMA_PROGRAMACION.items.oneOf).toHaveLength(2)
  })

  it('eventos admite array y colecciones por tipo', () => {
    expect(ESQUEMA_EVENTOS.oneOf).toHaveLength(2)
    expect(ESQUEMA_EVENTOS.$defs.evento.required).toEqual(['titulo', 'fecha'])
  })
})
