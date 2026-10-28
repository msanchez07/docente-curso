/**
 * Evidencias de una entrega: ficheros globales de la entrega.
 *
 * Se guardan en base64 para que el renderer pueda abrirlos o descargarlos sin
 * depender de rutas del sistema. El límite de tamaño protege la previsualización
 * en navegador (localStorage); en Electron la base SQLite admite el mismo formato.
 */
import type { Bd } from '../conexion'
import type { CategoriaEvidencia, EvidenciaClase, EvidenciaClaseEntrada } from '@shared/tipos'
import { obtenerEntregaClase } from './entregas-clase'

const MAX_BYTES = 4 * 1024 * 1024
const MAX_BASE64 = 6_000_000

interface FilaEvidencia {
  id: number
  entrega_id: number
  categoria: CategoriaEvidencia
  nombre: string
  tipo: string
  tamano: number
  datos: string
  creado_en: string
}

export function listarEvidenciasClase(
  db: Bd,
  grupoClaseId: number,
  entregaId: number
): EvidenciaClase[] {
  return db
    .prepare(
      `SELECT av.id, av.entrega_id, av.categoria, av.nombre, av.tipo, av.tamano, av.datos, av.creado_en
         FROM archivos_entrega_clase av
         JOIN entregas_clase e ON e.id = av.entrega_id
        WHERE e.grupo_clase_id = ? AND av.entrega_id = ?
        ORDER BY av.creado_en DESC, av.id DESC`
    )
    .all(grupoClaseId, entregaId) as FilaEvidencia[]
}

export function subirEvidenciasClase(
  db: Bd,
  grupoClaseId: number,
  entregaId: number,
  archivos: EvidenciaClaseEntrada[]
): EvidenciaClase[] {
  const entrega = obtenerEntregaClase(db, entregaId)
  if (!entrega || entrega.grupo_clase_id !== grupoClaseId) {
    throw new Error('La entrega no pertenece a este grupo.')
  }
  if (entrega.bloqueada) {
    throw new Error('La entrega está bloqueada: desbloquéala para cambiar sus evidencias.')
  }
  if (archivos.length === 0) return listarEvidenciasClase(db, grupoClaseId, entregaId)

  for (const archivo of archivos) {
    if (!archivo.nombre?.trim()) throw new Error('El archivo debe tener un nombre.')
    if (
      archivo.categoria &&
      !['material', 'solucion', 'apuntes', 'entrega', 'otro'].includes(archivo.categoria)
    ) {
      throw new Error('El tipo de evidencia no es válido.')
    }
    if (!archivo.datos?.trim()) throw new Error('El archivo está vacío.')
    if (!Number.isFinite(archivo.tamano) || archivo.tamano < 0) {
      throw new Error('El tamaño del archivo no es válido.')
    }
    if (archivo.tamano > MAX_BYTES || archivo.datos.length > MAX_BASE64) {
      throw new Error('Cada archivo puede ocupar como máximo 4 MB.')
    }
  }

  const insertar = db.prepare(
    `INSERT INTO archivos_entrega_clase
       (entrega_id, categoria, nombre, tipo, tamano, datos)
     VALUES (?, ?, ?, ?, ?, ?)`
  )

  db.transaction(() => {
    for (const archivo of archivos) {
      insertar.run(
        entregaId,
        archivo.categoria ?? 'material',
        archivo.nombre.trim(),
        archivo.tipo?.trim() || 'application/octet-stream',
        Math.round(archivo.tamano),
        archivo.datos
      )
    }
  })()

  return listarEvidenciasClase(db, grupoClaseId, entregaId)
}

export function borrarEvidenciaClase(db: Bd, id: number): boolean {
  const fila = db
    .prepare(
      `SELECT av.id, e.bloqueada
         FROM archivos_entrega_clase av
         JOIN entregas_clase e ON e.id = av.entrega_id
        WHERE av.id = ?`
    )
    .get(id) as { id: number; bloqueada: number } | undefined
  if (!fila) return false
  if (fila.bloqueada === 1) {
    throw new Error('La entrega está bloqueada: desbloquéala para borrar evidencias.')
  }
  return db.prepare('DELETE FROM archivos_entrega_clase WHERE id = ?').run(id).changes > 0
}
