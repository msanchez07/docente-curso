import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { abrirBd, type Bd } from '../src/main/db/conexion'
import { listarCatalogo } from '../src/main/db/repositorios/catalogo'
import { listarCiclos } from '../src/main/db/repositorios/boe'
import { crearGrupoClase, listarGruposClase } from '../src/main/db/repositorios/grupos-clase'
import { sembrarCatalogo } from '../src/main/db/seed'
import type { CatalogoHorarios } from '../src/shared/tipos'

const catalogo: CatalogoHorarios = {
  curso_academico: '2026/2027',
  fuente: 'test',
  actualizado: '2026-10-31',
  niveles: ['GS'],
  ciclos: [
    {
      id: 'gs-test',
      denominacion: 'Ciclo de prueba',
      nivel: 'GS',
      familia_profesional: 'Informática y Comunicaciones',
      abreviatura: 'CP',
      modulos: [
        {
          curso: '1',
          codigo: '0001',
          nombre: 'Programación',
          horas_semanales: 5,
          horas_anuales: 166
        },
        {
          curso: '2',
          codigo: '0002',
          nombre: 'Bases de datos',
          horas_semanales: 6,
          horas_anuales: 200
        }
      ]
    },
    {
      id: 'gs-otro',
      denominacion: 'Otro ciclo',
      nivel: 'GS',
      familia_profesional: 'Informática y Comunicaciones',
      abreviatura: 'OT',
      modulos: [
        {
          curso: '1',
          codigo: '0001',
          nombre: 'Programación',
          horas_semanales: 5,
          horas_anuales: 166
        }
      ]
    }
  ]
}

describe('catálogo de horarios', () => {
  it('el catálogo empaquetado cubre los ciclos con 30 h semanales por curso', () => {
    const datos = JSON.parse(
      readFileSync(join(process.cwd(), 'resources/horarios/catalogo-2026-27.json'), 'utf-8')
    ) as CatalogoHorarios

    expect(datos.ciclos.length).toBeGreaterThan(150)
    for (const ciclo of datos.ciclos) {
      for (const curso of ['1', '2'] as const) {
        const modulos = ciclo.modulos.filter((modulo) => modulo.curso === curso)
        expect(modulos.length, `${ciclo.id} · ${curso}º`).toBeGreaterThan(0)
        expect(
          modulos.reduce((total, modulo) => total + (modulo.horas_semanales ?? 0), 0),
          `${ciclo.id} · ${curso}º`
        ).toBe(30)
      }
    }
  })

  let db: Bd

  beforeEach(() => {
    db = abrirBd(':memory:')
    sembrarCatalogo(db, catalogo)
  })

  it('lista ciclos y módulos del catálogo', () => {
    const lista = listarCatalogo(db)
    expect(lista).toHaveLength(2)
    expect(lista[0]).toMatchObject({
      id: 'gs-test',
      denominacion: 'Ciclo de prueba',
      abreviatura: 'CP'
    })
    expect(lista[0].modulos.map((modulo) => modulo.codigo)).toEqual(['0001', '0002'])
    expect(lista[1]).toMatchObject({ id: 'gs-otro', denominacion: 'Otro ciclo' })
  })

  it('no mezcla los ciclos del catálogo con los ciclos del BOE', () => {
    expect(listarCiclos(db)).toEqual([])
  })

  it('materializa el ciclo y el módulo al crear un grupo', () => {
    const grupo = crearGrupoClase(db, {
      ciclo_id: 'gs-test',
      curso: '1',
      modalidad: 'presencial',
      modulo_codigo: '0001'
    })

    expect(grupo.nombre).toBe('1º CP · PROG · Presencial')
    expect(grupo.modulo_nombre).toBe('Programación')
    expect(listarGruposClase(db)).toHaveLength(1)

    const ciclo = db.prepare('SELECT abreviatura, origen FROM ciclos WHERE id = ?').get('gs-test')
    expect(ciclo).toEqual({ abreviatura: 'CP', origen: 'horario' })
  })

  it('permite usar el mismo código de módulo en otro ciclo del catálogo', () => {
    crearGrupoClase(db, {
      ciclo_id: 'gs-test',
      curso: '1',
      modalidad: 'presencial',
      modulo_codigo: '0001'
    })
    const otro = crearGrupoClase(db, {
      ciclo_id: 'gs-otro',
      curso: '1',
      modalidad: 'presencial',
      modulo_codigo: '0001'
    })

    expect(otro.nombre).toBe('1º OT · PROG · Presencial')
    expect(listarGruposClase(db)).toHaveLength(2)
  })
})
