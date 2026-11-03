import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parsearCurriculos } from '../src/shared/importar-curriculos'

const DIRECTORIO = join(process.cwd(), 'resources', 'boe')
const FICHEROS = readdirSync(DIRECTORIO)
  .filter((fichero) => fichero.endsWith('.json'))
  .sort()

describe('datos BOE empaquetados', () => {
  it('todos los ciclos del catálogo son válidos para el importador', () => {
    expect(FICHEROS).toHaveLength(181)
    for (const fichero of FICHEROS) {
      const datos = JSON.parse(readFileSync(join(DIRECTORIO, fichero), 'utf-8')) as unknown
      const resultado = parsearCurriculos(JSON.stringify(datos))
      expect(resultado.errores, fichero).toEqual([])
      expect(resultado.ciclos, fichero).toHaveLength(1)
    }
  })

  it('los ciclos de DAM, ASIR y SMR tienen RA/CE en sus módulos profesionales', () => {
    const esperados: Record<string, number> = {
      'gs-desarrollo-de-aplicaciones-multiplataforma': 100,
      'gs-administracion-de-sistemas-informaticos-en-red': 105,
      'gm-sistemas-microinformaticos-y-redes': 80
    }
    for (const [id, minimo] of Object.entries(esperados)) {
      const fichero = FICHEROS.find((nombre) => nombre.includes(id))
      expect(fichero, id).toBeDefined()
      const datos = JSON.parse(readFileSync(join(DIRECTORIO, fichero!), 'utf-8')) as {
        modulos: { ra: unknown[] }[]
      }
      const total = datos.modulos.reduce((suma, modulo) => suma + modulo.ra.length, 0)
      expect(total, id).toBeGreaterThanOrEqual(minimo)
    }
  })
})
