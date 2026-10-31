import { beforeEach, describe, expect, it } from 'vitest'
import { abrirBd, type Bd } from '../src/main/db/conexion'
import {
  guardarConfiguracionGeneral,
  obtenerConfiguracionGeneral
} from '../src/main/db/repositorios/configuracion-general'
import { CONFIGURACION_GENERAL_POR_DEFECTO } from '../src/shared/tipos'

let db: Bd

beforeEach(() => {
  db = abrirBd(':memory:')
})

describe('configuración general', () => {
  it('devuelve valores vacíos si no hay configuración', () => {
    expect(obtenerConfiguracionGeneral(db)).toEqual(CONFIGURACION_GENERAL_POR_DEFECTO)
  })

  it('guarda y recupera los datos del profesorado y del centro', () => {
    const config = {
      profesor: {
        nombre: 'Ana',
        apellidos: 'García',
        email: 'ana@ejemplo.com',
        telefono: '600000000',
        departamento: 'Informática'
      },
      centro: {
        nombre: 'IES Ejemplo',
        direccion: 'Calle Mayor 1',
        localidad: 'Madrid',
        provincia: 'Madrid',
        codigoPostal: '28001',
        telefono: '910000000',
        email: 'info@ies.example',
        web: 'https://ies.example'
      },
      logo: null
    }
    expect(guardarConfiguracionGeneral(db, config)).toEqual(config)
    expect(obtenerConfiguracionGeneral(db)).toEqual(config)
  })

  it('rechaza un logo que no sea PNG', () => {
    expect(() =>
      guardarConfiguracionGeneral(db, {
        ...CONFIGURACION_GENERAL_POR_DEFECTO,
        logo: 'data:image/jpeg;base64,abc'
      })
    ).toThrow(/PNG/i)
  })
})
