import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { abrirBd } from '../src/main/db/conexion'
import { importarAlumnos, listarAlumnos } from '../src/main/db/repositorios/alumnos'
import { crearGrupo } from '../src/main/db/repositorios/grupos'
import { sembrarCiclos } from '../src/main/db/seed'
import type { Ciclo } from '@shared/tipos'

const rutaEjemplo = join(import.meta.dirname, '..', 'ejemplos', 'alumnos-ejemplo.json')

const cicloMinimo: Ciclo = {
  id: 'test',
  denominacion: 'Ciclo de prueba',
  nivel: 'FP',
  familia_profesional: 'Informática',
  duracion_horas: 2000,
  ects: 120,
  rd: 'RD de prueba',
  boe_url: 'https://www.boe.es/',
  modulos: [
    {
      codigo: '0001',
      nombre: 'Módulo uno',
      ects: 10,
      horas_minimas_boe: 100,
      ra: [{ codigo: 'RA1', numero: 1, descripcion: 'RA uno', ce: [{ codigo: 'a', descripcion: 'CE a' }] }]
    },
    {
      codigo: '0002',
      nombre: 'Módulo dos',
      ects: 10,
      horas_minimas_boe: 100,
      ra: [{ codigo: 'RA1', numero: 1, descripcion: 'RA uno', ce: [{ codigo: 'a', descripcion: 'CE a' }] }]
    }
  ]
}

describe('fichero de ejemplo de alumnado', () => {
  it('existe y es un JSON válido', () => {
    const contenido = readFileSync(rutaEjemplo, 'utf-8')
    expect(() => JSON.parse(contenido)).not.toThrow()
  })

  it('se importa entero y matricula en el grupo indicado', () => {
    const db = abrirBd(':memory:')
    sembrarCiclos(db, [cicloMinimo])
    const grupo = crearGrupo(db, {
      modulo_codigo: '0001',
      nombre: 'Presencial',
      modalidad: 'presencial'
    })
    const otroGrupo = crearGrupo(db, {
      modulo_codigo: '0002',
      nombre: 'Semipresencial',
      modalidad: 'semipresencial'
    })

    const contenido = readFileSync(rutaEjemplo, 'utf-8')
    const resultado = importarAlumnos(db, contenido, grupo.id)

    expect(resultado.creados).toBe(8)
    expect(resultado.errores).toEqual([])

    const enGrupo = listarAlumnos(db, { grupoId: grupo.id })
    expect(enGrupo).toHaveLength(8)
    expect(enGrupo[0]).toMatchObject({
      nombre: 'Lucía',
      apellidos: 'Fernández Ruiz',
      email: 'lucia.fernandez@ejemplo.com',
      grupos: [grupo.id]
    })

    // La columna «grupos» del fichero se ignora: nadie queda en el otro grupo.
    expect(listarAlumnos(db, { grupoId: otroGrupo.id })).toHaveLength(0)
    db.close()
  })
})
