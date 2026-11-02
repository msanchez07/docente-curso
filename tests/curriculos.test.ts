import { beforeEach, describe, expect, it } from 'vitest'
import { abrirBd, type Bd } from '../src/main/db/conexion'
import { importarCurriculo } from '../src/main/db/repositorios/curriculos'
import { guardarPesosRa, obtenerCiclo, obtenerModulo } from '../src/main/db/repositorios/boe'
import { contarBoe } from '../src/main/db/seed'

const curriculo = {
  id: 'gs-test',
  denominacion: 'Ciclo de prueba',
  nivel: 'Formación Profesional de Grado Superior',
  familia_profesional: 'Informática y Comunicaciones',
  duracion_horas: 2000,
  ects: 120,
  abreviatura: 'CP',
  rd: 'RD de prueba',
  boe_url: 'https://www.boe.es/',
  modulos: [
    {
      codigo: '0001',
      nombre: 'Programación',
      siglas: 'PROG',
      curso: '1',
      ects: 10,
      horas_minimas_boe: 100,
      ra: [
        {
          codigo: 'RA1',
          numero: 1,
          descripcion: 'RA uno',
          ce: [
            { codigo: 'a', descripcion: 'CE a' },
            { codigo: 'b', descripcion: 'CE b' }
          ]
        }
      ]
    }
  ]
}

let db: Bd

beforeEach(() => {
  db = abrirBd(':memory:')
})

describe('importación de currículos en la base de datos', () => {
  it('guarda ciclo, módulo, RA y CE', () => {
    const resultado = importarCurriculo(db, JSON.stringify(curriculo))
    expect(resultado).toMatchObject({ ciclos: 1, modulos: 1, ra: 1, ce: 2, errores: [] })
    expect(resultado.avisos[0]).toContain('catálogo')

    expect(contarBoe(db)).toEqual({ ciclos: 1, modulos: 1, ra: 1, ce: 2 })
    const ciclo = obtenerCiclo(db, 'gs-test')
    expect(ciclo?.denominacion).toBe('Ciclo de prueba')
    expect(ciclo?.modulos[0].ra[0].ce).toHaveLength(2)
    expect(obtenerModulo(db, '0001')?.siglas).toBe('PROG')
  })

  it('conserva los pesos al volver a importar', () => {
    importarCurriculo(db, JSON.stringify(curriculo))
    guardarPesosRa(db, '0001', { RA1: 40 })
    importarCurriculo(db, JSON.stringify(curriculo))
    const peso = db
      .prepare('SELECT peso FROM resultados_aprendizaje WHERE modulo_codigo = ? AND codigo = ?')
      .get('0001', 'RA1') as { peso: number }
    expect(peso.peso).toBe(40)
  })

  it('no escribe nada si la validación falla', () => {
    const resultado = importarCurriculo(db, JSON.stringify({ ...curriculo, modulos: [] }))
    expect(resultado.ciclos).toBe(0)
    expect(resultado.errores.length).toBeGreaterThan(0)
    expect(contarBoe(db)).toEqual({ ciclos: 0, modulos: 0, ra: 0, ce: 0 })
  })
})
