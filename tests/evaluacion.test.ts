import { describe, expect, it } from 'vitest'
import type { Alumno, Entrega } from '@shared/tipos'
import { evaluarAlumno, mediaSimple } from '../src/main/domain/evaluacion'
import {
  MODELO_PRESENCIAL,
  MODELO_SEMIPRESENCIAL,
  modeloPorDefecto,
  validarModelo
} from '../src/main/domain/modelo'

const alumno: Alumno = {
  id: 1,
  nombre: 'Ana',
  apellidos: 'García',
  dni: null,
  email: null,
  activo: true,
  grupos: []
}

function entrega(
  id: number,
  avaluacion: string,
  categoria: string,
  titulo = `Entrega ${id}`
): Entrega {
  return {
    id,
    modulo_codigo: '0613',
    titulo,
    descripcion: null,
    origen: null,
    tipo: 'tarea',
    fecha_limite: null,
    peso: 1,
    avaluacion,
    categoria,
    criterios: 0
  }
}

function notasDe(mapa: Record<number, number | null>) {
  return (id: number): number | null => mapa[id] ?? null
}

describe('mediaSimple', () => {
  it('trata las entregas sin corregir como 0', () => {
    expect(mediaSimple([8, null])).toBe(4)
    expect(mediaSimple([10, 0])).toBe(5)
  })

  it('devuelve null sin notas', () => {
    expect(mediaSimple([])).toBeNull()
  })
})

describe('evaluación semipresencial', () => {
  it('aplica 70 % exámenes + 30 % actividades por avaluación', () => {
    const entregas = [entrega(1, 'AV1', 'examenes'), entrega(2, 'AV1', 'actividades')]
    const resultado = evaluarAlumno(
      alumno,
      MODELO_SEMIPRESENCIAL,
      entregas,
      notasDe({ 1: 8, 2: 5 })
    )
    // 0,70·8 + 0,30·5 = 7,1
    expect(resultado.avaluaciones[0].nota).toBe(7.1)
    expect(resultado.avaluaciones[0].suspensa).toBe(false)
  })

  it('suspende la avaluación si la media de exámenes no llega a 5', () => {
    const entregas = [entrega(1, 'AV1', 'examenes'), entrega(2, 'AV1', 'actividades')]
    const resultado = evaluarAlumno(
      alumno,
      MODELO_SEMIPRESENCIAL,
      entregas,
      notasDe({ 1: 4, 2: 10 })
    )
    expect(resultado.avaluaciones[0].nota).toBe(5.8)
    expect(resultado.avaluaciones[0].suspensa).toBe(true)
    expect(resultado.vaAConvocatoria).toBe(true)
  })

  it('suspende si alguna entrega baja del mínimo aunque la media suba', () => {
    const entregas = [entrega(1, 'AV1', 'examenes'), entrega(2, 'AV1', 'examenes')]
    const resultado = evaluarAlumno(
      alumno,
      MODELO_SEMIPRESENCIAL,
      entregas,
      notasDe({ 1: 3, 2: 10 })
    )
    expect(resultado.avaluaciones[0].categorias[0].media).toBe(6.5)
    expect(resultado.avaluaciones[0].suspensa).toBe(true)
  })
})

describe('evaluación presencial', () => {
  it('aplica 50 % exámenes + 25 % actividades + 25 % proyectos', () => {
    const entregas = [
      entrega(1, 'AV1', 'examenes'),
      entrega(2, 'AV1', 'actividades'),
      entrega(3, 'AV1', 'proyectos')
    ]
    const resultado = evaluarAlumno(
      alumno,
      MODELO_PRESENCIAL,
      entregas,
      notasDe({ 1: 6, 2: 4, 3: 8 })
    )
    // 0,5·6 + 0,25·4 + 0,25·8 = 6
    expect(resultado.avaluaciones[0].nota).toBe(6)
  })

  it('pondera la nota final con los pesos de las avaluaciones', () => {
    const entregas = [
      entrega(1, 'AV1', 'examenes'),
      entrega(2, 'AV2', 'examenes'),
      entrega(3, 'AV3', 'examenes')
    ]
    const resultado = evaluarAlumno(
      alumno,
      MODELO_PRESENCIAL,
      entregas,
      notasDe({ 1: 5, 2: 5, 3: 5 })
    )
    expect(resultado.notaFinal).toBe(5)
    expect(resultado.aprobado).toBe(true)
    expect(resultado.vaAConvocatoria).toBe(false)
  })

  it('marca la convocatoria si una avaluación queda suspensa', () => {
    const entregas = [entrega(1, 'AV1', 'examenes'), entrega(2, 'AV2', 'examenes')]
    const resultado = evaluarAlumno(
      alumno,
      MODELO_PRESENCIAL,
      entregas,
      notasDe({ 1: 8, 2: 2 })
    )
    expect(resultado.avaluaciones[1].suspensa).toBe(true)
    expect(resultado.vaAConvocatoria).toBe(true)
    expect(resultado.aprobado).toBe(false)
  })

  it('avisa y no suspende cuando una categoría no tiene entregas', () => {
    const entregas = [entrega(1, 'AV1', 'examenes')]
    const resultado = evaluarAlumno(alumno, MODELO_PRESENCIAL, entregas, notasDe({ 1: 7 }))
    expect(resultado.avaluaciones[0].nota).toBe(7)
    expect(resultado.avisos.some((a) => a.includes('sin entregas'))).toBe(true)
  })

  it('marca incompleta si hay entregas sin corregir', () => {
    const entregas = [entrega(1, 'AV1', 'examenes'), entrega(2, 'AV1', 'examenes')]
    const resultado = evaluarAlumno(alumno, MODELO_PRESENCIAL, entregas, notasDe({ 1: 7 }))
    expect(resultado.incompleta).toBe(true)
    expect(resultado.avaluaciones[0].categorias[0].media).toBe(3.5)
  })
})

describe('validarModelo', () => {
  it('acepta los modelos por defecto', () => {
    expect(validarModelo(MODELO_PRESENCIAL).ok).toBe(true)
    expect(validarModelo(MODELO_SEMIPRESENCIAL).ok).toBe(true)
  })

  it('detecta pesos de categorías que no suman 100', () => {
    const modelo = modeloPorDefecto('presencial')
    modelo.categorias[0].peso = 30
    const validacion = validarModelo(modelo)
    expect(validacion.ok).toBe(false)
    expect(validacion.errores.some((e) => e.includes('categorías'))).toBe(true)
  })

  it('detecta pesos de avaluaciones que no suman 100', () => {
    const modelo = modeloPorDefecto('semipresencial')
    modelo.avaluaciones = modelo.avaluaciones.slice(0, 2)
    expect(validarModelo(modelo).ok).toBe(false)
  })
})
