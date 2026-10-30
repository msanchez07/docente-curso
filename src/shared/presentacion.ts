/**
 * Presentación del módulo: plantilla editable, motor de renderizado y datos.
 *
 * La plantilla es HTML con marcadores tipo Mustache:
 *   {{campo}}            valor escapado
 *   {{{campo}}}          HTML sin escapar
 *   {{#lista}}…{{/lista}} repetir por elemento
 *   {{^lista}}…{{/lista}} si la lista está vacía
 *
 * Así el usuario puede cambiar el estilo o la estructura y la presentación se
 * vuelve a generar con los datos del grupo.
 */
import { PLANTILLA_PRESENTACION_POR_DEFECTO } from './presentacion-plantilla'
import type {
  EventoEvaluacionClase,
  GrupoClase,
  ModeloEvaluacion,
  PresentacionConfig,
  UnidadProgramacion
} from './tipos'

export interface UnidadPresentacion {
  codigo: string
  nombre: string
  contenidos: string
  ra: string
  ce: string
  fechas: string
  sesiones: number
}

export interface TrimestrePresentacion {
  nombre: string
  unidades: UnidadPresentacion[]
}

export interface ExamenPresentacion {
  titulo: string
  trimestre: string
  fecha: string
  hora: string
  tipo: string
}

export interface PesoPresentacion {
  nombre: string
  peso: string
}

export interface PresentacionDatos {
  titulo: string
  subtitulo: string
  profesor: string
  contacto: string
  webApuntes: string
  tutorias: string
  cierre: string
  curso: string
  ciclo: string
  grupo: string
  modulo: string
  codigoModulo: string
  modalidad: string
  totalUnidades: number
  totalRas: number
  totalCes: number
  trimestres: TrimestrePresentacion[]
  examenes: ExamenPresentacion[]
  pesos: PesoPresentacion[]
  categorias: PesoPresentacion[]
  requisitos: PesoPresentacion[]
  tutoriasAuto: string
}

type Nodo =
  | { tipo: 'texto'; valor: string }
  | { tipo: 'variable'; clave: string; crudo: boolean }
  | { tipo: 'seccion'; clave: string; invertida: boolean; hijos: Nodo[] }

function escaparHtml(texto: string): string {
  return texto
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function valorComoTexto(valor: unknown): string {
  if (valor === null || valor === undefined || valor === false) return ''
  if (Array.isArray(valor)) return valor.map(valorComoTexto).join('')
  return String(valor)
}

function resolverClave(contexto: unknown, clave: string): unknown {
  if (!contexto || typeof contexto !== 'object') return undefined
  return clave.split('.').reduce<unknown>((actual, parte) => {
    if (!actual || typeof actual !== 'object') return undefined
    return (actual as Record<string, unknown>)[parte]
  }, contexto)
}

function buscarValor(contextos: unknown[], clave: string): unknown {
  for (let indice = contextos.length - 1; indice >= 0; indice -= 1) {
    const valor = resolverClave(contextos[indice], clave)
    if (valor !== undefined) return valor
  }
  return undefined
}

function estaVacio(valor: unknown): boolean {
  if (valor === null || valor === undefined || valor === false || valor === '') return true
  if (Array.isArray(valor)) return valor.length === 0
  return false
}

function compilar(plantilla: string): Nodo[] {
  const raiz: Nodo[] = []
  const pila: { hijos: Nodo[]; clave: string | null }[] = [{ hijos: raiz, clave: null }]
  const patron = /(\{\{\{\s*([\w.]+)\s*\}\}\}|\{\{\s*([#^/&]?)\s*([\w.]+)\s*\}\})/g
  let ultimo = 0
  let coincidencia: RegExpExecArray | null

  while ((coincidencia = patron.exec(plantilla)) !== null) {
    const [token, , variableCruda, marca, clave] = coincidencia
    if (coincidencia.index > ultimo) {
      pila[pila.length - 1].hijos.push({
        tipo: 'texto',
        valor: plantilla.slice(ultimo, coincidencia.index)
      })
    }
    ultimo = coincidencia.index + token.length

    if (variableCruda) {
      pila[pila.length - 1].hijos.push({ tipo: 'variable', clave: variableCruda, crudo: true })
      continue
    }

    if (marca === '#' || marca === '^') {
      const nodo: Nodo = {
        tipo: 'seccion',
        clave,
        invertida: marca === '^',
        hijos: []
      }
      pila[pila.length - 1].hijos.push(nodo)
      pila.push({ hijos: nodo.hijos, clave })
      continue
    }

    if (marca === '/') {
      if (pila.length > 1) pila.pop()
      continue
    }

    pila[pila.length - 1].hijos.push({ tipo: 'variable', clave, crudo: marca === '&' })
  }

  if (ultimo < plantilla.length) {
    pila[pila.length - 1].hijos.push({ tipo: 'texto', valor: plantilla.slice(ultimo) })
  }

  return raiz
}

function renderizarNodos(nodos: Nodo[], contextos: unknown[]): string {
  let salida = ''
  for (const nodo of nodos) {
    if (nodo.tipo === 'texto') {
      salida += nodo.valor
      continue
    }

    if (nodo.tipo === 'variable') {
      const valor = valorComoTexto(buscarValor(contextos, nodo.clave))
      salida += nodo.crudo ? valor : escaparHtml(valor)
      continue
    }

    const valor = buscarValor(contextos, nodo.clave)
    if (nodo.invertida) {
      if (estaVacio(valor)) salida += renderizarNodos(nodo.hijos, contextos)
      continue
    }

    if (Array.isArray(valor)) {
      for (const elemento of valor) {
        salida += renderizarNodos(nodo.hijos, [...contextos, elemento])
      }
    } else if (valor && typeof valor === 'object') {
      salida += renderizarNodos(nodo.hijos, [...contextos, valor])
    } else if (!estaVacio(valor)) {
      salida += renderizarNodos(nodo.hijos, contextos)
    }
  }
  return salida
}

export function renderizarPlantilla(plantilla: string, datos: object): string {
  return renderizarNodos(compilar(plantilla), [datos])
}

function fechaCorta(fecha: string | null): string {
  if (!fecha) return 'Sin fecha'
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio}`
}

function rango(desde: string | null, hasta: string | null): string {
  if (!desde && !hasta) return 'Sin fechas'
  return `${fechaCorta(desde)} — ${fechaCorta(hasta)}`
}

function numeroRa(codigo: string): string {
  return codigo.replace(/[^\d]/g, '') || codigo
}

function comprimirCodigos(codigos: string[]): string {
  const ordenados = [...new Set(codigos)].sort()
  if (ordenados.length === 0) return ''
  if (ordenados.length === 1) return ordenados[0]
  const letras = ordenados.every((codigo) => /^[a-z]$/i.test(codigo))
  if (letras) {
    const indices = ordenados.map((codigo) => codigo.toLowerCase().charCodeAt(0))
    const consecutivos = indices.every(
      (indice, posicion) => posicion === 0 || indice === indices[posicion - 1] + 1
    )
    if (consecutivos) return `${ordenados[0]} – ${ordenados[ordenados.length - 1]}`
  }
  return ordenados.join(', ')
}

function formatoRas(unidad: UnidadProgramacion): string {
  const ras = [...new Set(unidad.criterios.map((criterio) => criterio.raCodigo))]
  if (ras.length === 0) return unidad.ra_codigos.map(numeroRa).join(', ')
  return ras.map(numeroRa).join(', ')
}

function formatoCes(unidad: UnidadProgramacion): string {
  const grupos = new Map<string, string[]>()
  for (const criterio of unidad.criterios) {
    const lista = grupos.get(criterio.raCodigo) ?? []
    lista.push(criterio.ceCodigo)
    grupos.set(criterio.raCodigo, lista)
  }
  if (grupos.size === 0) return ''
  return [...grupos.entries()]
    .map(([ra, ces]) => `${numeroRa(ra)}.${comprimirCodigos(ces)}`)
    .join('; ')
}

function etiquetaModalidad(modalidad: GrupoClase['modalidad']): string {
  return modalidad === 'semipresencial' ? 'Semipresencial' : 'Presencial'
}

function agruparUnidades(
  unidades: UnidadProgramacion[],
  eventos: EventoEvaluacionClase[],
  modelo: ModeloEvaluacion | null
): TrimestrePresentacion[] {
  const evaluaciones = eventos
    .filter((evento) => evento.tipo === 'evaluacion')
    .slice()
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id)

  const nombres = new Map(
    (modelo?.avaluaciones ?? []).map((avaluacion) => [avaluacion.id, avaluacion.nombre])
  )
  const cortes = evaluaciones.map((evento, indice) => ({
    nombre:
      (evento.avaluacion_id ? nombres.get(evento.avaluacion_id) : null) ??
      evento.titulo ??
      `Evaluación ${indice + 1}`,
    fecha: evento.fecha,
    unidades: [] as UnidadProgramacion[]
  }))

  if (cortes.length === 0) {
    return unidades.length > 0
      ? [{ nombre: 'Unidades', unidades: unidades.map(aUnidadPresentacion) }]
      : []
  }

  const sueltas: UnidadProgramacion[] = []
  for (const unidad of unidades) {
    const fecha = unidad.fecha_fin ?? unidad.fecha_inicio
    const indice = fecha ? cortes.findIndex((corte) => corte.fecha >= fecha) : -1
    if (indice >= 0) cortes[indice].unidades.push(unidad)
    else sueltas.push(unidad)
  }

  const resultado = cortes
    .filter((corte) => corte.unidades.length > 0)
    .map((corte) => ({ nombre: corte.nombre, unidades: corte.unidades.map(aUnidadPresentacion) }))
  if (sueltas.length > 0) {
    resultado.push({
      nombre: 'Sin evaluación asignada',
      unidades: sueltas.map(aUnidadPresentacion)
    })
  }
  return resultado
}

function aUnidadPresentacion(unidad: UnidadProgramacion): UnidadPresentacion {
  return {
    codigo: unidad.codigo ?? '—',
    nombre: unidad.nombre,
    contenidos: unidad.contenidos.trim() || 'Sin contenidos definidos.',
    ra: formatoRas(unidad),
    ce: formatoCes(unidad),
    fechas: rango(unidad.fecha_inicio, unidad.fecha_fin),
    sesiones: unidad.sesiones.length
  }
}

function tutoriasDe(grupo: GrupoClase): string {
  const nombres: Record<number, string> = {
    1: 'Lunes',
    2: 'Martes',
    3: 'Miércoles',
    4: 'Jueves',
    5: 'Viernes',
    6: 'Sábado',
    0: 'Domingo'
  }
  const partes: string[] = []
  for (const [dia, datos] of Object.entries(grupo.tutorias_semana ?? {})) {
    const nombre = nombres[Number(dia)]
    if (!nombre) continue
    if (datos.presencial.length > 0) {
      partes.push(`colectiva ${nombre.toLowerCase()} ${datos.presencial.join(', ')}`)
    }
    if (datos.individual.length > 0) {
      partes.push(`individual ${nombre.toLowerCase()} ${datos.individual.join(', ')}`)
    }
  }
  return partes.join(' · ')
}

export function construirDatosPresentacion(
  grupo: GrupoClase,
  unidades: UnidadProgramacion[],
  modelo: ModeloEvaluacion | null,
  eventos: EventoEvaluacionClase[],
  config: PresentacionConfig
): PresentacionDatos {
  const examenes = eventos
    .slice()
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.hora ?? '').localeCompare(b.hora ?? ''))
    .map((evento) => ({
      titulo: evento.titulo,
      trimestre: evento.avaluacion_id ?? '',
      fecha: fechaCorta(evento.fecha),
      hora: evento.hora ?? '',
      tipo: evento.tipo === 'examen' ? 'Examen' : 'Evaluación'
    }))

  const pesos = (modelo?.avaluaciones ?? []).map((avaluacion) => ({
    nombre: avaluacion.nombre,
    peso: `${avaluacion.peso} %`
  }))
  const categorias = (modelo?.categorias ?? []).map((categoria) => ({
    nombre: categoria.nombre,
    peso: `${categoria.peso} %`
  }))
  const requisitos = (modelo?.requisitos ?? []).map((requisito) => ({
    nombre: requisito.nombre,
    peso: `${requisito.valor}`
  }))
  const tutoriasAuto = tutoriasDe(grupo)

  const todosLosCriterios = unidades.flatMap((unidad) => unidad.criterios)
  const ras = new Set(todosLosCriterios.map((criterio) => criterio.raCodigo))
  const ces = new Set(
    todosLosCriterios.map((criterio) => `${criterio.raCodigo}|${criterio.ceCodigo}`)
  )

  return {
    titulo: config.titulo.trim() || `¡Bienvenidos al curso de ${grupo.modulo_nombre}!`,
    subtitulo:
      config.subtitulo.trim() ||
      'Tenéis disponible todo el temario teórico y práctico en la web oficial del módulo. Las tareas y actividades de entrega obligatoria se irán indicando progresivamente a lo largo del curso.',
    profesor: config.profesor.trim(),
    contacto: config.contacto.trim(),
    webApuntes: config.webApuntes.trim(),
    tutorias: config.tutorias.trim() || tutoriasAuto || 'Cita previa por correo oficial',
    cierre: config.cierre.trim() || '¡Mucho ánimo con el curso y buen trabajo!',
    curso: grupo.curso_academico_nombre,
    ciclo: grupo.ciclo_nombre,
    grupo: grupo.nombre,
    modulo: grupo.modulo_nombre,
    codigoModulo: grupo.modulo_codigo,
    modalidad: etiquetaModalidad(grupo.modalidad),
    totalUnidades: unidades.length,
    totalRas: ras.size,
    totalCes: ces.size,
    trimestres: agruparUnidades(unidades, eventos, modelo),
    examenes,
    pesos,
    categorias,
    requisitos,
    tutoriasAuto
  }
}

export const CONFIG_PRESENTACION_POR_DEFECTO: PresentacionConfig = {
  plantilla: PLANTILLA_PRESENTACION_POR_DEFECTO,
  titulo: '',
  subtitulo:
    'Tenéis disponible todo el temario teórico y práctico en la web oficial del módulo. Las tareas y actividades de entrega obligatoria se irán indicando progresivamente a lo largo del curso.',
  profesor: '',
  contacto: '',
  webApuntes: '',
  tutorias: '',
  cierre: '¡Mucho ánimo con el curso y buen trabajo!'
}

export function normalizarPresentacion(
  valor: Partial<PresentacionConfig> | null
): PresentacionConfig {
  const base = CONFIG_PRESENTACION_POR_DEFECTO
  const campo = (clave: keyof PresentacionConfig): string => {
    const dato = valor?.[clave]
    return typeof dato === 'string' ? dato : base[clave]
  }
  return {
    plantilla: campo('plantilla') || base.plantilla,
    titulo: campo('titulo'),
    subtitulo: campo('subtitulo'),
    profesor: campo('profesor'),
    contacto: campo('contacto'),
    webApuntes: campo('webApuntes'),
    tutorias: campo('tutorias'),
    cierre: campo('cierre')
  }
}
