/**
 * Base de datos de la aplicación: instancia única y siembra inicial.
 *
 * El fichero vive en el directorio de datos del usuario (`userData`), de modo
 * que los datos del alumnado nunca salen de la máquina.
 */
import { app } from 'electron'
import { join } from 'node:path'
import { leerCatalogoHorarios, leerCiclosBoe } from './boe/archivos'
import { abrirBd, type Bd } from './db/conexion'
import { sembrarCatalogo, sembrarCiclos } from './db/seed'

let instancia: Bd | null = null

export function rutaBd(): string {
  return join(app.getPath('userData'), 'gestion-entregas.db')
}

export function obtenerBd(): Bd {
  if (!instancia) instancia = abrirBd(rutaBd())
  return instancia
}

/** Abre la base de datos y siembra los datos del BOE (idempotente). */
export function inicializarBd(): void {
  const db = obtenerBd()
  const ciclos = leerCiclosBoe()
  if (ciclos.length > 0) sembrarCiclos(db, ciclos)
  const catalogo = leerCatalogoHorarios()
  if (catalogo) sembrarCatalogo(db, catalogo)
}

export function cerrarBd(): void {
  instancia?.close()
  instancia = null
}
