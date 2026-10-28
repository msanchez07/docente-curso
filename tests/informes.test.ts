import { describe, expect, it } from 'vitest'
import { modeloPorDefecto } from '../src/main/domain/modelo'
import { generarCsv, generarHtml, type DatosInforme } from '../src/main/informes/plantilla'

const datos: DatosInforme = {
  titulo: 'Informe del módulo 0613 — Desarrollo Web en entorno servidor',
  ciclo: {
    denominacion: 'Desarrollo de Aplicaciones Web',
    rd: 'RD 686/2010, de 20 de mayo',
    rd_actualizacion: 'RD 405/2023, de 29 de mayo',
    boe_url: 'https://www.boe.es/'
  },
  modulo: {
    codigo: '0613',
    nombre: 'Desarrollo Web en entorno servidor',
    ects: 12,
    horas_minimas_boe: 100
  },
  curso: '2025-2026',
  resumen: {
    grupo: { id: 1, modulo_codigo: '0613', nombre: 'Presencial', modalidad: 'semipresencial' },
    modulo: { codigo: '0613', nombre: 'Desarrollo Web en entorno servidor' },
    modelo: modeloPorDefecto('semipresencial'),
    alumnos: []
  },
  alumnos: [
    {
      alumno: {
        id: 1,
        nombre: 'Ana',
        apellidos: 'García',
        dni: null,
        email: null,
        activo: true,
        grupos: []
      },
      avaluaciones: [
        {
          avaluacionId: 'AV1',
          nombre: '1ª evaluación',
          peso: 33.3,
          nota: 7.5,
          suspensa: false,
          motivos: [],
          categorias: []
        },
        {
          avaluacionId: 'AV2',
          nombre: '2ª evaluación',
          peso: 33.3,
          nota: null,
          suspensa: false,
          motivos: [],
          categorias: []
        },
        {
          avaluacionId: 'AV3',
          nombre: '3ª evaluación',
          peso: 33.4,
          nota: null,
          suspensa: false,
          motivos: [],
          categorias: []
        }
      ],
      notaFinal: 7.5,
      aprobado: true,
      incompleta: false,
      avisos: [],
      vaAConvocatoria: false
    }
  ]
}

describe('informe CSV', () => {
  it('incluye la cabecera con las avaluaciones y sus pesos', () => {
    const [cabecera] = generarCsv(datos).split('\n')
    expect(cabecera).toBe('Alumno;AV1 (33.3%);AV2 (33.3%);AV3 (33.4%);Nota final;Aprobado')
  })

  it('incluye una fila por alumno con la nota en formato español', () => {
    const [, fila] = generarCsv(datos).split('\n')
    expect(fila).toBe('García, Ana;7,50;;;7,50;Sí')
  })

  it('entrecomilla los valores con separador', () => {
    const conComa: DatosInforme = {
      ...datos,
      alumnos: [
        {
          ...datos.alumnos[0],
          alumno: { ...datos.alumnos[0].alumno, apellidos: 'García; López' }
        }
      ]
    }
    expect(generarCsv(conComa)).toContain('"García; López, Ana"')
  })
})

describe('informe HTML', () => {
  it('incluye el módulo, la norma, la modalidad y la fórmula', () => {
    const html = generarHtml(datos)
    expect(html).toContain('Desarrollo Web en entorno servidor')
    expect(html).toContain('RD 686/2010')
    expect(html).toContain('RD 405/2023')
    expect(html).toContain('Semipresencial')
    expect(html).toContain('Exámenes 70 %')
  })

  it('incluye al alumnado y su estado', () => {
    const html = generarHtml(datos)
    expect(html).toContain('García, Ana')
    expect(html).toContain('Apto')
  })

  it('escapa el HTML de los datos', () => {
    const conHtml: DatosInforme = {
      ...datos,
      modulo: { ...datos.modulo, nombre: '<script>alert(1)</script>' }
    }
    const html = generarHtml(conHtml)
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('marca como «A convocatoria» al alumnado con avaluaciones suspensas', () => {
    const suspenso: DatosInforme = {
      ...datos,
      alumnos: [
        {
          ...datos.alumnos[0],
          notaFinal: 4,
          aprobado: false,
          vaAConvocatoria: true
        }
      ]
    }
    expect(generarHtml(suspenso)).toContain('A convocatoria')
  })
})
