import { describe, expect, it } from 'vitest'
import { generarHtmlProgramacion } from '@shared/programacion-pdf'
import type { GrupoClase, ProgramacionAula } from '@shared/tipos'

const grupo: GrupoClase = {
  id: 1,
  curso_academico_id: 1,
  curso_academico_nombre: '2026/2027',
  ciclo_id: 'daw',
  ciclo_nombre: 'Desarrollo de Aplicaciones Web',
  curso: '2',
  modalidad: 'presencial',
  modulo_codigo: '0613',
  modulo_nombre: 'Desarrollo Web en entorno servidor',
  modulo_siglas: 'DWES',
  nombre: '2º DAW · DWES · Presencial',
  alumnos: 5,
  ra: 0,
  ce: 0,
  criterios: true,
  dias_semana: { 1: 2, 3: 1 },
  tutorias_semana: {},
  bloques_semana: { 1: ['08:00', '08:55'], 3: ['08:00'] },
  creado_en: '2026-10-01 09:00:00'
}

function fila(fecha: string, contenido: string): ProgramacionAula {
  return {
    id: 1,
    grupo_clase_id: 1,
    unidad_id: null,
    fecha,
    hora: null,
    orden: 0,
    contenido,
    desviacion: '',
    observaciones: '',
    creado_en: '',
    actualizado_en: ''
  }
}

describe('PDF de la programación de aula', () => {
  it('incluye todas las fechas, no solo la quincena visible', () => {
    const html = generarHtmlProgramacion(
      grupo,
      [fila('2026-11-18', 'Segunda fecha'), fila('2026-10-30', 'Primera fecha')],
      [],
      new Date(2026, 9, 30)
    )

    expect(html).toContain('30/10/2026')
    expect(html).toContain('18/11/2026')
    expect(html).toContain('Primera fecha')
    expect(html).toContain('Segunda fecha')
    expect(html).toContain('L 2 · X 1')
    expect(html).toContain('Programación de aula')
  })

  it('incluye las tutorías presenciales e individuales de la semipresencial', () => {
    const html = generarHtmlProgramacion(
      {
        ...grupo,
        modalidad: 'semipresencial',
        tutorias_semana: {
          1: { presencial: ['17:00', '19:00'], individual: ['18:00'] },
          3: { presencial: ['16:30'], individual: [] }
        }
      },
      [],
      []
    )

    expect(html).toContain('Tutorías semanales')
    expect(html).toContain('17:00')
    expect(html).toContain('19:00')
    expect(html).toContain('18:00')
    expect(html).toContain('16:30')
    expect(html).toContain('Miércoles')
  })

  it('escapa el contenido y muestra un aviso si no hay sesiones', () => {
    const html = generarHtmlProgramacion(
      grupo,
      [fila('2026-10-30', '<script>alert(1)</script>')],
      []
    )
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(generarHtmlProgramacion(grupo, [], [])).toContain('No hay sesiones registradas')
  })
})
