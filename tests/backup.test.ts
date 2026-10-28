import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const { carpeta } = vi.hoisted(() => {
  const fs = require('node:fs')
  const os = require('node:os')
  const path = require('node:path')
  return { carpeta: fs.mkdtempSync(path.join(os.tmpdir(), 'docente-backup-')) }
})

vi.mock('electron', () => ({
  app: { getPath: () => carpeta },
  dialog: { showOpenDialog: vi.fn(), showSaveDialog: vi.fn() },
  shell: { openPath: vi.fn() }
}))

import type { Ciclo } from '@shared/tipos'
import { modeloPorDefecto } from '@shared/modelo'
import { obtenerBd } from '../src/main/bd'
import { sembrarCiclos } from '../src/main/db/seed'
import { crearGrupoClase, listarGruposClase } from '../src/main/db/repositorios/grupos-clase'
import { crearAlumnoEnGrupoClase } from '../src/main/db/repositorios/alumnos-clase'
import { guardarCriterios } from '../src/main/db/repositorios/criterios-grupo'
import {
  crearBackupGrupo,
  importarBackupDesdeRuta,
  listarBackups
} from '../src/main/backup/servicio'

const ciclo: Ciclo = {
  id: 'daw',
  denominacion: 'Desarrollo de Aplicaciones Web',
  nivel: 'Formación Profesional de Grado Superior',
  familia_profesional: 'Informática y Comunicaciones',
  duracion_horas: 2000,
  ects: 120,
  rd: 'RD de prueba',
  boe_url: 'https://www.boe.es/',
  modulos: [
    {
      codigo: '0613',
      nombre: 'Desarrollo Web en entorno servidor',
      siglas: 'DWES',
      curso: '2',
      ects: 12,
      horas_minimas_boe: 100,
      ra: []
    }
  ]
}

describe('copias de seguridad por grupo', () => {
  let grupoId = 0

  beforeEach(() => {
    const db = obtenerBd()
    if (listarGruposClase(db).length === 0) {
      sembrarCiclos(db, [ciclo])
      const grupo = crearGrupoClase(db, {
        ciclo_id: 'daw',
        curso: '2',
        modalidad: 'presencial',
        modulo_codigo: '0613'
      })
      grupoId = grupo.id
      crearAlumnoEnGrupoClase(db, grupo.id, {
        nombre: 'Ana',
        apellidos: 'García',
        dni: '11111111H'
      })
      guardarCriterios(db, grupo.id, modeloPorDefecto('presencial'))
      db.prepare(
        `INSERT INTO config (clave, valor) VALUES ('backup_carpeta', ?)
         ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`
      ).run(carpeta)
    } else {
      grupoId = listarGruposClase(db)[0].id
    }
  })

  afterAll(() => {
    rmSync(carpeta, { recursive: true, force: true })
  })

  it('crea un archivo por grupo y restaura su contenido al importarlo', async () => {
    const db = obtenerBd()
    const resultado = await crearBackupGrupo(grupoId)
    expect(resultado.ok).toBe(true)
    expect(resultado.ruta).toContain('.json')
    expect(await listarBackups()).toHaveLength(1)

    db.prepare('DELETE FROM alumnos WHERE dni = ?').run('11111111H')
    expect(db.prepare('SELECT COUNT(*) AS n FROM alumnos').get()).toEqual({ n: 0 })

    const importado = await importarBackupDesdeRuta(resultado.ruta!)
    expect(importado.ok).toBe(true)
    expect(importado.grupo_id).toBeTruthy()
    expect(db.prepare('SELECT COUNT(*) AS n FROM alumnos WHERE dni = ?').get('11111111H')).toEqual({
      n: 1
    })
    expect(listarGruposClase(db)).toHaveLength(1)
  })
})
