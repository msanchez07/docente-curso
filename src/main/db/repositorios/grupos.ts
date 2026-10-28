/**
 * Repositorio de grupos.
 *
 * Un grupo es un módulo impartido en una modalidad concreta (presencial o
 * semipresencial), con su propio alumnado y su propio modelo de evaluación.
 */
import type { Grupo, GrupoDetalle, GrupoEntrada } from '@shared/tipos'
import type { Bd } from '../conexion'

const MODALIDADES = ['presencial', 'semipresencial']

function validar(entrada: GrupoEntrada): GrupoEntrada {
  const nombre = entrada.nombre?.trim()
  if (!nombre) throw new Error('El nombre del grupo es obligatorio.')
  if (!entrada.modulo_codigo) throw new Error('Hay que indicar el módulo.')
  if (!MODALIDADES.includes(entrada.modalidad)) {
    throw new Error('Modalidad no válida.')
  }
  return { modulo_codigo: entrada.modulo_codigo, nombre, modalidad: entrada.modalidad }
}

export function listarGrupos(db: Bd, moduloCodigo?: string): GrupoDetalle[] {
  const donde = moduloCodigo ? 'WHERE g.modulo_codigo = ?' : ''
  const parametros = moduloCodigo ? [moduloCodigo] : []
  return db
    .prepare(
      `SELECT g.id, g.modulo_codigo, g.nombre, g.modalidad,
              m.nombre AS modulo_nombre,
              (SELECT COUNT(*) FROM matriculas mt WHERE mt.grupo_id = g.id) AS alumnos
         FROM grupos g
         JOIN modulos m ON m.codigo = g.modulo_codigo
         ${donde}
        ORDER BY m.codigo, g.nombre`
    )
    .all(...parametros) as GrupoDetalle[]
}

export function obtenerGrupo(db: Bd, id: number): Grupo | null {
  const fila = db
    .prepare('SELECT id, modulo_codigo, nombre, modalidad FROM grupos WHERE id = ?')
    .get(id) as Grupo | undefined
  return fila ?? null
}

export function crearGrupo(db: Bd, entrada: GrupoEntrada): Grupo {
  const datos = validar(entrada)
  const resultado = db
    .prepare('INSERT INTO grupos (modulo_codigo, nombre, modalidad) VALUES (?, ?, ?)')
    .run(datos.modulo_codigo, datos.nombre, datos.modalidad)
  return obtenerGrupo(db, Number(resultado.lastInsertRowid))!
}

export function actualizarGrupo(db: Bd, id: number, entrada: GrupoEntrada): Grupo | null {
  if (!obtenerGrupo(db, id)) return null
  const datos = validar(entrada)
  db.prepare('UPDATE grupos SET modulo_codigo = ?, nombre = ?, modalidad = ? WHERE id = ?').run(
    datos.modulo_codigo,
    datos.nombre,
    datos.modalidad,
    id
  )
  return obtenerGrupo(db, id)
}

export function borrarGrupo(db: Bd, id: number): boolean {
  return db.prepare('DELETE FROM grupos WHERE id = ?').run(id).changes > 0
}
