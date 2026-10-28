import type {
  BloqueSemana,
  BloquesSemana,
  Curso,
  DiaSemana,
  DiasSemana,
  Modalidad,
  TipoBloqueHorario,
  TutoriasSemana
} from './tipos'

/** Cursos válidos del ciclo. */
export const CURSOS: Curso[] = ['1', '2']

/** Modalidades válidas. */
export const MODALIDADES: Modalidad[] = ['presencial', 'semipresencial']

/** Días de la semana en el orden habitual de un horario (lunes a domingo). */
export const DIAS_SEMANA: { valor: DiaSemana; etiqueta: string; corto: string }[] = [
  { valor: 1, etiqueta: 'Lunes', corto: 'L' },
  { valor: 2, etiqueta: 'Martes', corto: 'M' },
  { valor: 3, etiqueta: 'Miércoles', corto: 'X' },
  { valor: 4, etiqueta: 'Jueves', corto: 'J' },
  { valor: 5, etiqueta: 'Viernes', corto: 'V' },
  { valor: 6, etiqueta: 'Sábado', corto: 'S' },
  { valor: 0, etiqueta: 'Domingo', corto: 'D' }
]

/**
 * Limpia el horario semanal que llega del formulario o de la base de datos:
 * solo deja días válidos con un número entero de sesiones mayor que cero.
 */
export function normalizarDiasSemana(valor: unknown): DiasSemana {
  if (!valor || typeof valor !== 'object') return {}
  const origen = valor as Record<string, unknown>
  const dias: DiasSemana = {}
  for (const dia of DIAS_SEMANA) {
    const cantidad = Number(origen[String(dia.valor)])
    if (Number.isFinite(cantidad) && cantidad > 0) {
      dias[dia.valor] = Math.min(20, Math.floor(cantidad))
    }
  }
  return dias
}

/** Texto corto del horario semanal: «L 2 · X 2 · V 1». */
export function resumenDiasSemana(dias: DiasSemana | undefined): string {
  if (!dias) return ''
  return DIAS_SEMANA.filter((dia) => (dias[dia.valor] ?? 0) > 0)
    .map((dia) => `${dia.corto} ${dias[dia.valor]}`)
    .join(' · ')
}

const RE_HORA = /^([01]?\d|2[0-3]):[0-5]\d$/

/** Bloques lectivos de 55 minutos y sus recreos. */
export interface BloqueHorario {
  inicio: string
  fin: string
  turno: 'mañana' | 'tarde'
}

export const BLOQUES_HORARIO: BloqueHorario[] = [
  { inicio: '08:00', fin: '08:55', turno: 'mañana' },
  { inicio: '08:55', fin: '09:50', turno: 'mañana' },
  { inicio: '09:50', fin: '10:45', turno: 'mañana' },
  { inicio: '11:15', fin: '12:10', turno: 'mañana' },
  { inicio: '12:10', fin: '13:05', turno: 'mañana' },
  { inicio: '13:05', fin: '14:00', turno: 'mañana' },
  { inicio: '14:40', fin: '15:35', turno: 'tarde' },
  { inicio: '15:35', fin: '16:30', turno: 'tarde' },
  { inicio: '16:30', fin: '17:25', turno: 'tarde' },
  { inicio: '18:20', fin: '19:15', turno: 'tarde' },
  { inicio: '19:15', fin: '20:10', turno: 'tarde' },
  { inicio: '20:10', fin: '21:05', turno: 'tarde' }
]

const INICIOS_BLOQUE = new Set(BLOQUES_HORARIO.map((bloque) => bloque.inicio))

const TIPOS_BLOQUE = new Set<TipoBloqueHorario>(['sesion', 'colectiva', 'individual'])

function bloqueDe(valor: unknown): BloqueSemana | null {
  if (typeof valor === 'string') {
    return INICIOS_BLOQUE.has(valor) ? { inicio: valor, tipo: 'sesion' } : null
  }
  if (!valor || typeof valor !== 'object') return null
  const datos = valor as Record<string, unknown>
  const inicio = typeof datos.inicio === 'string' ? datos.inicio : ''
  const tipo = datos.tipo
  if (!INICIOS_BLOQUE.has(inicio) || typeof tipo !== 'string' || !TIPOS_BLOQUE.has(tipo as never)) {
    return null
  }
  return { inicio, tipo: tipo as TipoBloqueHorario }
}

/**
 * Limpia los bloques semanales: horas conocidas, sin duplicados y ordenadas.
 * Acepta también el formato antiguo de una lista de horas (todas como sesión).
 */
export function normalizarBloquesSemana(valor: unknown): BloquesSemana {
  if (!valor || typeof valor !== 'object') return {}
  const origen = valor as Record<string, unknown>
  const bloques: BloquesSemana = {}
  for (const dia of DIAS_SEMANA) {
    const lista = origen[String(dia.valor)]
    if (!Array.isArray(lista)) continue
    const porInicio = new Map<string, BloqueSemana>()
    for (const item of lista) {
      const bloque = bloqueDe(item)
      if (bloque) porInicio.set(bloque.inicio, bloque)
    }
    const ordenados = [...porInicio.values()].sort(
      (a, b) =>
        BLOQUES_HORARIO.findIndex((bloque) => bloque.inicio === a.inicio) -
        BLOQUES_HORARIO.findIndex((bloque) => bloque.inicio === b.inicio)
    )
    if (ordenados.length > 0) bloques[dia.valor] = ordenados
  }
  return bloques
}

/** Convierte los bloques de sesión en el número de sesiones de cada día. */
export function contarBloques(bloques: BloquesSemana): DiasSemana {
  const dias: DiasSemana = {}
  for (const dia of DIAS_SEMANA) {
    const cantidad = (bloques[dia.valor] ?? []).filter((bloque) => bloque.tipo === 'sesion').length
    if (cantidad > 0) dias[dia.valor] = cantidad
  }
  return dias
}

/** Reparte un número de sesiones en los primeros bloques, para datos antiguos. */
export function bloquesDesdeConteos(dias: DiasSemana | undefined): BloquesSemana {
  if (!dias) return {}
  const bloques: BloquesSemana = {}
  for (const dia of DIAS_SEMANA) {
    const cantidad = Math.max(0, Math.min(BLOQUES_HORARIO.length, Number(dias[dia.valor]) || 0))
    if (cantidad > 0) {
      bloques[dia.valor] = BLOQUES_HORARIO.slice(0, cantidad).map((bloque) => ({
        inicio: bloque.inicio,
        tipo: 'sesion' as const
      }))
    }
  }
  return bloques
}

/** Tutorías derivadas del calendario, para el resumen del grupo y el PDF. */
export function tutoriasDesdeBloques(bloques: BloquesSemana): TutoriasSemana {
  const tutorias: TutoriasSemana = {}
  for (const dia of DIAS_SEMANA) {
    const presencial: string[] = []
    const individual: string[] = []
    for (const bloque of bloques[dia.valor] ?? []) {
      if (bloque.tipo === 'colectiva') presencial.push(bloque.inicio)
      if (bloque.tipo === 'individual') individual.push(bloque.inicio)
    }
    if (presencial.length > 0 || individual.length > 0) {
      tutorias[dia.valor] = { presencial, individual }
    }
  }
  return tutorias
}

function horaValida(valor: unknown): string | null {
  if (typeof valor !== 'string') return null
  const hora = valor.trim()
  return RE_HORA.test(hora) ? hora : null
}

function horasDe(valor: unknown): string[] {
  const lista = Array.isArray(valor) ? valor : typeof valor === 'string' ? [valor] : []
  return [...new Set(lista.map(horaValida).filter((hora): hora is string => hora !== null))]
}

/**
 * Limpia las tutorías semanales: acepta varias horas por día y tipo, descarta
 * las que no son válidas y elimina los días sin ninguna tutoría. También
 * admite el formato antiguo de una sola hora por tipo.
 */
export function normalizarTutoriasSemana(valor: unknown): TutoriasSemana {
  if (!valor || typeof valor !== 'object') return {}
  const origen = valor as Record<string, unknown>
  const tutorias: TutoriasSemana = {}
  for (const dia of DIAS_SEMANA) {
    const datos = origen[String(dia.valor)]
    if (!datos || typeof datos !== 'object') continue
    const diaDatos = datos as Record<string, unknown>
    const presencial = horasDe(diaDatos.presencial)
    const individual = horasDe(diaDatos.individual)
    if (presencial.length > 0 || individual.length > 0) {
      tutorias[dia.valor] = { presencial, individual }
    }
  }
  return tutorias
}

/** Texto corto de tutorías: «L P 17:00, 18:00 · L I 19:00». */
export function resumenTutoriasSemana(tutorias: TutoriasSemana | undefined): string {
  if (!tutorias) return ''
  const partes: string[] = []
  for (const dia of DIAS_SEMANA) {
    const datos = tutorias[dia.valor]
    if (!datos) continue
    if (datos.presencial.length > 0) partes.push(`${dia.corto} C ${datos.presencial.join(', ')}`)
    if (datos.individual.length > 0) partes.push(`${dia.corto} I ${datos.individual.join(', ')}`)
  }
  return partes.join(' · ')
}

/** Etiqueta legible de una modalidad. */
export function etiquetaModalidad(modalidad: Modalidad): string {
  return modalidad === 'semipresencial' ? 'Semipresencial' : 'Presencial'
}

const PALABRAS_VACIAS = new Set([
  'de',
  'del',
  'la',
  'las',
  'el',
  'los',
  'y',
  'e',
  'o',
  'en',
  'a',
  'al',
  'con',
  'para',
  'por'
])

/**
 * Siglas de respaldo cuando el módulo no trae las suyas: iniciales de las
 * palabras significativas («Desarrollo Web en entorno servidor» → DWES).
 * Si solo queda una letra, se usan sus cuatro primeras.
 */
export function siglasDesdeNombre(nombre: string): string {
  const palabras = nombre
    .split(/\s+/)
    .map((palabra) => palabra.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter((palabra) => palabra && !PALABRAS_VACIAS.has(palabra.toLowerCase()))

  const iniciales = palabras
    .map((palabra) => palabra[0])
    .join('')
    .toUpperCase()
  if (iniciales.length >= 2) return iniciales

  const limpio = nombre.replace(/[^\p{L}]/gu, '')
  return limpio.slice(0, 4).toUpperCase()
}

/** Nombre visible del grupo de clase, generado a partir de sus datos. */
export function nombreGrupoClase(
  cicloId: string,
  curso: Curso,
  modalidad: Modalidad,
  moduloSiglas: string
): string {
  return `${curso}º ${cicloId.toUpperCase()} · ${moduloSiglas} · ${etiquetaModalidad(modalidad)}`
}
