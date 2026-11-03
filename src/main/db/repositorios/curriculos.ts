/**
 * Importación de currículos (ciclo, módulos, RA y CE) desde JSON.
 *
 * La validación de estructura vive en `@shared/importar-curriculos`; aquí se
 * completa lo que falte con el catálogo y se escribe en las tablas del BOE.
 */
import type { Ciclo, ResultadoImportacionCurriculo } from '@shared/tipos'
import { parsearCurriculos, resumirCurriculos } from '@shared/importar-curriculos'
import type { NivelCatalogo } from '@shared/tipos'
import type { Bd } from '../conexion'
import { sembrarCiclos } from '../seed'

const NIVEL_COMPLETO: Record<NivelCatalogo, string> = {
  GB: 'Formación Profesional de Grado Básico',
  GM: 'Formación Profesional de Grado Medio',
  GS: 'Formación Profesional de Grado Superior',
  CE: 'Curso de Especialización'
}

interface FilaCatalogo {
  denominacion: string
  nivel: NivelCatalogo
  familia_profesional: string
  abreviatura: string
}

function completarConCatalogo(db: Bd, ciclo: Ciclo, avisos: string[]): Ciclo {
  let fila: FilaCatalogo | undefined
  try {
    fila = db
      .prepare(
        `SELECT denominacion, nivel, familia_profesional, abreviatura
           FROM catalogo_ciclos WHERE id = ?`
      )
      .get(ciclo.id) as FilaCatalogo | undefined
  } catch {
    fila = undefined
  }

  if (!fila) {
    avisos.push(
      `El ciclo «${ciclo.id}» no está en el catálogo de horarios; se importará igualmente, pero sus grupos no se enlazarán con el catálogo.`
    )
    return ciclo
  }

  return {
    ...ciclo,
    denominacion: ciclo.denominacion || fila.denominacion,
    nivel: ciclo.nivel || NIVEL_COMPLETO[fila.nivel] || fila.nivel,
    familia_profesional: ciclo.familia_profesional || fila.familia_profesional,
    abreviatura: ciclo.abreviatura?.trim() || fila.abreviatura || undefined
  }
}

export function importarCurriculo(db: Bd, texto: string): ResultadoImportacionCurriculo {
  const { ciclos, errores } = parsearCurriculos(texto)
  if (errores.length > 0) {
    return { ciclos: 0, modulos: 0, ra: 0, ce: 0, ids: [], avisos: [], errores }
  }

  const avisos: string[] = []
  const preparados = ciclos.map((ciclo) => completarConCatalogo(db, ciclo, avisos))
  const resumen = resumirCurriculos(preparados)

  try {
    sembrarCiclos(db, preparados)
  } catch (error) {
    return {
      ciclos: 0,
      modulos: 0,
      ra: 0,
      ce: 0,
      ids: [],
      avisos,
      errores: [`No se pudo guardar el currículo: ${(error as Error).message}`]
    }
  }

  return {
    ciclos: preparados.length,
    modulos: resumen.modulos,
    ra: resumen.ra,
    ce: resumen.ce,
    ids: preparados.map((ciclo) => ciclo.id),
    avisos,
    errores: []
  }
}
