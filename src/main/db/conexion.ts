/**
 * Conexión y migraciones de la base de datos local (SQLite).
 *
 * El módulo no depende de Electron a propósito: recibe la ruta y así puede
 * usarse también desde las pruebas.
 */
import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import esquema from './esquema.sql?raw'
import esquemaV2 from './esquema-v2.sql?raw'
import esquemaV3 from './esquema-v3.sql?raw'
import esquemaV4 from './esquema-v4.sql?raw'
import esquemaV5 from './esquema-v5.sql?raw'
import esquemaV6 from './esquema-v6.sql?raw'
import esquemaV7 from './esquema-v7.sql?raw'
import esquemaV8 from './esquema-v8.sql?raw'
import esquemaV9 from './esquema-v9.sql?raw'
import esquemaV10 from './esquema-v10.sql?raw'
import esquemaV11 from './esquema-v11.sql?raw'
import esquemaV12 from './esquema-v12.sql?raw'
import esquemaV13 from './esquema-v13.sql?raw'
import esquemaV14 from './esquema-v14.sql?raw'
import esquemaV15 from './esquema-v15.sql?raw'
import esquemaV16 from './esquema-v16.sql?raw'
import esquemaV17 from './esquema-v17.sql?raw'
import esquemaV18 from './esquema-v18.sql?raw'
import esquemaV19 from './esquema-v19.sql?raw'
import esquemaV20 from './esquema-v20.sql?raw'
import esquemaV21 from './esquema-v21.sql?raw'
import esquemaV22 from './esquema-v22.sql?raw'
import esquemaV23 from './esquema-v23.sql?raw'
import esquemaV24 from './esquema-v24.sql?raw'
import esquemaV25 from './esquema-v25.sql?raw'
import esquemaV26 from './esquema-v26.sql?raw'
import esquemaV27 from './esquema-v27.sql?raw'
import esquemaV28 from './esquema-v28.sql?raw'
import esquemaV29 from './esquema-v29.sql?raw'

export type Bd = Database.Database

interface Migracion {
  version: number
  sql: string
}

/** Migraciones en orden. Cada una se aplica una sola vez (PRAGMA user_version). */
const MIGRACIONES: Migracion[] = [
  { version: 1, sql: esquema },
  { version: 2, sql: esquemaV2 },
  { version: 3, sql: esquemaV3 },
  { version: 4, sql: esquemaV4 },
  { version: 5, sql: esquemaV5 },
  { version: 6, sql: esquemaV6 },
  { version: 7, sql: esquemaV7 },
  { version: 8, sql: esquemaV8 },
  { version: 9, sql: esquemaV9 },
  { version: 10, sql: esquemaV10 },
  { version: 11, sql: esquemaV11 },
  { version: 12, sql: esquemaV12 },
  { version: 13, sql: esquemaV13 },
  { version: 14, sql: esquemaV14 },
  { version: 15, sql: esquemaV15 },
  { version: 16, sql: esquemaV16 },
  { version: 17, sql: esquemaV17 },
  { version: 18, sql: esquemaV18 },
  { version: 19, sql: esquemaV19 },
  { version: 20, sql: esquemaV20 },
  { version: 21, sql: esquemaV21 },
  { version: 22, sql: esquemaV22 },
  { version: 23, sql: esquemaV23 },
  { version: 24, sql: esquemaV24 },
  { version: 25, sql: esquemaV25 },
  { version: 26, sql: esquemaV26 },
  { version: 27, sql: esquemaV27 },
  { version: 28, sql: esquemaV28 },
  { version: 29, sql: esquemaV29 }
]

export function abrirBd(ruta: string): Bd {
  if (ruta !== ':memory:') mkdirSync(dirname(ruta), { recursive: true })
  const db = new Database(ruta)
  if (ruta !== ':memory:') db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  migrar(db)
  return db
}

export function migrar(db: Bd): void {
  const version = db.pragma('user_version', { simple: true }) as number
  for (const migracion of MIGRACIONES) {
    if (migracion.version > version) {
      db.exec(migracion.sql)
      db.pragma(`user_version = ${migracion.version}`)
    }
  }
}
