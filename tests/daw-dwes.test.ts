import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Ciclo } from '@shared/tipos'
import { abrirBd, type Bd } from '../src/main/db/conexion'
import { sembrarCiclos } from '../src/main/db/seed'
import { crearGrupoClase } from '../src/main/db/repositorios/grupos-clase'
import { importarUnidadesProgramacion } from '../src/main/db/repositorios/unidades-programacion'

let db: Bd
let grupoId: number

beforeEach(() => {
  db = abrirBd(':memory:')
  const daw = JSON.parse(
    readFileSync(join(process.cwd(), 'resources', 'boe', 'daw.json'), 'utf-8')
  ) as Ciclo
  sembrarCiclos(db, [daw])
  grupoId = crearGrupoClase(db, {
    ciclo_id: 'daw',
    curso: '2',
    modalidad: 'presencial',
    modulo_codigo: '0613'
  }).id
})

describe('unidades de DWES en segundo de DAW', () => {
  it('acepta los criterios RA7.h y RA9.h del RD 405/2023', () => {
    const resultado = importarUnidadesProgramacion(
      db,
      grupoId,
      JSON.stringify({
        unidades: [
          { nombre: 'Serveis web', criterios: [{ raCodigo: 'RA7', ceCodigo: 'h' }] },
          {
            nombre: 'Aplicacions Web Híbrides',
            criterios: [{ raCodigo: 'RA9', ceCodigo: 'h' }]
          }
        ]
      })
    )
    expect(resultado.errores).toEqual([])
    expect(resultado.creados).toBe(2)
  })
})
