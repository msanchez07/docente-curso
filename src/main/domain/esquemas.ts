/**
 * Esquemas de validación (Zod) de los datos de entrada.
 *
 * Se aplican en el proceso principal antes de escribir en la base de datos, de
 * modo que la interfaz nunca pueda meter datos inconsistentes.
 */
import { z } from 'zod'

const LETRAS_DNI = 'TRWAGMYFPDXBNJZSQVHLCKE'

/** Valida un DNI español (8 dígitos y letra correcta). */
export function dniValido(dni: string): boolean {
  const coincidencia = /^(\d{8})([A-Z])$/.exec(dni.toUpperCase())
  if (!coincidencia) return false
  return LETRAS_DNI[Number(coincidencia[1]) % 23] === coincidencia[2]
}

/** Convierte cadenas vacías o solo espacios en `null`. */
export function normalizarOpcional<T>(valor: T): T | null {
  if (typeof valor === 'string' && valor.trim() === '') return null
  return valor
}

export const EsquemaAlumno = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(80),
  apellidos: z.string().trim().min(1, 'Los apellidos son obligatorios').max(120),
  dni: z
    .string()
    .trim()
    .nullish()
    .refine((v) => v == null || dniValido(v), 'DNI no válido (8 dígitos y letra)'),
  email: z.email('Correo no válido').nullish(),
  activo: z.boolean().optional()
})

export const EsquemaEntrega = z.object({
  modulo_codigo: z.string().regex(/^\d{4}$/, 'Código de módulo no válido'),
  titulo: z.string().trim().min(1, 'El título es obligatorio').max(160),
  descripcion: z.string().trim().nullish(),
  origen: z.string().trim().nullish(),
  tipo: z.enum(['tarea', 'practica', 'examen', 'proyecto']).default('tarea'),
  fecha_limite: z.string().trim().nullish(),
  /** Peso relativo de la entrega dentro de su RA (por defecto 1). */
  peso: z.number().min(0).max(100).default(1),
  avaluacion: z.string().trim().nullish(),
  categoria: z.string().trim().nullish()
})

export const EsquemaNota = z.object({
  entrega_alumno_id: z.number().int().positive(),
  ce_id: z.number().int().positive(),
  nota: z.number().min(0, 'La nota no puede ser negativa').max(10, 'La nota máxima es 10'),
  comentario: z.string().trim().nullish()
})

export const EsquemaConfig = z.object({
  curso_academico: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{4}$/, 'Formato esperado: 2025-2026'),
  escala_maxima: z.number().positive().max(100).default(10),
  umbral_aprobado: z.number().min(0).max(10).default(5),
  ruta_curso: z.string().trim().nullish()
})

export type AlumnoValidado = z.infer<typeof EsquemaAlumno>
export type EntregaValidada = z.infer<typeof EsquemaEntrega>
export type NotaValidada = z.infer<typeof EsquemaNota>
export type ConfigValidada = z.infer<typeof EsquemaConfig>
