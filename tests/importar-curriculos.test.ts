import { describe, expect, it } from 'vitest'
import { parsearCurriculos, resumirCurriculos } from '../src/shared/importar-curriculos'
import { ESQUEMA_CICLO } from '../src/shared/esquemas-importacion'

const ciclo = {
  id: 'gs-test',
  denominacion: 'Ciclo de prueba',
  nivel: 'Formación Profesional de Grado Superior',
  familia_profesional: 'Informática y Comunicaciones',
  duracion_horas: 2000,
  ects: 120,
  modulos: [
    {
      codigo: '0001',
      nombre: 'Programación',
      curso: '1',
      ra: [
        {
          descripcion: 'RA sin código',
          ce: [{ descripcion: 'CE sin código' }, { codigo: 'b', descripcion: 'CE b' }]
        }
      ]
    }
  ]
}

describe('importación de currículos', () => {
  it('acepta un ciclo único y genera códigos de RA/CE', () => {
    const resultado = parsearCurriculos(JSON.stringify(ciclo))
    expect(resultado.errores).toEqual([])
    expect(resultado.ciclos).toHaveLength(1)
    const ra = resultado.ciclos[0].modulos[0].ra[0]
    expect(ra.codigo).toBe('RA1')
    expect(ra.numero).toBe(1)
    expect(ra.ce.map((ce) => ce.codigo)).toEqual(['a', 'b'])
  })

  it('acepta un array y { ciclos: [...] }', () => {
    expect(parsearCurriculos(JSON.stringify([ciclo])).ciclos).toHaveLength(1)
    expect(parsearCurriculos(JSON.stringify({ ciclos: [ciclo] })).ciclos).toHaveLength(1)
  })

  it('rechaza ids o códigos repetidos', () => {
    const repetido = {
      ...ciclo,
      modulos: [ciclo.modulos[0], { ...ciclo.modulos[0], nombre: 'Otro' }]
    }
    const resultado = parsearCurriculos(JSON.stringify(repetido))
    expect(resultado.ciclos).toHaveLength(0)
    expect(resultado.errores.some((e) => e.includes('repetido'))).toBe(true)
  })

  it('rechaza JSON inválido y estructuras desconocidas', () => {
    expect(parsearCurriculos('{').errores[0]).toContain('JSON')
    expect(parsearCurriculos('{}').errores[0]).toContain('Se esperaba')
  })

  it('resume módulos, RA y CE', () => {
    const resultado = parsearCurriculos(JSON.stringify(ciclo))
    expect(resumirCurriculos(resultado.ciclos)).toEqual({ modulos: 1, ra: 1, ce: 2 })
  })

  it('el ejemplo del esquema se puede importar', () => {
    const resultado = parsearCurriculos(JSON.stringify(ESQUEMA_CICLO.examples[0]))
    expect(resultado.errores).toEqual([])
    expect(resultado.ciclos).toHaveLength(1)
  })
})
