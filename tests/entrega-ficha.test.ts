import { describe, expect, it } from 'vitest'
import { generarHtmlFichaEntrega } from '../src/shared/entrega-ficha'
import type { EntregaClase, GrupoClase, UnidadProgramacion } from '../src/shared/tipos'

const grupo = {
  modalidad: 'presencial',
  modulo_nombre: 'Desarrollo Web en entorno servidor',
  curso_academico_nombre: '2026/2027'
} as GrupoClase

const entrega = {
  id: 1,
  titulo: 'Práctica de formularios',
  descripcion: 'Resumen de la práctica',
  enunciado: 'Crea un formulario validado.',
  problema: 'La clínica necesita registrar citas.',
  restricciones: 'PHP sin frameworks.',
  tipo: 'practica',
  fecha_limite: '2026-11-06',
  categoria_id: 'actividades',
  unidad_id: 1
} as EntregaClase

const unidad = {
  id: 1,
  codigo: 'UD1',
  nombre: 'Formularios'
} as UnidadProgramacion

describe('ficha HTML de una entrega', () => {
  it('incluye las tres secciones y los datos de la unidad', () => {
    const html = generarHtmlFichaEntrega({ grupo, entrega, unidad })
    expect(html).toContain('Práctica de formularios')
    expect(html).toContain('UD1 · Formularios')
    expect(html).toContain('Enunciado')
    expect(html).toContain('Descripción del problema')
    expect(html).toContain('Restricciones')
    expect(html).toContain('Crea un formulario validado.')
    expect(html).toContain('PHP sin frameworks.')
  })
})
