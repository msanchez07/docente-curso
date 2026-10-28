import { describe, expect, it } from 'vitest'
import { parsearEntradaAlumnos } from '../src/main/db/repositorios/alumnos'

describe('importación de alumnado', () => {
  it('lee el volcado JSON anidado de una hoja de cálculo', () => {
    const texto = `[[{"nombre":"Ana","apellidos":"García","direccindecorreo":"ana@ejemplo.com","grupos":"2º DAW"},{"nombre":"Luis","apellidos":"Pérez","direccindecorreo":"luis@ejemplo.com","grupos":"2º DAW"}]]`
    const filas = parsearEntradaAlumnos(texto)
    expect(filas).toHaveLength(2)
    expect(filas[0]).toEqual({
      nombre: 'Ana',
      apellidos: 'García',
      dni: null,
      email: 'ana@ejemplo.com'
    })
  })

  it('ignora las columnas que no se usan (grupos)', () => {
    const filas = parsearEntradaAlumnos(`[{"nombre":"Ana","apellidos":"García","grupos":"2º DAW"}]`)
    expect(filas[0]).toEqual({ nombre: 'Ana', apellidos: 'García', dni: null, email: null })
  })

  it('reconoce las columnas por su nombre, sin importar el orden', () => {
    const filas = parsearEntradaAlumnos(
      `[{"Apellidos":"García","Dirección de correo":"ana@ejemplo.com","DNI":"12345678Z","Nombre":"Ana"}]`
    )
    expect(filas[0]).toEqual({
      nombre: 'Ana',
      apellidos: 'García',
      dni: '12345678Z',
      email: 'ana@ejemplo.com'
    })
  })

  it('acepta un único objeto JSON', () => {
    const filas = parsearEntradaAlumnos(`{"nombre":"Ana","apellidos":"García"}`)
    expect(filas).toEqual([{ nombre: 'Ana', apellidos: 'García', dni: null, email: null }])
  })

  it('encuentra las filas aunque vengan envueltas en un objeto', () => {
    const filas = parsearEntradaAlumnos(
      `{"curso":"2º DAW","alumnos":[[{"nombre":"Ana","apellidos":"García"}]]}`
    )
    expect(filas).toEqual([{ nombre: 'Ana', apellidos: 'García', dni: null, email: null }])
  })

  it('lee texto delimitado con cabecera', () => {
    const filas = parsearEntradaAlumnos('nombre;apellidos;correo\nAna;García;ana@ejemplo.com')
    expect(filas).toEqual([
      { nombre: 'Ana', apellidos: 'García', dni: null, email: 'ana@ejemplo.com' }
    ])
  })

  it('lee texto delimitado sin cabecera en el orden nombre, apellidos, dni, correo', () => {
    const filas = parsearEntradaAlumnos('Ana,García,12345678Z,ana@ejemplo.com')
    expect(filas).toEqual([
      { nombre: 'Ana', apellidos: 'García', dni: '12345678Z', email: 'ana@ejemplo.com' }
    ])
  })

  it('ignora las líneas vacías y devuelve lista vacía con entrada vacía', () => {
    expect(parsearEntradaAlumnos('   ')).toEqual([])
    expect(parsearEntradaAlumnos('Ana,García\n\n')).toHaveLength(1)
  })
})
