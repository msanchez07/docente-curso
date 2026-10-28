/**
 * API simulada para la previsualización en el navegador.
 *
 * Cubre la sección Grupos. Los grupos se guardan en `localStorage` (para
 * comprobar que persisten al recargar) y los RA/CE se leen del `daw.json` real
 * que ya está descargado, servido por Vite como recurso público.
 *
 * Este fichero no se carga dentro de Electron (allí `window.api` ya existe).
 */
import {
  nombreGrupoClase,
  contarBloques,
  normalizarBloquesSemana,
  normalizarDiasSemana,
  normalizarTutoriasSemana,
  siglasDesdeNombre,
  tutoriasDesdeBloques
} from '@shared/grupos'
import { generarHtmlProgramacion } from '@shared/programacion-pdf'
import { generarHtmlEntregas } from '@shared/entregas-documento'
import { cursoAcademicoActual } from '@shared/curso-academico'
import { parsearEventosEvaluacion } from '@shared/importar-eventos'
import { parsearCalendarioEscolar } from '@shared/importar-calendario'
import { parsearUnidadesProgramacion } from '@shared/importar-unidades'
import { parsearEntradaAlumnos } from '@shared/importar-alumnos'
import { validarHtmlNormativa } from '@shared/normativa'
import { diasProgramacionDemo } from '@shared/demo-programacion'
import { modeloPorDefecto } from '@shared/modelo'
import JSZip from 'jszip'
import type {
  AlumnoClase,
  AlumnoEntrada,
  Api,
  Ciclo,
  CriterioDisponible,
  CursoAcademico,
  DiaCalendario,
  CursoAcademicoEntrada,
  EntregaClase,
  EntregaClaseEntrada,
  EventoEvaluacionClase,
  EventoEvaluacionEntrada,
  EvidenciaClase,
  EvidenciaClaseEntrada,
  GrupoClase,
  GrupoClaseEntrada,
  ModeloEvaluacion,
  Modulo,
  NotaEntradaClase,
  NotaGuardadaClase,
  NormativaFpt,
  OpcionesExportacionEntregas,
  PeriodoFormacionEmpresa,
  PeriodoFormacionEmpresaEntrada,
  PlantillaCriterios,
  PlantillaParaGrupo,
  ProgramacionAula,
  ProgramacionEntrada,
  ResumenCiclo,
  ResumenModulo,
  ResultadoAltaAlumnoClase,
  ResultadoImportacionCalendario,
  ResultadoImportacionClase,
  UnidadProgramacion,
  UnidadProgramacionEntrada
} from '@shared/tipos'

const CLAVE = 'gestion-entregas:grupos-clase'
const CLAVE_CURSOS = 'gestion-entregas:cursos-academicos'
const CLAVE_ALUMNOS = 'gestion-entregas:alumnos-clase'
const CLAVE_MATRICULAS = 'gestion-entregas:matriculas-clase'
const CLAVE_CRITERIOS = 'gestion-entregas:criterios-clase'
const CLAVE_PLANTILLAS = 'gestion-entregas:plantillas-criterios'
const CLAVE_PROGRAMACION = 'gestion-entregas:programacion-clase'
const CLAVE_ENTREGAS = 'gestion-entregas:entregas-clase'
const CLAVE_NOTAS = 'gestion-entregas:notas-clase'
const CLAVE_EVIDENCIAS = 'gestion-entregas:evidencias-clase'
const CLAVE_FORMACION = 'gestion-entregas:formacion-empresa'
const CLAVE_EVENTOS = 'gestion-entregas:eventos-evaluacion'
const CLAVE_UNIDADES = 'gestion-entregas:unidades-programacion'
const CLAVE_CALENDARIO = 'gestion-entregas:calendario-escolar'
const CLAVE_DEMO = 'gestion-entregas:demo-cargado'

type GrupoGuardado = Omit<
  GrupoClase,
  'alumnos' | 'ra' | 'ce' | 'criterios' | 'curso_academico_nombre'
>

interface CursoGuardado {
  id: number
  nombre: string
  inicio: number
  fin: number
  actual: boolean
  creado_en: string
}

type Cursos = CursoGuardado[]

interface AlumnoGuardado {
  id: number
  nombre: string
  apellidos: string
  dni: string | null
  email: string | null
  activo: boolean
}

type Matriculas = Record<string, number[]>

type PlantillaGuardada = PlantillaCriterios & { modelo: ModeloEvaluacion }

type Programacion = Record<string, ProgramacionAula[]>

type EntregaGuardada = Omit<EntregaClase, 'criterios' | 'notas' | 'evidencias'>
type Entregas = Record<string, EntregaGuardada[]>

interface NotaCeldaGuardada {
  nota: number | null
  observaciones: string | null
}

type Notas = Record<string, Record<string, Record<string, NotaCeldaGuardada>>>

type Evidencias = EvidenciaClase[]
type Formacion = PeriodoFormacionEmpresa[]
type EventosEvaluacion = EventoEvaluacionClase[]
type UnidadesProgramacion = UnidadProgramacion[]
type CalendarioEscolar = Record<string, DiaCalendario[]>

const NORMATIVA_DB = 'gestion-entregas-normativa'
const NORMATIVA_ALMACEN = 'documentos'
const NORMATIVA_ID = 'index'
const NORMATIVA_URL = '/normativa-fp/index.html'

interface DocumentoNormativaGuardado {
  id: string
  html: string
  actualizado_en: string
}

let normativaIncluidaCache: string | null = null
let normativaMemoria: DocumentoNormativaGuardado | null = null

function abrirBdNormativa(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  return new Promise((resolve) => {
    const solicitud = indexedDB.open(NORMATIVA_DB, 1)
    solicitud.onupgradeneeded = () => {
      const db = solicitud.result
      if (!db.objectStoreNames.contains(NORMATIVA_ALMACEN)) {
        db.createObjectStore(NORMATIVA_ALMACEN, { keyPath: 'id' })
      }
    }
    solicitud.onsuccess = () => resolve(solicitud.result)
    solicitud.onerror = () => resolve(null)
  })
}

async function leerNormativaGuardada(): Promise<DocumentoNormativaGuardado | null> {
  const db = await abrirBdNormativa()
  if (!db) return normativaMemoria
  return new Promise((resolve) => {
    const tx = db.transaction(NORMATIVA_ALMACEN, 'readonly')
    const solicitud = tx.objectStore(NORMATIVA_ALMACEN).get(NORMATIVA_ID)
    solicitud.onsuccess = () =>
      resolve((solicitud.result as DocumentoNormativaGuardado | undefined) ?? null)
    solicitud.onerror = () => resolve(null)
    tx.oncomplete = () => db.close()
  })
}

async function guardarNormativa(documento: DocumentoNormativaGuardado): Promise<void> {
  normativaMemoria = documento
  const db = await abrirBdNormativa()
  if (!db) return
  await new Promise<void>((resolve) => {
    const tx = db.transaction(NORMATIVA_ALMACEN, 'readwrite')
    tx.objectStore(NORMATIVA_ALMACEN).put(documento)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      resolve()
    }
  })
}

async function borrarNormativaGuardada(): Promise<void> {
  normativaMemoria = null
  const db = await abrirBdNormativa()
  if (!db) return
  await new Promise<void>((resolve) => {
    const tx = db.transaction(NORMATIVA_ALMACEN, 'readwrite')
    tx.objectStore(NORMATIVA_ALMACEN).delete(NORMATIVA_ID)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      resolve()
    }
  })
}

async function leerNormativaIncluida(): Promise<string> {
  if (normativaIncluidaCache) return normativaIncluidaCache
  const respuesta = await fetch(NORMATIVA_URL, { cache: 'no-store' })
  if (!respuesta.ok) {
    throw new Error(`No se pudo cargar la normativa incluida (${respuesta.status}).`)
  }
  normativaIncluidaCache = await respuesta.text()
  return normativaIncluidaCache
}

async function respuestaNormativa(): Promise<NormativaFpt> {
  const guardada = await leerNormativaGuardada()
  if (guardada) {
    return {
      origen: 'importada',
      actualizado_en: guardada.actualizado_en,
      url: null,
      html: guardada.html
    }
  }
  return {
    origen: 'incluida',
    actualizado_en: null,
    url: null,
    html: await leerNormativaIncluida()
  }
}

let cicloCache: Ciclo | null = null

async function cicloDaw(): Promise<Ciclo> {
  if (!cicloCache) {
    const respuesta = await fetch('/daw.json')
    if (!respuesta.ok) {
      throw new Error(`No se pudo cargar daw.json (${respuesta.status}).`)
    }
    cicloCache = (await respuesta.json()) as Ciclo
  }
  return cicloCache
}

function contarCe(modulo: Modulo): number {
  return modulo.ra.reduce((total, ra) => total + ra.ce.length, 0)
}

function cursosIniciales(): Cursos {
  const periodo = cursoAcademicoActual()
  return [
    {
      id: 1,
      nombre: periodo.nombre,
      inicio: periodo.inicio,
      fin: periodo.fin,
      actual: true,
      creado_en: '2026-10-27 09:00:00'
    }
  ]
}

function leerCursos(): Cursos {
  try {
    const crudo = localStorage.getItem(CLAVE_CURSOS)
    const cursos = crudo ? (JSON.parse(crudo) as Cursos) : []
    if (cursos.length === 0) {
      const iniciales = cursosIniciales()
      localStorage.setItem(CLAVE_CURSOS, JSON.stringify(iniciales))
      return iniciales
    }
    // Datos de versiones previas sin periodo: se reconstruyen con el actual.
    if (cursos.some((curso) => !Number.isInteger(curso.inicio) || !Number.isInteger(curso.fin))) {
      const iniciales = cursosIniciales()
      localStorage.setItem(CLAVE_CURSOS, JSON.stringify(iniciales))
      return iniciales
    }
    return cursos
  } catch {
    return cursosIniciales()
  }
}

function escribirCursos(cursos: Cursos): void {
  localStorage.setItem(CLAVE_CURSOS, JSON.stringify(cursos))
}

function cursoActualGuardado(): CursoGuardado {
  const cursos = leerCursos()
  return cursos.find((curso) => curso.actual) ?? cursos[0] ?? cursosIniciales()[0]
}

function cursoPorId(id: number): CursoGuardado | null {
  return leerCursos().find((curso) => curso.id === id) ?? null
}

function asegurarCursoActualWeb(): CursoGuardado {
  const periodo = cursoAcademicoActual()
  const cursos = leerCursos()
  const existente = cursos.find(
    (curso) => curso.inicio === periodo.inicio && curso.fin === periodo.fin
  )
  if (existente) {
    if (!existente.actual) {
      const actualizados = cursos.map((curso) => ({
        ...curso,
        actual: curso.id === existente.id
      }))
      escribirCursos(actualizados)
      return actualizados.find((curso) => curso.id === existente.id)!
    }
    return existente
  }

  const nuevo: CursoGuardado = {
    id: Math.max(0, ...cursos.map((curso) => curso.id)) + 1,
    nombre: periodo.nombre,
    inicio: periodo.inicio,
    fin: periodo.fin,
    actual: true,
    creado_en: new Date().toISOString().slice(0, 19).replace('T', ' ')
  }
  const actualizados = cursos.map((curso) => ({ ...curso, actual: false }))
  escribirCursos([...actualizados, nuevo])
  return nuevo
}

function leer(): GrupoGuardado[] {
  try {
    const crudo = localStorage.getItem(CLAVE)
    const grupos = crudo ? (JSON.parse(crudo) as GrupoGuardado[]) : []
    const actual = cursoActualGuardado()
    return grupos.map((grupo) => ({
      ...grupo,
      curso_academico_id: grupo.curso_academico_id ?? actual.id,
      dias_semana: normalizarDiasSemana(grupo.dias_semana),
      tutorias_semana: normalizarTutoriasSemana(grupo.tutorias_semana),
      bloques_semana: normalizarBloquesSemana(grupo.bloques_semana)
    }))
  } catch {
    return []
  }
}

function escribir(grupos: GrupoGuardado[]): void {
  localStorage.setItem(CLAVE, JSON.stringify(grupos))
}

function cursoConGrupos(curso: CursoGuardado, grupos: GrupoGuardado[]): CursoAcademico {
  return {
    ...curso,
    grupos: grupos.filter((grupo) => grupo.curso_academico_id === curso.id).length
  }
}

function leerAlumnos(): AlumnoGuardado[] {
  try {
    const crudo = localStorage.getItem(CLAVE_ALUMNOS)
    return crudo ? (JSON.parse(crudo) as AlumnoGuardado[]) : []
  } catch {
    return []
  }
}

function escribirAlumnos(alumnos: AlumnoGuardado[]): void {
  localStorage.setItem(CLAVE_ALUMNOS, JSON.stringify(alumnos))
}

function leerMatriculas(): Matriculas {
  try {
    const crudo = localStorage.getItem(CLAVE_MATRICULAS)
    return crudo ? (JSON.parse(crudo) as Matriculas) : {}
  } catch {
    return {}
  }
}

function escribirMatriculas(matriculas: Matriculas): void {
  localStorage.setItem(CLAVE_MATRICULAS, JSON.stringify(matriculas))
}

function gruposDeAlumno(alumnoId: number): number[] {
  return Object.entries(leerMatriculas())
    .filter(([, ids]) => ids.includes(alumnoId))
    .map(([grupoId]) => Number(grupoId))
}

function aAlumnoClase(alumno: AlumnoGuardado): AlumnoClase {
  return {
    id: alumno.id,
    nombre: alumno.nombre,
    apellidos: alumno.apellidos,
    dni: alumno.dni,
    email: alumno.email,
    activo: alumno.activo !== false,
    grupos_clase: gruposDeAlumno(alumno.id)
  }
}

function buscarAlumno(
  alumnos: AlumnoGuardado[],
  entrada: AlumnoEntrada
): AlumnoGuardado | undefined {
  const dni = entrada.dni?.trim()
  if (dni) {
    const porDni = alumnos.find((alumno) => alumno.dni?.toLowerCase() === dni.toLowerCase())
    if (porDni) return porDni
  }
  const email = entrada.email?.trim()
  if (email) {
    const porEmail = alumnos.find((alumno) => alumno.email?.toLowerCase() === email.toLowerCase())
    if (porEmail) return porEmail
  }
  return alumnos.find(
    (alumno) =>
      alumno.nombre.toLowerCase() === entrada.nombre.trim().toLowerCase() &&
      alumno.apellidos.toLowerCase() === entrada.apellidos.trim().toLowerCase()
  )
}

function leerCriterios(): Record<string, ModeloEvaluacion> {
  try {
    const crudo = localStorage.getItem(CLAVE_CRITERIOS)
    return crudo ? (JSON.parse(crudo) as Record<string, ModeloEvaluacion>) : {}
  } catch {
    return {}
  }
}

function escribirCriterios(criterios: Record<string, ModeloEvaluacion>): void {
  localStorage.setItem(CLAVE_CRITERIOS, JSON.stringify(criterios))
}

function leerPlantillas(): PlantillaGuardada[] {
  try {
    const crudo = localStorage.getItem(CLAVE_PLANTILLAS)
    return crudo ? (JSON.parse(crudo) as PlantillaGuardada[]) : []
  } catch {
    return []
  }
}

function escribirPlantillas(plantillas: PlantillaGuardada[]): void {
  localStorage.setItem(CLAVE_PLANTILLAS, JSON.stringify(plantillas))
}

function leerProgramacion(): Programacion {
  try {
    const crudo = localStorage.getItem(CLAVE_PROGRAMACION)
    return crudo ? (JSON.parse(crudo) as Programacion) : {}
  } catch {
    return {}
  }
}

function escribirProgramacion(programacion: Programacion): void {
  localStorage.setItem(CLAVE_PROGRAMACION, JSON.stringify(programacion))
}

function leerUnidades(): UnidadesProgramacion {
  try {
    const crudo = localStorage.getItem(CLAVE_UNIDADES)
    return crudo ? (JSON.parse(crudo) as UnidadesProgramacion) : []
  } catch {
    return []
  }
}

function escribirUnidades(unidades: UnidadesProgramacion): void {
  localStorage.setItem(CLAVE_UNIDADES, JSON.stringify(unidades))
}

function unidadesDeGrupo(grupoClaseId: number): UnidadProgramacion[] {
  const sesiones = leerProgramacion()[String(grupoClaseId)] ?? []
  return leerUnidades()
    .filter((unidad) => unidad.grupo_clase_id === grupoClaseId)
    .map((unidad) => ({
      ...unidad,
      sesiones: sesiones
        .filter((sesion) => sesion.unidad_id === unidad.id)
        .slice()
        .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id)
    }))
    .sort(
      (a, b) => (a.fecha_inicio ?? '9999').localeCompare(b.fecha_inicio ?? '9999') || a.id - b.id
    )
}

function leerCalendario(): CalendarioEscolar {
  try {
    const crudo = localStorage.getItem(CLAVE_CALENDARIO)
    return crudo ? (JSON.parse(crudo) as CalendarioEscolar) : {}
  } catch {
    return {}
  }
}

function escribirCalendario(calendario: CalendarioEscolar): void {
  localStorage.setItem(CLAVE_CALENDARIO, JSON.stringify(calendario))
}

function calendarioDeCurso(cursoAcademicoId: number): DiaCalendario[] {
  return (leerCalendario()[String(cursoAcademicoId)] ?? [])
    .slice()
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id)
}

function leerEntregas(): Entregas {
  try {
    const crudo = localStorage.getItem(CLAVE_ENTREGAS)
    return crudo ? (JSON.parse(crudo) as Entregas) : {}
  } catch {
    return {}
  }
}

function escribirEntregas(entregas: Entregas): void {
  try {
    localStorage.setItem(CLAVE_ENTREGAS, JSON.stringify(entregas))
  } catch {
    throw new Error(
      'No se pudo guardar la entrega en la previsualización: el archivo de la rúbrica es demasiado grande. Prueba con un archivo más pequeño.'
    )
  }
}

function leerNotas(): Notas {
  try {
    const crudo = localStorage.getItem(CLAVE_NOTAS)
    return crudo ? (JSON.parse(crudo) as Notas) : {}
  } catch {
    return {}
  }
}

function escribirNotas(notas: Notas): void {
  localStorage.setItem(CLAVE_NOTAS, JSON.stringify(notas))
}

function leerEvidencias(): Evidencias {
  try {
    const crudo = localStorage.getItem(CLAVE_EVIDENCIAS)
    const evidencias = crudo ? (JSON.parse(crudo) as Evidencias) : []
    return evidencias.map((evidencia) => ({
      ...evidencia,
      categoria: evidencia.categoria ?? 'material'
    }))
  } catch {
    return []
  }
}

function escribirEvidencias(evidencias: Evidencias): void {
  try {
    localStorage.setItem(CLAVE_EVIDENCIAS, JSON.stringify(evidencias))
  } catch {
    throw new Error(
      'No se pudieron guardar las evidencias en la previsualización: prueba con archivos más pequeños.'
    )
  }
}

function leerEventosEvaluacion(): EventosEvaluacion {
  try {
    const crudo = localStorage.getItem(CLAVE_EVENTOS)
    return crudo ? (JSON.parse(crudo) as EventosEvaluacion) : []
  } catch {
    return []
  }
}

function escribirEventosEvaluacion(eventos: EventosEvaluacion): void {
  localStorage.setItem(CLAVE_EVENTOS, JSON.stringify(eventos))
}

function eventosDeGrupo(grupoClaseId: number): EventoEvaluacionClase[] {
  return leerEventosEvaluacion()
    .filter((evento) => evento.grupo_clase_id === grupoClaseId)
    .sort(
      (a, b) =>
        a.fecha.localeCompare(b.fecha) ||
        (a.hora ?? '99:99').localeCompare(b.hora ?? '99:99') ||
        a.id - b.id
    )
}

function leerFormacion(): Formacion {
  try {
    const crudo = localStorage.getItem(CLAVE_FORMACION)
    return crudo ? (JSON.parse(crudo) as Formacion) : []
  } catch {
    return []
  }
}

function escribirFormacion(formacion: Formacion): void {
  localStorage.setItem(CLAVE_FORMACION, JSON.stringify(formacion))
}

function formacionDeGrupo(grupoClaseId: number, alumnoId?: number): PeriodoFormacionEmpresa[] {
  return leerFormacion()
    .map((periodo) => ({ ...periodo, horas: periodo.horas ?? 0 }))
    .filter(
      (periodo) =>
        periodo.grupo_clase_id === grupoClaseId &&
        (alumnoId === undefined || periodo.alumno_id === alumnoId)
    )
    .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio) || a.id - b.id)
}

function evidenciasDeEntrega(entregaId: number): EvidenciaClase[] {
  return leerEvidencias().filter((evidencia) => evidencia.entrega_id === entregaId)
}

function notasDeGrupo(grupoClaseId: number): NotaGuardadaClase[] {
  const grupo = leerNotas()[String(grupoClaseId)] ?? {}
  const lista: NotaGuardadaClase[] = []
  for (const [alumnoId, entregas] of Object.entries(grupo)) {
    for (const [entregaId, celda] of Object.entries(entregas)) {
      // Compatibilidad con datos demo antiguos guardados como número.
      const nota = typeof celda === 'number' ? celda : (celda?.nota ?? null)
      const observaciones = typeof celda === 'number' ? null : (celda?.observaciones ?? null)
      if (nota === null && !observaciones) continue
      lista.push({
        entrega_id: Number(entregaId),
        alumno_id: Number(alumnoId),
        nota,
        observaciones
      })
    }
  }
  return lista
}

const cacheCriterios = new Map<string, CriterioDisponible[]>()

function criteriosDeModulo(ciclo: Ciclo, moduloCodigo: string): CriterioDisponible[] {
  const clave = `${ciclo.id}:${moduloCodigo}`
  const cache = cacheCriterios.get(clave)
  if (cache) return cache

  const modulo = ciclo.modulos.find((m) => m.codigo === moduloCodigo)
  if (!modulo) return []
  let id = 1
  const criterios: CriterioDisponible[] = []
  for (const ra of modulo.ra) {
    for (const ce of ra.ce) {
      criterios.push({
        ceId: id++,
        ceCodigo: ce.codigo,
        raCodigo: ra.codigo,
        raDescripcion: ra.descripcion,
        descripcion: ce.descripcion
      })
    }
  }
  cacheCriterios.set(clave, criterios)
  return criterios
}

function entregaConContadores(entrega: EntregaGuardada): EntregaClase {
  const notas = notasDeGrupo(entrega.grupo_clase_id).filter(
    (nota) => nota.entrega_id === entrega.id
  ).length
  return {
    ...entrega,
    criterios: entrega.ce_ids.length,
    notas,
    evidencias: evidenciasDeEntrega(entrega.id).length
  }
}

function fechaValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false
  const interpretada = new Date(`${fecha}T00:00:00Z`)
  return !Number.isNaN(interpretada.getTime()) && interpretada.toISOString().slice(0, 10) === fecha
}

function normalizarModelo(modelo: ModeloEvaluacion): ModeloEvaluacion {
  return {
    ...modelo,
    convocatorias: modelo.convocatorias ?? {
      extraordinaria: 'suspensas',
      perdidaEvaluacionContinua: 'global'
    }
  }
}

/**
 * Siembra un curso de ejemplo la primera vez que se abre la previsualización
 * en un navegador. Así se puede ver la aplicación con datos sin crear nada.
 */
function limpiarDatosDemo(): void {
  localStorage.removeItem(CLAVE_CURSOS)
  localStorage.removeItem(CLAVE)
  localStorage.removeItem(CLAVE_ALUMNOS)
  localStorage.removeItem(CLAVE_MATRICULAS)
  localStorage.removeItem(CLAVE_CRITERIOS)
  localStorage.removeItem(CLAVE_PLANTILLAS)
  localStorage.removeItem(CLAVE_PROGRAMACION)
  localStorage.removeItem(CLAVE_ENTREGAS)
  localStorage.removeItem(CLAVE_NOTAS)
  localStorage.removeItem(CLAVE_EVIDENCIAS)
  localStorage.removeItem(CLAVE_FORMACION)
  localStorage.removeItem(CLAVE_EVENTOS)
  localStorage.removeItem(CLAVE_UNIDADES)
  localStorage.removeItem(CLAVE_CALENDARIO)
}

const ALUMNOS_DEMO: Omit<AlumnoGuardado, 'id'>[] = [
  {
    nombre: 'Ana',
    apellidos: 'García',
    dni: '11111111H',
    email: 'ana@ejemplo.com',
    activo: true
  },
  {
    nombre: 'Luis',
    apellidos: 'Pérez',
    dni: null,
    email: 'luis@ejemplo.com',
    activo: true
  },
  {
    nombre: 'Marta',
    apellidos: 'Soler',
    dni: '22222222J',
    email: 'marta@ejemplo.com',
    activo: true
  },
  {
    nombre: 'Pablo',
    apellidos: 'Ruiz',
    dni: '44444444A',
    email: 'pablo@ejemplo.com',
    activo: false
  },
  {
    nombre: 'Lucía',
    apellidos: 'Navarro',
    dni: '55555555K',
    email: 'lucia@ejemplo.com',
    activo: true
  }
]

function escribirDemo(): void {
  const periodoDemo = cursoAcademicoActual()
  escribirCursos([
    {
      id: 1,
      nombre: periodoDemo.nombre,
      inicio: periodoDemo.inicio,
      fin: periodoDemo.fin,
      actual: true,
      creado_en: '2026-10-27 09:00:00'
    }
  ])

  const grupo: GrupoGuardado = {
    id: 1,
    curso_academico_id: 1,
    ciclo_id: 'daw',
    ciclo_nombre: 'Desarrollo de Aplicaciones Web',
    curso: '2',
    modalidad: 'presencial',
    modulo_codigo: '0613',
    modulo_nombre: 'Desarrollo Web en entorno servidor',
    modulo_siglas: 'DWES',
    nombre: '2º DAW · DWES · Presencial',
    dias_semana: { 1: 2, 3: 2 },
    tutorias_semana: {},
    bloques_semana: {
      1: [
        { inicio: '08:00', tipo: 'sesion' },
        { inicio: '08:55', tipo: 'sesion' }
      ],
      3: [
        { inicio: '08:00', tipo: 'sesion' },
        { inicio: '08:55', tipo: 'sesion' }
      ]
    },
    creado_en: '2026-10-27 09:00:00'
  }
  escribir([grupo])

  const criterios = leerCriterios()
  criterios['1'] = modeloPorDefecto('presencial')
  escribirCriterios(criterios)

  const plantillas = leerPlantillas()
  plantillas.push({
    id: 1,
    nombre: `Plantilla ${grupo.nombre}`,
    modulo_codigo: '0613',
    modalidad: 'presencial',
    modelo: modeloPorDefecto('presencial'),
    creado_en: '2026-10-27 09:00:00',
    actualizado_en: '2026-10-27 09:00:00'
  })
  escribirPlantillas(plantillas)

  const alumnos: AlumnoGuardado[] = ALUMNOS_DEMO.map((alumno, indice) => ({
    ...alumno,
    id: indice + 1
  }))
  escribirAlumnos(alumnos)
  escribirMatriculas({ '1': alumnos.map((alumno) => alumno.id) })

  const dias = diasProgramacionDemo()
  const programacion = leerProgramacion()
  programacion['1'] = dias.map((dia, indice) => ({
    id: indice + 1,
    grupo_clase_id: 1,
    unidad_id: indice < 15 ? 1 : indice < 30 ? 2 : null,
    hora: null,
    orden: 0,
    ...dia,
    creado_en: '2026-10-27 09:00:00',
    actualizado_en: '2026-10-27 09:00:00'
  }))
  escribirProgramacion(programacion)

  escribirUnidades([
    {
      id: 1,
      grupo_clase_id: 1,
      codigo: 'UD1',
      nombre: 'Del entorno a los formularios',
      fecha_inicio: '2026-10-28',
      fecha_fin: '2026-11-17',
      contenidos: 'Entorno PHP, sintaxis, estructuras de control, arrays y formularios.',
      observaciones: null,
      ra_codigos: ['RA1', 'RA2'],
      sesiones: [],
      creado_en: '2026-10-27 09:00:00',
      actualizado_en: '2026-10-27 09:00:00'
    },
    {
      id: 2,
      grupo_clase_id: 1,
      codigo: 'UD2',
      nombre: 'Persistencia, MVC y APIs',
      fecha_inicio: '2026-11-18',
      fecha_fin: '2026-12-20',
      contenidos: 'Sesiones, acceso a datos, MVC, APIs REST y seguridad básica.',
      observaciones: 'Incluye la práctica 1.',
      ra_codigos: ['RA2', 'RA3', 'RA4'],
      sesiones: [],
      creado_en: '2026-10-27 09:00:00',
      actualizado_en: '2026-10-27 09:00:00'
    }
  ])

  escribirCalendario({
    '1': [
      {
        id: 1,
        curso_academico_id: 1,
        fecha: '2026-09-15',
        tipo: 'lectivo',
        descripcion: 'Inicio del curso',
        creado_en: '2026-10-27 09:00:00',
        actualizado_en: '2026-10-27 09:00:00'
      },
      {
        id: 2,
        curso_academico_id: 1,
        fecha: '2026-10-12',
        tipo: 'festivo',
        descripcion: 'Fiesta Nacional',
        creado_en: '2026-10-27 09:00:00',
        actualizado_en: '2026-10-27 09:00:00'
      },
      {
        id: 3,
        curso_academico_id: 1,
        fecha: '2026-12-07',
        tipo: 'no_lectivo',
        descripcion: 'Día no lectivo',
        creado_en: '2026-10-27 09:00:00',
        actualizado_en: '2026-10-27 09:00:00'
      }
    ]
  })

  const entregas = leerEntregas()
  entregas['1'] = [
    {
      id: 1,
      grupo_clase_id: 1,
      titulo: 'Práctica 1: formulario PHP',
      descripcion: 'Formulario con validación y persistencia en sesión.',
      tipo: 'practica',
      fecha_limite: '2026-11-06',
      rubrica:
        'Criterios: formulario funcional (40 %), validación de datos (30 %), persistencia en sesión (20 %) y presentación (10 %).',
      rubrica_archivo: null,
      avaluacion_id: 'AV1',
      categoria_id: 'actividades',
      ce_ids: [1, 2, 3],
      bloqueada: false,
      creada_en: '2026-10-27 09:00:00'
    },
    {
      id: 2,
      grupo_clase_id: 1,
      titulo: 'Examen AV1',
      descripcion: 'Prueba teórico-práctica de la primera evaluación.',
      tipo: 'examen',
      fecha_limite: '2026-11-19',
      rubrica:
        'Criterios: preguntas teóricas (50 %), supuesto práctico (40 %) y claridad de la solución (10 %).',
      rubrica_archivo: null,
      avaluacion_id: 'AV1',
      categoria_id: 'examenes',
      ce_ids: [4, 5],
      bloqueada: false,
      creada_en: '2026-10-27 09:00:00'
    },
    {
      id: 3,
      grupo_clase_id: 1,
      titulo: 'Proyecto: mini framework MVC',
      descripcion: 'Entrega del proyecto de la segunda evaluación.',
      tipo: 'proyecto',
      fecha_limite: '2026-12-18',
      rubrica:
        'Criterios: arquitectura MVC (30 %), funcionalidad (30 %), seguridad (20 %), documentación (10 %) y defensa (10 %).',
      rubrica_archivo: {
        nombre: 'rubrica-proyecto.txt',
        tipo: 'text/plain',
        datos: btoa(
          'Rúbrica del proyecto: arquitectura MVC 30 %, funcionalidad 30 %, seguridad 20 %, documentación 10 % y defensa 10 %.'
        )
      },
      avaluacion_id: 'AV2',
      categoria_id: 'proyectos',
      ce_ids: [6, 7, 8],
      bloqueada: false,
      creada_en: '2026-10-27 09:00:00'
    }
  ]
  escribirEntregas(entregas)

  const notas = leerNotas()
  notas['1'] = {
    '1': {
      '1': { nota: 8.5, observaciones: 'Formulario completo y validación correcta.' },
      '2': { nota: 9, observaciones: 'Examen muy bien resuelto.' },
      '3': { nota: 8, observaciones: 'Proyecto sólido; mejora la documentación.' }
    },
    '2': {
      '1': { nota: 6, observaciones: 'Falta validar algún campo.' },
      '2': { nota: 5.5, observaciones: 'Supuesto práctico justo.' },
      '3': { nota: 7, observaciones: 'Entrega correcta.' }
    },
    '3': {
      '1': { nota: 9, observaciones: 'Trabajo excelente.' },
      '2': { nota: 8.5, observaciones: 'Muy buena prueba.' },
      '3': { nota: 9, observaciones: 'Proyecto muy completo.' }
    },
    '4': {
      '1': { nota: 4.5, observaciones: 'Faltan requisitos de la práctica.' },
      '2': { nota: 3, observaciones: 'No alcanza los mínimos.' }
    },
    '5': {
      '1': { nota: 7, observaciones: 'Correcto.' },
      '2': { nota: 8, observaciones: 'Buen examen.' }
    }
  }
  escribirNotas(notas)

  escribirEventosEvaluacion([
    {
      id: 1,
      grupo_clase_id: 1,
      tipo: 'evaluacion',
      titulo: 'Sesión de evaluación 1ª',
      fecha: '2026-12-10',
      hora: '17:00',
      avaluacion_id: 'AV1',
      observaciones: 'Junta de evaluación del grupo.',
      creado_en: '2026-10-27 09:00:00',
      actualizado_en: '2026-10-27 09:00:00'
    },
    {
      id: 2,
      grupo_clase_id: 1,
      tipo: 'examen',
      titulo: 'Examen AV1',
      fecha: '2026-11-19',
      hora: '09:00',
      avaluacion_id: 'AV1',
      observaciones: 'Aula 3.',
      creado_en: '2026-10-27 09:00:00',
      actualizado_en: '2026-10-27 09:00:00'
    },
    {
      id: 3,
      grupo_clase_id: 1,
      tipo: 'evaluacion',
      titulo: 'Sesión de evaluación 2ª',
      fecha: '2027-03-18',
      hora: '17:00',
      avaluacion_id: 'AV2',
      observaciones: null,
      creado_en: '2026-10-27 09:00:00',
      actualizado_en: '2026-10-27 09:00:00'
    }
  ])

  escribirFormacion([
    {
      id: 1,
      grupo_clase_id: 1,
      alumno_id: 1,
      fecha_inicio: '2026-11-09',
      fecha_fin: '2026-11-20',
      empresa: 'Acme Web SL',
      horas: 80,
      observaciones: 'Primera estancia de formación en empresa.',
      creado_en: '2026-10-27 09:00:00',
      actualizado_en: '2026-10-27 09:00:00'
    },
    {
      id: 2,
      grupo_clase_id: 1,
      alumno_id: 5,
      fecha_inicio: '2026-10-19',
      fecha_fin: '2026-10-30',
      empresa: 'Data Norte',
      horas: 60,
      observaciones: 'Formación dual durante la quincena.',
      creado_en: '2026-10-27 09:00:00',
      actualizado_en: '2026-10-27 09:00:00'
    }
  ])

  escribirEvidencias([
    {
      id: 1,
      entrega_id: 1,
      categoria: 'material',
      nombre: 'enunciado-practica.txt',
      tipo: 'text/plain',
      tamano: 168,
      datos:
        'RW51bmNpYWRvIGRlIGxhIHByw6FjdGljYSAxOiBmb3JtdWxhcmlvIGNvbiB2YWxpZGFjacOzbiB5IHBlcnNpc3RlbmNpYSBlbiBzZXNpw7NuLg==',
      creado_en: '2026-10-27 09:00:00'
    },
    {
      id: 2,
      entrega_id: 1,
      categoria: 'entrega',
      nombre: 'practica-ana.txt',
      tipo: 'text/plain',
      tamano: 92,
      datos:
        'UHJhY3RpY2EgZGUgQW5hOiBmb3JtdWxhcmlvIGNvbXBsZXRhZG8geSB2YWxpZGFkbyBjb3JyZWN0YW1lbnRlLg==',
      creado_en: '2026-10-27 09:00:00'
    }
  ])
}

function sembrarDemo(): void {
  if (localStorage.getItem(CLAVE_DEMO)) return
  localStorage.setItem(CLAVE_DEMO, '1')
  if (leer().length > 0) return
  escribirDemo()
}

function moduloDe(ciclo: Ciclo, codigo: string): Modulo {
  const modulo = ciclo.modulos.find((m) => m.codigo === codigo)
  if (!modulo) throw new Error('El módulo indicado no existe.')
  return modulo
}

function componer(ciclo: Ciclo, entrada: GrupoClaseEntrada): GrupoGuardado {
  const modulo = moduloDe(ciclo, entrada.modulo_codigo)
  const siglas = modulo.siglas ?? siglasDesdeNombre(modulo.nombre)
  if (modulo.curso && modulo.curso !== entrada.curso) {
    throw new Error(`El módulo ${siglas} es de ${modulo.curso}º curso.`)
  }
  const bloques = normalizarBloquesSemana(entrada.bloques_semana)
  const tieneBloques = Object.keys(bloques).length > 0
  return {
    id: 0,
    curso_academico_id: entrada.curso_academico_id ?? asegurarCursoActualWeb().id,
    ciclo_id: ciclo.id,
    ciclo_nombre: ciclo.denominacion,
    curso: entrada.curso,
    modalidad: entrada.modalidad,
    modulo_codigo: modulo.codigo,
    modulo_nombre: modulo.nombre,
    modulo_siglas: siglas,
    nombre: nombreGrupoClase(ciclo.id, entrada.curso, entrada.modalidad, siglas),
    dias_semana: tieneBloques ? contarBloques(bloques) : normalizarDiasSemana(entrada.dias_semana),
    tutorias_semana: tieneBloques
      ? tutoriasDesdeBloques(bloques)
      : normalizarTutoriasSemana(entrada.tutorias_semana),
    bloques_semana: bloques,
    creado_en: new Date().toISOString().slice(0, 19).replace('T', ' ')
  }
}

function conContadores(ciclo: Ciclo, grupo: GrupoGuardado): GrupoClase {
  const modulo = ciclo.modulos.find((m) => m.codigo === grupo.modulo_codigo)
  const alumnos = leerMatriculas()[String(grupo.id)] ?? []
  return {
    ...grupo,
    curso_academico_nombre: cursoPorId(grupo.curso_academico_id)?.nombre ?? '—',
    alumnos: alumnos.length,
    ra: modulo?.ra.length ?? 0,
    ce: modulo ? contarCe(modulo) : 0,
    criterios: Boolean(leerCriterios()[String(grupo.id)])
  }
}

function existe(grupos: GrupoGuardado[], entrada: GrupoClaseEntrada, exceptoId = 0): boolean {
  return grupos.some(
    (g) =>
      g.id !== exceptoId &&
      g.curso_academico_id === (entrada.curso_academico_id ?? cursoActualGuardado().id) &&
      g.ciclo_id === entrada.ciclo_id &&
      g.curso === entrada.curso &&
      g.modalidad === entrada.modalidad &&
      g.modulo_codigo === entrada.modulo_codigo
  )
}

function validarModeloWeb(modelo: ModeloEvaluacion): void {
  if (modelo.categorias.length === 0) throw new Error('Debe haber al menos una categoría.')
  if (modelo.avaluaciones.length === 0) throw new Error('Debe haber al menos una avaluación.')
  const sumaCategorias = modelo.categorias.reduce((total, c) => total + (Number(c.peso) || 0), 0)
  const sumaAvaluaciones = modelo.avaluaciones.reduce(
    (total, a) => total + (Number(a.peso) || 0),
    0
  )
  const redondear2 = (valor: number): number => Math.round((valor + Number.EPSILON) * 100) / 100
  if (Math.abs(redondear2(sumaCategorias) - 100) > 1e-9) {
    throw new Error(
      `Los pesos de las categorías suman ${redondear2(sumaCategorias)} %; deben sumar exactamente 100 %.`
    )
  }
  if (Math.abs(redondear2(sumaAvaluaciones) - 100) > 1e-9) {
    throw new Error(
      `Los pesos de las avaluaciones suman ${redondear2(sumaAvaluaciones)} %; deben sumar exactamente 100 %.`
    )
  }
}

function nombreArchivoWeb(texto: string): string {
  return (
    texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w.-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80) || 'entrega'
  )
}

function descargarBlobWeb(nombre: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  enlace.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function htmlEntregasWeb(
  grupo: GrupoClase,
  entregas: EntregaClase[],
  titulo: string,
  ambito: 'entrega' | 'avaluacion' | 'curso',
  ciclo: Ciclo
): string {
  const modelo = leerCriterios()[String(grupo.id)]
  return generarHtmlEntregas({
    grupo,
    entregas,
    evidencias: new Map(entregas.map((entrega) => [entrega.id, evidenciasDeEntrega(entrega.id)])),
    criterios: criteriosDeModulo(ciclo, grupo.modulo_codigo),
    avaluaciones: (modelo?.avaluaciones ?? []).map((avaluacion) => ({
      id: avaluacion.id,
      nombre: avaluacion.nombre
    })),
    categorias: (modelo?.categorias ?? []).map((categoria) => ({
      id: categoria.id,
      nombre: categoria.nombre
    })),
    ambito,
    tituloAmbito: titulo,
    fecha: new Date()
  })
}

const api = {
  app: {
    version: async () => '0.1.0-web'
  },
  boe: {
    listarCiclos: async (): Promise<ResumenCiclo[]> => {
      const ciclo = await cicloDaw()
      return [
        {
          id: ciclo.id,
          denominacion: ciclo.denominacion,
          nivel: ciclo.nivel,
          modulos: ciclo.modulos.length,
          ra: ciclo.modulos.reduce((total, m) => total + m.ra.length, 0),
          ce: ciclo.modulos.reduce((total, m) => total + contarCe(m), 0)
        }
      ]
    },
    obtenerCiclo: async () => cicloDaw(),
    obtenerModulo: async (codigo: string) => {
      const ciclo = await cicloDaw()
      return ciclo.modulos.find((m) => m.codigo === codigo) ?? null
    },
    guardarPesosRa: async () => undefined
  },
  bd: {
    estado: async () => ({ ruta: 'localStorage', ciclos: 1, modulos: 13, ra: 86, ce: 665 }),
    listarModulos: async (cicloId: string): Promise<ResumenModulo[]> => {
      if (cicloId !== 'daw') return []
      const ciclo = await cicloDaw()
      return ciclo.modulos.map((m) => ({
        codigo: m.codigo,
        nombre: m.nombre,
        siglas: m.siglas ?? null,
        curso: m.curso ?? null,
        ects: m.ects,
        horas_minimas_boe: m.horas_minimas_boe,
        ra: m.ra.length,
        ce: contarCe(m)
      }))
    },
    vaciar: async () => {
      localStorage.removeItem(CLAVE_CURSOS)
      localStorage.removeItem(CLAVE)
      localStorage.removeItem(CLAVE_ALUMNOS)
      localStorage.removeItem(CLAVE_MATRICULAS)
      localStorage.removeItem(CLAVE_CRITERIOS)
      localStorage.removeItem(CLAVE_PLANTILLAS)
      localStorage.removeItem(CLAVE_PROGRAMACION)
      localStorage.removeItem(CLAVE_ENTREGAS)
      localStorage.removeItem(CLAVE_NOTAS)
      localStorage.removeItem(CLAVE_EVIDENCIAS)
      localStorage.removeItem(CLAVE_FORMACION)
      localStorage.removeItem(CLAVE_EVENTOS)
    }
  },
  cursosAcademicos: {
    listar: async (): Promise<CursoAcademico[]> => {
      const grupos = leer()
      return leerCursos()
        .map((curso) => cursoConGrupos(curso, grupos))
        .sort(
          (a, b) => Number(b.actual) - Number(a.actual) || b.nombre.localeCompare(a.nombre, 'es')
        )
    },
    actual: async (): Promise<CursoAcademico | null> => {
      const grupos = leer()
      return cursoConGrupos(cursoActualGuardado(), grupos)
    },
    asegurarActual: async (): Promise<CursoAcademico> =>
      cursoConGrupos(asegurarCursoActualWeb(), leer()),
    crear: async (entrada: CursoAcademicoEntrada): Promise<CursoAcademico> => {
      const nombre = entrada.nombre?.trim()
      if (!nombre) throw new Error('El nombre del curso académico es obligatorio.')
      if (nombre.length > 40) {
        throw new Error('El nombre del curso académico no puede superar 40 caracteres.')
      }
      const periodo = cursoAcademicoActual()
      if (nombre !== periodo.nombre) {
        throw new Error(`Solo se puede crear el curso académico actual (${periodo.nombre}).`)
      }
      const cursos = leerCursos()
      if (cursos.some((curso) => curso.inicio === periodo.inicio && curso.fin === periodo.fin)) {
        throw new Error(`Ya existe el curso académico «${nombre}».`)
      }
      const siguiente: CursoGuardado = {
        id: Math.max(0, ...cursos.map((curso) => curso.id)) + 1,
        nombre,
        inicio: periodo.inicio,
        fin: periodo.fin,
        actual: true,
        creado_en: new Date().toISOString().slice(0, 19).replace('T', ' ')
      }
      const actualizados = cursos.map((curso) => ({ ...curso, actual: false }))
      escribirCursos([...actualizados, siguiente])
      return cursoConGrupos(siguiente, leer())
    },
    actualizar: async (
      id: number,
      entrada: CursoAcademicoEntrada
    ): Promise<CursoAcademico | null> => {
      const cursos = leerCursos()
      const anterior = cursos.find((curso) => curso.id === id)
      if (!anterior) return null

      const nombre = entrada.nombre?.trim()
      if (!nombre) throw new Error('El nombre del curso académico es obligatorio.')
      if (nombre.length > 40) {
        throw new Error('El nombre del curso académico no puede superar 40 caracteres.')
      }
      if (
        cursos.some(
          (curso) => curso.id !== id && curso.nombre.toLowerCase() === nombre.toLowerCase()
        )
      ) {
        throw new Error(`Ya existe el curso académico «${nombre}».`)
      }

      const marcarActual = entrada.actual ?? anterior.actual
      if (!marcarActual && anterior.actual) {
        const otros = cursos.some((curso) => curso.id !== id && curso.actual)
        if (!otros) {
          throw new Error(
            'Tiene que haber un curso académico actual. Activa otro antes de desmarcarlo.'
          )
        }
      }

      const actualizados = cursos.map((curso) => {
        if (marcarActual) return { ...curso, actual: curso.id === id }
        return curso.id === id ? { ...curso, nombre, actual: false } : curso
      })
      if (marcarActual) {
        const indice = actualizados.findIndex((curso) => curso.id === id)
        actualizados[indice] = { ...actualizados[indice], nombre, actual: true }
      }
      escribirCursos(actualizados)
      const actualizado = actualizados.find((curso) => curso.id === id)!
      return cursoConGrupos(actualizado, leer())
    },
    marcarActual: async (id: number): Promise<CursoAcademico | null> => {
      const cursos = leerCursos()
      const curso = cursos.find((item) => item.id === id)
      if (!curso) return null
      const periodo = cursoAcademicoActual()
      if (curso.inicio !== periodo.inicio || curso.fin !== periodo.fin) {
        throw new Error('El curso actual se calcula por la fecha; no se puede activar otro.')
      }
      const actualizados = cursos.map((item) => ({ ...item, actual: item.id === id }))
      escribirCursos(actualizados)
      const actual = actualizados.find((curso) => curso.id === id)!
      return cursoConGrupos(actual, leer())
    },
    borrar: async (id: number): Promise<boolean> => {
      const cursos = leerCursos()
      const curso = cursos.find((item) => item.id === id)
      if (!curso) return false
      const gruposCurso = leer().filter((grupo) => grupo.curso_academico_id === id)
      for (const grupo of gruposCurso) {
        await api.gruposClase.borrar(grupo.id)
      }
      escribirCursos(cursos.filter((item) => item.id !== id))
      return true
    }
  },
  gruposClase: {
    listar: async (cursoAcademicoId?: number) => {
      const ciclo = await cicloDaw()
      const grupos = leer()
      const filtrados =
        cursoAcademicoId === undefined
          ? grupos
          : grupos.filter((grupo) => grupo.curso_academico_id === cursoAcademicoId)
      return filtrados.map((grupo) => conContadores(ciclo, grupo))
    },
    crear: async (entrada: GrupoClaseEntrada) => {
      const ciclo = await cicloDaw()
      const grupos = leer()
      const actual = asegurarCursoActualWeb()
      const entradaConCurso = { ...entrada, curso_academico_id: actual.id }
      if (existe(grupos, entradaConCurso)) {
        throw new Error(`Ya existe el grupo «${componer(ciclo, entradaConCurso).nombre}».`)
      }
      const grupo = {
        ...componer(ciclo, entradaConCurso),
        id: Math.max(0, ...grupos.map((g) => g.id)) + 1
      }
      escribir([...grupos, grupo])
      return conContadores(ciclo, grupo)
    },
    actualizar: async (id: number, entrada: GrupoClaseEntrada) => {
      const ciclo = await cicloDaw()
      const grupos = leer()
      const anterior = grupos.find((g) => g.id === id)
      if (!anterior) return null
      const entradaConCurso = {
        ...entrada,
        curso_academico_id: anterior.curso_academico_id,
        dias_semana: entrada.dias_semana ?? anterior.dias_semana,
        tutorias_semana: entrada.tutorias_semana ?? anterior.tutorias_semana,
        bloques_semana: entrada.bloques_semana ?? anterior.bloques_semana
      }
      if (existe(grupos, entradaConCurso, id)) {
        throw new Error(`Ya existe el grupo «${componer(ciclo, entradaConCurso).nombre}».`)
      }
      const actualizado = {
        ...componer(ciclo, entradaConCurso),
        id,
        creado_en: anterior.creado_en
      }
      escribir(grupos.map((g) => (g.id === id ? actualizado : g)))
      return conContadores(ciclo, actualizado)
    },
    borrar: async (id: number) => {
      const grupos = leer()
      const restantes = grupos.filter((g) => g.id !== id)
      escribir(restantes)
      const matriculas = leerMatriculas()
      delete matriculas[String(id)]
      escribirMatriculas(matriculas)
      const criterios = leerCriterios()
      delete criterios[String(id)]
      escribirCriterios(criterios)
      const programacion = leerProgramacion()
      delete programacion[String(id)]
      escribirProgramacion(programacion)
      const entregas = leerEntregas()
      const idsEntregas = new Set((entregas[String(id)] ?? []).map((entrega) => entrega.id))
      delete entregas[String(id)]
      escribirEntregas(entregas)
      const evidencias = leerEvidencias().filter(
        (evidencia) => !idsEntregas.has(evidencia.entrega_id)
      )
      escribirEvidencias(evidencias)
      const notas = leerNotas()
      delete notas[String(id)]
      escribirNotas(notas)
      escribirFormacion(leerFormacion().filter((periodo) => periodo.grupo_clase_id !== id))
      escribirEventosEvaluacion(
        leerEventosEvaluacion().filter((evento) => evento.grupo_clase_id !== id)
      )
      return restantes.length !== grupos.length
    }
  },
  alumnosClase: {
    listar: async (grupoClaseId: number): Promise<AlumnoClase[]> => {
      const ids = new Set(leerMatriculas()[String(grupoClaseId)] ?? [])
      return leerAlumnos()
        .filter((alumno) => ids.has(alumno.id))
        .map(aAlumnoClase)
        .sort(
          (a, b) =>
            a.apellidos.localeCompare(b.apellidos, 'es') || a.nombre.localeCompare(b.nombre, 'es')
        )
    },
    crear: async (
      grupoClaseId: number,
      entrada: AlumnoEntrada
    ): Promise<ResultadoAltaAlumnoClase> => {
      if (!leer().some((grupo) => grupo.id === grupoClaseId)) {
        throw new Error('El grupo no existe.')
      }
      if (!entrada.nombre?.trim() || !entrada.apellidos?.trim()) {
        throw new Error('El nombre y los apellidos son obligatorios.')
      }
      const alumnos = leerAlumnos()
      const previo = buscarAlumno(alumnos, entrada)
      let alumno: AlumnoGuardado
      if (previo) {
        alumno = previo
      } else {
        alumno = {
          id: Math.max(0, ...alumnos.map((a) => a.id)) + 1,
          nombre: entrada.nombre.trim(),
          apellidos: entrada.apellidos.trim(),
          dni: entrada.dni?.trim() || null,
          email: entrada.email?.trim() || null,
          activo: entrada.activo ?? true
        }
        alumnos.push(alumno)
        escribirAlumnos(alumnos)
      }
      const matriculas = leerMatriculas()
      const ids = matriculas[String(grupoClaseId)] ?? []
      if (!ids.includes(alumno.id)) {
        escribirMatriculas({
          ...matriculas,
          [String(grupoClaseId)]: [...ids, alumno.id]
        })
      }
      return { alumno: aAlumnoClase(alumno), creado: !previo }
    },
    actualizar: async (id: number, entrada: AlumnoEntrada): Promise<AlumnoClase | null> => {
      const alumnos = leerAlumnos()
      const indice = alumnos.findIndex((alumno) => alumno.id === id)
      if (indice < 0) return null
      if (!entrada.nombre?.trim() || !entrada.apellidos?.trim()) {
        throw new Error('El nombre y los apellidos son obligatorios.')
      }
      alumnos[indice] = {
        ...alumnos[indice],
        nombre: entrada.nombre.trim(),
        apellidos: entrada.apellidos.trim(),
        dni: entrada.dni?.trim() || null,
        email: entrada.email?.trim() || null,
        activo: entrada.activo ?? alumnos[indice].activo
      }
      escribirAlumnos(alumnos)
      return aAlumnoClase(alumnos[indice])
    },
    activar: async (id: number, activo: boolean): Promise<AlumnoClase | null> => {
      const alumnos = leerAlumnos()
      const indice = alumnos.findIndex((alumno) => alumno.id === id)
      if (indice < 0) return null
      alumnos[indice] = { ...alumnos[indice], activo }
      escribirAlumnos(alumnos)
      return aAlumnoClase(alumnos[indice])
    },
    desmatricular: async (grupoClaseId: number, alumnoId: number): Promise<boolean> => {
      const matriculas = leerMatriculas()
      const clave = String(grupoClaseId)
      const ids = matriculas[clave] ?? []
      const restantes = ids.filter((id) => id !== alumnoId)
      if (restantes.length === ids.length) return false
      if (restantes.length === 0) delete matriculas[clave]
      else matriculas[clave] = restantes
      escribirMatriculas(matriculas)
      return true
    }
  },
  matriculasClase: {
    importar: async (grupoClaseId: number, texto: string): Promise<ResultadoImportacionClase> => {
      const filas = parsearEntradaAlumnos(texto)
      const alumnos = leerAlumnos()
      const matriculas = leerMatriculas()
      const ids = matriculas[String(grupoClaseId)] ?? []
      const errores: string[] = []
      let creados = 0
      let existentes = 0

      filas.forEach((fila, indice) => {
        if (!fila.nombre || !fila.apellidos) {
          errores.push(`Fila ${indice + 1}: faltan nombre o apellidos`)
          return
        }
        const dni = fila.dni?.trim() || null
        let previo = dni
          ? alumnos.find((a) => a.dni?.toLowerCase() === dni.toLowerCase())
          : undefined
        if (!previo && fila.email) {
          previo = alumnos.find((a) => a.email?.toLowerCase() === fila.email?.toLowerCase())
        }
        if (!previo) {
          previo = alumnos.find(
            (a) =>
              a.nombre.toLowerCase() === fila.nombre.toLowerCase() &&
              a.apellidos.toLowerCase() === fila.apellidos.toLowerCase()
          )
        }

        let alumno: AlumnoGuardado
        if (previo) {
          alumno = previo
          existentes++
        } else {
          alumno = {
            id: Math.max(0, ...alumnos.map((a) => a.id)) + 1,
            nombre: fila.nombre,
            apellidos: fila.apellidos,
            dni,
            email: fila.email,
            activo: true
          }
          alumnos.push(alumno)
          creados++
        }
        if (!ids.includes(alumno.id)) ids.push(alumno.id)
      })

      escribirAlumnos(alumnos)
      escribirMatriculas({ ...matriculas, [String(grupoClaseId)]: ids })
      return { creados, existentes, errores }
    }
  },
  entregasClase: {
    listar: async (grupoClaseId: number): Promise<EntregaClase[]> =>
      (leerEntregas()[String(grupoClaseId)] ?? [])
        .map(entregaConContadores)
        .sort(
          (a, b) =>
            (a.fecha_limite ?? '9999-12-31').localeCompare(b.fecha_limite ?? '9999-12-31') ||
            a.id - b.id
        ),
    crear: async (grupoClaseId: number, entrada: EntregaClaseEntrada): Promise<EntregaClase> => {
      const grupo = leer().find((g) => g.id === grupoClaseId)
      if (!grupo) throw new Error('El grupo no existe.')
      if (!entrada.titulo?.trim()) throw new Error('El título de la entrega es obligatorio.')

      const modelo = leerCriterios()[String(grupoClaseId)]
      if (!modelo) throw new Error('Define primero los criterios de calificación del grupo.')
      if (!modelo.avaluaciones.some((a) => a.id === entrada.avaluacion_id)) {
        throw new Error('La avaluación no pertenece a los criterios del grupo.')
      }
      if (!modelo.categorias.some((c) => c.id === entrada.categoria_id)) {
        throw new Error('La categoría no pertenece a los criterios del grupo.')
      }

      const ciclo = await cicloDaw()
      const validos = new Set(criteriosDeModulo(ciclo, grupo.modulo_codigo).map((c) => c.ceId))
      const ceIds = [...new Set(entrada.ce_ids ?? [])]
      if (ceIds.some((id) => !validos.has(id))) {
        throw new Error('Hay criterios que no pertenecen al módulo.')
      }

      const entregas = leerEntregas()
      const todas = Object.values(entregas).flat()
      const nueva: EntregaGuardada = {
        id: Math.max(0, ...todas.map((e) => e.id)) + 1,
        grupo_clase_id: grupoClaseId,
        titulo: entrada.titulo.trim(),
        descripcion: entrada.descripcion?.trim() || null,
        tipo: entrada.tipo || 'tarea',
        fecha_limite: entrada.fecha_limite?.trim() || null,
        rubrica: entrada.rubrica?.trim() || null,
        rubrica_archivo: entrada.rubrica_archivo ?? null,
        avaluacion_id: entrada.avaluacion_id,
        categoria_id: entrada.categoria_id,
        ce_ids: ceIds,
        bloqueada: false,
        creada_en: new Date().toISOString().slice(0, 19).replace('T', ' ')
      }
      entregas[String(grupoClaseId)] = [...(entregas[String(grupoClaseId)] ?? []), nueva]
      escribirEntregas(entregas)
      return entregaConContadores(nueva)
    },
    actualizar: async (id: number, entrada: EntregaClaseEntrada): Promise<EntregaClase | null> => {
      const entregas = leerEntregas()
      const grupoClaseId = Object.keys(entregas).find((clave) =>
        entregas[clave].some((e) => e.id === id)
      )
      if (!grupoClaseId) return null
      const grupo = leer().find((g) => g.id === Number(grupoClaseId))
      if (!grupo) return null
      const previa = entregas[grupoClaseId].find((entrega) => entrega.id === id)
      if (previa?.bloqueada) {
        throw new Error('La entrega está bloqueada: desbloquéala para editarla.')
      }
      if (!entrada.titulo?.trim()) throw new Error('El título de la entrega es obligatorio.')

      const modelo = leerCriterios()[grupoClaseId]
      if (!modelo) throw new Error('Define primero los criterios de calificación del grupo.')
      if (!modelo.avaluaciones.some((a) => a.id === entrada.avaluacion_id)) {
        throw new Error('La avaluación no pertenece a los criterios del grupo.')
      }
      if (!modelo.categorias.some((c) => c.id === entrada.categoria_id)) {
        throw new Error('La categoría no pertenece a los criterios del grupo.')
      }

      const ciclo = await cicloDaw()
      const validos = new Set(criteriosDeModulo(ciclo, grupo.modulo_codigo).map((c) => c.ceId))
      const ceIds = [...new Set(entrada.ce_ids ?? [])]
      if (ceIds.some((ceId) => !validos.has(ceId))) {
        throw new Error('Hay criterios que no pertenecen al módulo.')
      }

      const lista = entregas[grupoClaseId].map((entrega) =>
        entrega.id === id
          ? {
              ...entrega,
              titulo: entrada.titulo.trim(),
              descripcion: entrada.descripcion?.trim() || null,
              tipo: entrada.tipo || 'tarea',
              fecha_limite: entrada.fecha_limite?.trim() || null,
              rubrica: entrada.rubrica?.trim() || null,
              rubrica_archivo: entrada.rubrica_archivo ?? null,
              avaluacion_id: entrada.avaluacion_id,
              categoria_id: entrada.categoria_id,
              ce_ids: ceIds
            }
          : entrega
      )
      entregas[grupoClaseId] = lista
      escribirEntregas(entregas)
      return entregaConContadores(lista.find((e) => e.id === id)!)
    },
    borrar: async (id: number): Promise<boolean> => {
      const entregas = leerEntregas()
      let borrada = false
      for (const clave of Object.keys(entregas)) {
        const previa = entregas[clave].find((e) => e.id === id)
        if (previa?.bloqueada) {
          throw new Error('La entrega está bloqueada: desbloquéala para borrarla.')
        }
        const restantes = entregas[clave].filter((e) => e.id !== id)
        if (restantes.length !== entregas[clave].length) {
          borrada = true
          entregas[clave] = restantes
        }
      }
      escribirEntregas(entregas)
      return borrada
    },
    bloquear: async (id: number, bloqueada: boolean): Promise<EntregaClase | null> => {
      const entregas = leerEntregas()
      for (const clave of Object.keys(entregas)) {
        const indice = entregas[clave].findIndex((e) => e.id === id)
        if (indice !== -1) {
          const actualizada = { ...entregas[clave][indice], bloqueada }
          entregas[clave][indice] = actualizada
          escribirEntregas(entregas)
          return entregaConContadores(actualizada)
        }
      }
      return null
    },
    criterios: async (grupoClaseId: number): Promise<CriterioDisponible[]> => {
      const grupo = leer().find((g) => g.id === grupoClaseId)
      if (!grupo) throw new Error('El grupo no existe.')
      const ciclo = await cicloDaw()
      return criteriosDeModulo(ciclo, grupo.modulo_codigo)
    },
    vistaPrevia: async (grupoClaseId: number, opciones: OpcionesExportacionEntregas) => {
      const grupoGuardado = leer().find((grupo) => grupo.id === grupoClaseId)
      if (!grupoGuardado) throw new Error('El grupo no existe.')
      const ciclo = await cicloDaw()
      const grupo = conContadores(ciclo, grupoGuardado)
      const todas = (leerEntregas()[String(grupoClaseId)] ?? []).map(entregaConContadores)
      let entregas = todas
      let titulo = 'Curso completo'
      if (opciones.ambito === 'entrega') {
        entregas = todas.filter((entrega) => entrega.id === Number(opciones.entregaId))
        titulo = entregas[0] ? `Entrega: ${entregas[0].titulo}` : 'Entrega'
      } else if (opciones.ambito === 'avaluacion') {
        entregas = todas.filter((entrega) => entrega.avaluacion_id === opciones.avaluacionId)
        titulo = `Avaluación: ${opciones.avaluacionId ?? ''}`
      }
      if (entregas.length === 0) throw new Error('No hay entregas que exportar.')
      const conArchivos = entregas.some(
        (entrega) => Boolean(entrega.rubrica_archivo) || evidenciasDeEntrega(entrega.id).length > 0
      )
      const conTexto = entregas.some((entrega) =>
        Boolean(entrega.descripcion?.trim() || entrega.rubrica?.trim())
      )
      return {
        html: htmlEntregasWeb(grupo, entregas, titulo, opciones.ambito, ciclo),
        titulo,
        total: entregas.length,
        conArchivos,
        conTexto
      }
    },
    exportar: async (
      grupoClaseId: number,
      opciones: OpcionesExportacionEntregas
    ): Promise<{ ok: boolean; ruta?: string; mensaje?: string }> => {
      const grupoGuardado = leer().find((grupo) => grupo.id === grupoClaseId)
      if (!grupoGuardado) throw new Error('El grupo no existe.')
      const ciclo = await cicloDaw()
      const grupo = conContadores(ciclo, grupoGuardado)
      const todas = (leerEntregas()[String(grupoClaseId)] ?? []).map(entregaConContadores)
      let entregas = todas
      let titulo = 'Curso completo'
      if (opciones.ambito === 'entrega') {
        entregas = todas.filter((entrega) => entrega.id === Number(opciones.entregaId))
        titulo = entregas[0] ? `Entrega: ${entregas[0].titulo}` : 'Entrega'
      } else if (opciones.ambito === 'avaluacion') {
        entregas = todas.filter((entrega) => entrega.avaluacion_id === opciones.avaluacionId)
        titulo = `Avaluación: ${opciones.avaluacionId ?? ''}`
      }
      if (entregas.length === 0) return { ok: false, mensaje: 'No hay entregas que exportar.' }

      const html = htmlEntregasWeb(grupo, entregas, titulo, opciones.ambito, ciclo)
      const conArchivos = entregas.some(
        (entrega) => Boolean(entrega.rubrica_archivo) || evidenciasDeEntrega(entrega.id).length > 0
      )
      const nombreBase =
        opciones.ambito === 'entrega' && entregas[0]
          ? nombreArchivoWeb(entregas[0].titulo)
          : 'entregas'
      if (!conArchivos) {
        descargarBlobWeb(
          `${nombreBase}.html`,
          new Blob([html], { type: 'text/html;charset=utf-8' })
        )
        return {
          ok: true,
          mensaje:
            'En la previsualización web se ha descargado el dossier en HTML; en la aplicación de escritorio se genera el PDF.'
        }
      }

      const zip = new JSZip()
      zip.file(`${nombreBase}.html`, html)
      for (const [indice, entrega] of entregas.entries()) {
        const carpeta = `archivos/${String(indice + 1).padStart(2, '0')}-${entrega.id}`
        if (entrega.rubrica_archivo) {
          zip.file(
            `${carpeta}/rubrica/${entrega.rubrica_archivo.nombre}`,
            entrega.rubrica_archivo.datos,
            { base64: true }
          )
        }
        for (const evidencia of evidenciasDeEntrega(entrega.id)) {
          zip.file(`${carpeta}/evidencias/${evidencia.nombre}`, evidencia.datos, {
            base64: true
          })
        }
      }
      const blob = await zip.generateAsync({ type: 'blob' })
      descargarBlobWeb(`${nombreBase}.zip`, blob)
      return { ok: true, mensaje: 'Entregas descargadas en ZIP.' }
    }
  },
  eventosEvaluacion: {
    listar: async (grupoClaseId: number): Promise<EventoEvaluacionClase[]> =>
      eventosDeGrupo(grupoClaseId),
    crear: async (
      grupoClaseId: number,
      entrada: EventoEvaluacionEntrada
    ): Promise<EventoEvaluacionClase> => {
      if (!leer().some((grupo) => grupo.id === grupoClaseId)) {
        throw new Error('El grupo no existe.')
      }
      if (!entrada.titulo?.trim() || !entrada.fecha) {
        throw new Error('Título y fecha son obligatorios.')
      }
      const eventos = leerEventosEvaluacion()
      const nuevo: EventoEvaluacionClase = {
        id: Math.max(0, ...eventos.map((evento) => evento.id)) + 1,
        grupo_clase_id: grupoClaseId,
        tipo: entrada.tipo,
        titulo: entrada.titulo.trim(),
        fecha: entrada.fecha,
        hora: entrada.hora?.trim() || null,
        avaluacion_id: entrada.avaluacion_id?.trim() || null,
        observaciones: entrada.observaciones?.trim() || null,
        creado_en: new Date().toISOString().slice(0, 19).replace('T', ' '),
        actualizado_en: new Date().toISOString().slice(0, 19).replace('T', ' ')
      }
      escribirEventosEvaluacion([...eventos, nuevo])
      return nuevo
    },
    actualizar: async (
      id: number,
      entrada: EventoEvaluacionEntrada
    ): Promise<EventoEvaluacionClase | null> => {
      const eventos = leerEventosEvaluacion()
      const anterior = eventos.find((evento) => evento.id === id)
      if (!anterior) return null
      const actualizado: EventoEvaluacionClase = {
        ...anterior,
        tipo: entrada.tipo,
        titulo: entrada.titulo.trim(),
        fecha: entrada.fecha,
        hora: entrada.hora?.trim() || null,
        avaluacion_id: entrada.avaluacion_id?.trim() || null,
        observaciones: entrada.observaciones?.trim() || null,
        actualizado_en: new Date().toISOString().slice(0, 19).replace('T', ' ')
      }
      escribirEventosEvaluacion(eventos.map((evento) => (evento.id === id ? actualizado : evento)))
      return actualizado
    },
    borrar: async (id: number): Promise<boolean> => {
      const eventos = leerEventosEvaluacion()
      const restantes = eventos.filter((evento) => evento.id !== id)
      if (restantes.length === eventos.length) return false
      escribirEventosEvaluacion(restantes)
      return true
    },
    importar: async (grupoClaseId: number, texto: string) => {
      if (!leer().some((grupo) => grupo.id === grupoClaseId)) {
        throw new Error('El grupo no existe.')
      }
      const { eventos, errores } = parsearEventosEvaluacion(texto)
      const actuales = leerEventosEvaluacion()
      let siguiente = Math.max(0, ...actuales.map((evento) => evento.id)) + 1
      let creados = 0
      for (const evento of eventos) {
        actuales.push({
          id: siguiente++,
          grupo_clase_id: grupoClaseId,
          tipo: evento.tipo,
          titulo: evento.titulo,
          fecha: evento.fecha,
          hora: evento.hora ?? null,
          avaluacion_id: evento.avaluacion_id ?? null,
          observaciones: evento.observaciones ?? null,
          creado_en: new Date().toISOString().slice(0, 19).replace('T', ' '),
          actualizado_en: new Date().toISOString().slice(0, 19).replace('T', ' ')
        })
        creados += 1
      }
      escribirEventosEvaluacion(actuales)
      return { creados, errores }
    }
  },
  formacionEmpresa: {
    listar: async (grupoClaseId: number, alumnoId?: number): Promise<PeriodoFormacionEmpresa[]> =>
      formacionDeGrupo(grupoClaseId, alumnoId),
    crear: async (
      grupoClaseId: number,
      alumnoId: number,
      entrada: PeriodoFormacionEmpresaEntrada
    ): Promise<PeriodoFormacionEmpresa> => {
      if (!leer().some((grupo) => grupo.id === grupoClaseId)) {
        throw new Error('El grupo no existe.')
      }
      if (!(leerMatriculas()[String(grupoClaseId)] ?? []).includes(alumnoId)) {
        throw new Error('El alumno no está matriculado en este grupo.')
      }
      const empresa = entrada.empresa?.trim()
      if (!entrada.fecha_inicio || !entrada.fecha_fin || !empresa) {
        throw new Error('Indica fechas de inicio y fin, y la empresa.')
      }
      if (entrada.fecha_inicio > entrada.fecha_fin) {
        throw new Error('La fecha de inicio no puede ser posterior a la de fin.')
      }
      const horas =
        entrada.horas === undefined || entrada.horas === null ? 0 : Number(entrada.horas)
      if (!Number.isFinite(horas) || horas < 0) {
        throw new Error('Las horas realizadas deben ser un número positivo.')
      }
      const formacion = leerFormacion()
      const solapa = formacion.some(
        (periodo) =>
          periodo.grupo_clase_id === grupoClaseId &&
          periodo.alumno_id === alumnoId &&
          periodo.fecha_inicio <= entrada.fecha_fin &&
          periodo.fecha_fin >= entrada.fecha_inicio
      )
      if (solapa) {
        throw new Error('Este periodo se solapa con otro ya registrado para el alumno.')
      }
      const nuevo: PeriodoFormacionEmpresa = {
        id: Math.max(0, ...formacion.map((periodo) => periodo.id)) + 1,
        grupo_clase_id: grupoClaseId,
        alumno_id: alumnoId,
        fecha_inicio: entrada.fecha_inicio,
        fecha_fin: entrada.fecha_fin,
        empresa,
        horas: Math.round(horas * 100) / 100,
        observaciones: entrada.observaciones?.trim() || null,
        creado_en: new Date().toISOString().slice(0, 19).replace('T', ' '),
        actualizado_en: new Date().toISOString().slice(0, 19).replace('T', ' ')
      }
      escribirFormacion([...formacion, nuevo])
      return nuevo
    },
    actualizar: async (
      id: number,
      entrada: PeriodoFormacionEmpresaEntrada
    ): Promise<PeriodoFormacionEmpresa | null> => {
      const formacion = leerFormacion()
      const anterior = formacion.find((periodo) => periodo.id === id)
      if (!anterior) return null
      const empresa = entrada.empresa?.trim()
      if (!entrada.fecha_inicio || !entrada.fecha_fin || !empresa) {
        throw new Error('Indica fechas de inicio y fin, y la empresa.')
      }
      if (entrada.fecha_inicio > entrada.fecha_fin) {
        throw new Error('La fecha de inicio no puede ser posterior a la de fin.')
      }
      const horas =
        entrada.horas === undefined || entrada.horas === null ? 0 : Number(entrada.horas)
      if (!Number.isFinite(horas) || horas < 0) {
        throw new Error('Las horas realizadas deben ser un número positivo.')
      }
      const solapa = formacion.some(
        (periodo) =>
          periodo.id !== id &&
          periodo.grupo_clase_id === anterior.grupo_clase_id &&
          periodo.alumno_id === anterior.alumno_id &&
          periodo.fecha_inicio <= entrada.fecha_fin &&
          periodo.fecha_fin >= entrada.fecha_inicio
      )
      if (solapa) {
        throw new Error('Este periodo se solapa con otro ya registrado para el alumno.')
      }
      const actualizado: PeriodoFormacionEmpresa = {
        ...anterior,
        fecha_inicio: entrada.fecha_inicio,
        fecha_fin: entrada.fecha_fin,
        empresa,
        horas: Math.round(horas * 100) / 100,
        observaciones: entrada.observaciones?.trim() || null,
        actualizado_en: new Date().toISOString().slice(0, 19).replace('T', ' ')
      }
      escribirFormacion(formacion.map((periodo) => (periodo.id === id ? actualizado : periodo)))
      return actualizado
    },
    borrar: async (id: number): Promise<boolean> => {
      const formacion = leerFormacion()
      const restantes = formacion.filter((periodo) => periodo.id !== id)
      if (restantes.length === formacion.length) return false
      escribirFormacion(restantes)
      return true
    }
  },
  normativaFpt: {
    leer: async (): Promise<NormativaFpt> => respuestaNormativa(),
    importar: async (html: string): Promise<NormativaFpt> => {
      validarHtmlNormativa(html)
      await guardarNormativa({
        id: NORMATIVA_ID,
        html,
        actualizado_en: new Date().toISOString()
      })
      return respuestaNormativa()
    },
    restaurar: async (): Promise<NormativaFpt> => {
      await borrarNormativaGuardada()
      return respuestaNormativa()
    }
  },
  evidenciasClase: {
    listar: async (grupoClaseId: number, entregaId: number): Promise<EvidenciaClase[]> => {
      const entrega = (leerEntregas()[String(grupoClaseId)] ?? []).find(
        (item) => item.id === entregaId
      )
      return entrega ? evidenciasDeEntrega(entregaId) : []
    },
    subir: async (
      grupoClaseId: number,
      entregaId: number,
      archivos: EvidenciaClaseEntrada[]
    ): Promise<EvidenciaClase[]> => {
      const entrega = (leerEntregas()[String(grupoClaseId)] ?? []).find(
        (item) => item.id === entregaId
      )
      if (!entrega) throw new Error('La entrega no pertenece a este grupo.')
      if (entrega.bloqueada) {
        throw new Error('La entrega está bloqueada: desbloquéala para cambiar sus evidencias.')
      }
      if (archivos.length === 0) return evidenciasDeEntrega(entregaId)

      for (const archivo of archivos) {
        if (!archivo.nombre?.trim()) throw new Error('El archivo debe tener un nombre.')
        if (!archivo.datos?.trim()) throw new Error('El archivo está vacío.')
        if (!Number.isFinite(archivo.tamano) || archivo.tamano < 0) {
          throw new Error('El tamaño del archivo no es válido.')
        }
        if (archivo.tamano > 4 * 1024 * 1024 || archivo.datos.length > 6_000_000) {
          throw new Error('Cada archivo puede ocupar como máximo 4 MB.')
        }
      }

      const evidencias = leerEvidencias()
      let siguiente = Math.max(0, ...evidencias.map((evidencia) => evidencia.id)) + 1
      const nuevas = archivos.map((archivo) => ({
        id: siguiente++,
        entrega_id: entregaId,
        categoria: archivo.categoria ?? 'material',
        nombre: archivo.nombre.trim(),
        tipo: archivo.tipo?.trim() || 'application/octet-stream',
        tamano: Math.round(archivo.tamano),
        datos: archivo.datos,
        creado_en: new Date().toISOString().slice(0, 19).replace('T', ' ')
      }))
      escribirEvidencias([...evidencias, ...nuevas])
      return evidenciasDeEntrega(entregaId)
    },
    borrar: async (id: number): Promise<boolean> => {
      const evidencias = leerEvidencias()
      const evidencia = evidencias.find((item) => item.id === id)
      if (!evidencia) return false
      const entrega = Object.values(leerEntregas())
        .flat()
        .find((item) => item.id === evidencia.entrega_id)
      if (entrega?.bloqueada) {
        throw new Error('La entrega está bloqueada: desbloquéala para borrar evidencias.')
      }
      escribirEvidencias(evidencias.filter((item) => item.id !== id))
      return true
    }
  },
  notasClase: {
    listar: async (grupoClaseId: number): Promise<NotaGuardadaClase[]> =>
      notasDeGrupo(grupoClaseId),
    guardar: async (
      grupoClaseId: number,
      alumnoId: number,
      entradas: NotaEntradaClase[]
    ): Promise<NotaGuardadaClase[]> => {
      if (!leer().some((grupo) => grupo.id === grupoClaseId)) {
        throw new Error('El grupo no existe.')
      }
      if (!(leerMatriculas()[String(grupoClaseId)] ?? []).includes(alumnoId)) {
        throw new Error('El alumno no está matriculado en este grupo.')
      }
      const guardadas = new Map(
        (leerEntregas()[String(grupoClaseId)] ?? []).map((entrega) => [
          entrega.id,
          entrega.bloqueada
        ])
      )
      const notas = leerNotas()
      const delGrupo = notas[String(grupoClaseId)] ?? {}
      const delAlumno = delGrupo[String(alumnoId)] ?? {}

      for (const entrada of entradas) {
        const bloqueada = guardadas.get(entrada.entregaId)
        if (bloqueada === undefined) {
          throw new Error('La entrega no pertenece a este grupo.')
        }
        if (bloqueada) {
          throw new Error('La entrega está bloqueada: desbloquéala para cambiar sus notas.')
        }

        const clave = String(entrada.entregaId)
        const celda = delAlumno[clave] ?? { nota: null, observaciones: null }

        if (entrada.nota === null) {
          celda.nota = null
        } else {
          const nota = Number(entrada.nota)
          if (!Number.isFinite(nota) || nota < 0 || nota > 10) {
            throw new Error('La nota debe estar entre 0 y 10.')
          }
          celda.nota = nota
        }

        if (entrada.observaciones !== undefined) {
          celda.observaciones = entrada.observaciones?.trim() || null
        }

        if (celda.nota === null && !celda.observaciones) {
          delete delAlumno[clave]
        } else {
          delAlumno[clave] = celda
        }
      }

      if (Object.keys(delAlumno).length > 0) {
        delGrupo[String(alumnoId)] = delAlumno
      } else {
        delete delGrupo[String(alumnoId)]
      }
      notas[String(grupoClaseId)] = delGrupo
      escribirNotas(notas)
      return notasDeGrupo(grupoClaseId)
    }
  },
  criterios: {
    obtener: async (grupoClaseId: number) => leerCriterios()[String(grupoClaseId)] ?? null,
    guardar: async (grupoClaseId: number, modelo: ModeloEvaluacion) => {
      validarModeloWeb(modelo)
      const normalizado = normalizarModelo(modelo)
      const criterios = leerCriterios()
      criterios[String(grupoClaseId)] = normalizado
      escribirCriterios(criterios)
      return normalizado
    },
    plantillaParaGrupo: async (grupoClaseId: number): Promise<PlantillaParaGrupo> => {
      const grupo = leer().find((g) => g.id === grupoClaseId)
      if (!grupo) throw new Error('El grupo no existe.')
      const plantilla = leerPlantillas().find(
        (p) => p.modulo_codigo === grupo.modulo_codigo && p.modalidad === grupo.modalidad
      )
      return plantilla
        ? { nombre: plantilla.nombre, modelo: plantilla.modelo }
        : { nombre: null, modelo: modeloPorDefecto(grupo.modalidad) }
    },
    crearPlantillaDesdeGrupo: async (
      grupoClaseId: number,
      modelo: ModeloEvaluacion
    ): Promise<PlantillaCriterios> => {
      validarModeloWeb(modelo)
      const grupo = leer().find((g) => g.id === grupoClaseId)
      if (!grupo) throw new Error('El grupo no existe.')
      const normalizado = normalizarModelo(modelo)
      const plantillas = leerPlantillas()
      const indice = plantillas.findIndex(
        (p) => p.modulo_codigo === grupo.modulo_codigo && p.modalidad === grupo.modalidad
      )
      const ahora = new Date().toISOString().slice(0, 19).replace('T', ' ')
      const anterior = indice >= 0 ? plantillas[indice] : undefined
      const plantilla: PlantillaGuardada = {
        id: anterior?.id ?? Math.max(0, ...plantillas.map((p) => p.id)) + 1,
        nombre: `Plantilla ${grupo.nombre}`,
        modulo_codigo: grupo.modulo_codigo,
        modalidad: grupo.modalidad,
        modelo: normalizado,
        creado_en: anterior?.creado_en ?? ahora,
        actualizado_en: ahora
      }
      if (indice >= 0) plantillas[indice] = plantilla
      else plantillas.push(plantilla)
      escribirPlantillas(plantillas)
      const { modelo: _, ...datos } = plantilla
      return datos
    },
    listarPlantillas: async (): Promise<PlantillaCriterios[]> =>
      leerPlantillas().map(({ modelo: _, ...datos }) => datos),
    obtenerPlantilla: async (id: number) =>
      leerPlantillas().find((p) => p.id === id)?.modelo ?? null,
    guardarPlantilla: async (id: number, modelo: ModeloEvaluacion) => {
      validarModeloWeb(modelo)
      const normalizado = normalizarModelo(modelo)
      const plantillas = leerPlantillas()
      const indice = plantillas.findIndex((p) => p.id === id)
      if (indice < 0) throw new Error('La plantilla no existe.')
      plantillas[indice] = {
        ...plantillas[indice],
        modelo: normalizado,
        actualizado_en: new Date().toISOString().slice(0, 19).replace('T', ' ')
      }
      escribirPlantillas(plantillas)
      return normalizado
    },
    borrarPlantilla: async (id: number) => {
      const plantillas = leerPlantillas()
      const restantes = plantillas.filter((p) => p.id !== id)
      escribirPlantillas(restantes)
      return restantes.length !== plantillas.length
    },
    copiar: async (grupoClaseId: number) => {
      const grupo = leer().find((g) => g.id === grupoClaseId)
      if (!grupo) throw new Error('El grupo no existe.')
      const criterios = leerCriterios()
      const modelo = criterios[String(grupoClaseId)] ?? modeloPorDefecto(grupo.modalidad)
      const destinos = leer().filter(
        (g) => g.id !== grupoClaseId && g.modulo_codigo === grupo.modulo_codigo
      )
      for (const destino of destinos) {
        criterios[String(destino.id)] = modelo
      }
      escribirCriterios(criterios)
      return destinos.length
    }
  },
  programacion: {
    listar: async (grupoClaseId: number) =>
      (leerProgramacion()[String(grupoClaseId)] ?? [])
        .map((fila) => ({
          ...fila,
          unidad_id: fila.unidad_id ?? null,
          hora: fila.hora ?? null,
          orden: fila.orden ?? 0
        }))
        .slice()
        .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id),
    guardar: async (grupoClaseId: number, filas: ProgramacionEntrada[]) => {
      const grupo = leer().find((g) => g.id === grupoClaseId)
      if (!grupo) throw new Error('El grupo no existe.')
      const programacion = leerProgramacion()
      const anteriores = programacion[String(grupoClaseId)] ?? []
      const ahora = new Date().toISOString().slice(0, 19).replace('T', ' ')
      const maxId = Math.max(
        0,
        ...Object.values(programacion)
          .flat()
          .map((f) => f.id)
      )
      let siguiente = maxId
      const nuevas = filas.map((fila, indice) => {
        if (!fechaValida(fila.fecha)) {
          throw new Error(`Fila ${indice + 1}: la fecha no es válida.`)
        }
        const anterior = fila.id ? anteriores.find((f) => f.id === fila.id) : undefined
        return {
          id: anterior?.id ?? ++siguiente,
          grupo_clase_id: grupoClaseId,
          unidad_id: fila.unidad_id ?? anterior?.unidad_id ?? null,
          hora: fila.hora?.trim() || anterior?.hora || null,
          orden: fila.orden ?? anterior?.orden ?? 0,
          fecha: fila.fecha,
          contenido: fila.contenido,
          desviacion: fila.desviacion,
          observaciones: fila.observaciones,
          creado_en: anterior?.creado_en ?? ahora,
          actualizado_en: ahora
        }
      })
      programacion[String(grupoClaseId)] = nuevas
      escribirProgramacion(programacion)
      return nuevas.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id)
    },
    exportarPdf: async (grupoClaseId: number) => {
      const guardado = leer().find((grupo) => grupo.id === grupoClaseId)
      if (!guardado) throw new Error('El grupo no existe.')
      const ciclo = await cicloDaw()
      const grupo = conContadores(ciclo, guardado)
      const filas = (leerProgramacion()[String(grupoClaseId)] ?? [])
        .map((fila) => ({
          ...fila,
          unidad_id: fila.unidad_id ?? null,
          hora: fila.hora ?? null,
          orden: fila.orden ?? 0
        }))
        .slice()
        .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id)
      const html = generarHtmlProgramacion(grupo, filas, unidadesDeGrupo(grupoClaseId))
      const ventana = window.open('', '_blank', 'width=1100,height=760')
      if (!ventana) {
        return {
          ok: false,
          mensaje:
            'El navegador ha bloqueado la ventana de impresión. Permite las ventanas emergentes.'
        }
      }
      ventana.document.open()
      ventana.document.write(html)
      ventana.document.close()
      ventana.focus()
      window.setTimeout(() => ventana.print(), 250)
      return {
        ok: true,
        mensaje: 'Se ha abierto el diálogo de impresión; elige «Guardar como PDF».'
      }
    }
  },
  unidadesProgramacion: {
    listar: async (grupoClaseId: number): Promise<UnidadProgramacion[]> =>
      unidadesDeGrupo(grupoClaseId),
    crear: async (
      grupoClaseId: number,
      entrada: UnidadProgramacionEntrada
    ): Promise<UnidadProgramacion> => {
      if (!leer().some((grupo) => grupo.id === grupoClaseId)) {
        throw new Error('El grupo no existe.')
      }
      const nombre = entrada.nombre?.trim()
      if (!nombre) throw new Error('El nombre de la unidad es obligatorio.')
      const fechaInicio = entrada.fecha_inicio?.trim() || null
      const fechaFin = entrada.fecha_fin?.trim() || null
      if (fechaInicio && !fechaValida(fechaInicio)) {
        throw new Error('La fecha de inicio no es válida.')
      }
      if (fechaFin && !fechaValida(fechaFin)) {
        throw new Error('La fecha de fin no es válida.')
      }
      if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
        throw new Error('La fecha de inicio no puede ser posterior a la de fin.')
      }
      const unidades = leerUnidades()
      const ahora = new Date().toISOString().slice(0, 19).replace('T', ' ')
      const nueva: UnidadProgramacion = {
        id: Math.max(0, ...unidades.map((unidad) => unidad.id)) + 1,
        grupo_clase_id: grupoClaseId,
        codigo: entrada.codigo?.trim() || null,
        nombre,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        contenidos: entrada.contenidos?.trim() ?? '',
        observaciones: entrada.observaciones?.trim() || null,
        ra_codigos: [...new Set((entrada.ra_codigos ?? []).map((ra) => ra.trim()).filter(Boolean))],
        sesiones: [],
        creado_en: ahora,
        actualizado_en: ahora
      }
      escribirUnidades([...unidades, nueva])
      return unidadesDeGrupo(grupoClaseId).find((unidad) => unidad.id === nueva.id)!
    },
    actualizar: async (
      id: number,
      entrada: UnidadProgramacionEntrada
    ): Promise<UnidadProgramacion | null> => {
      const unidades = leerUnidades()
      const anterior = unidades.find((unidad) => unidad.id === id)
      if (!anterior) return null
      const nombre = entrada.nombre?.trim()
      if (!nombre) throw new Error('El nombre de la unidad es obligatorio.')
      const fechaInicio = entrada.fecha_inicio?.trim() || null
      const fechaFin = entrada.fecha_fin?.trim() || null
      if (fechaInicio && !fechaValida(fechaInicio)) {
        throw new Error('La fecha de inicio no es válida.')
      }
      if (fechaFin && !fechaValida(fechaFin)) {
        throw new Error('La fecha de fin no es válida.')
      }
      if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
        throw new Error('La fecha de inicio no puede ser posterior a la de fin.')
      }
      const actualizada: UnidadProgramacion = {
        ...anterior,
        codigo: entrada.codigo?.trim() || null,
        nombre,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        contenidos: entrada.contenidos?.trim() ?? '',
        observaciones: entrada.observaciones?.trim() || null,
        ra_codigos: [...new Set((entrada.ra_codigos ?? []).map((ra) => ra.trim()).filter(Boolean))],
        actualizado_en: new Date().toISOString().slice(0, 19).replace('T', ' ')
      }
      escribirUnidades(unidades.map((unidad) => (unidad.id === id ? actualizada : unidad)))
      return unidadesDeGrupo(anterior.grupo_clase_id).find((unidad) => unidad.id === id) ?? null
    },
    borrar: async (id: number): Promise<boolean> => {
      const unidades = leerUnidades()
      if (!unidades.some((unidad) => unidad.id === id)) return false
      const programacion = leerProgramacion()
      for (const [grupoId, filas] of Object.entries(programacion)) {
        programacion[grupoId] = filas.map((fila) =>
          fila.unidad_id === id ? { ...fila, unidad_id: null } : fila
        )
      }
      escribirProgramacion(programacion)
      escribirUnidades(unidades.filter((unidad) => unidad.id !== id))
      return true
    },
    importar: async (grupoClaseId: number, texto: string) => {
      if (!leer().some((grupo) => grupo.id === grupoClaseId)) {
        throw new Error('El grupo no existe.')
      }
      const { unidades: importadas, errores } = parsearUnidadesProgramacion(texto)
      const unidades = leerUnidades()
      const programacion = leerProgramacion()
      const sesiones = programacion[String(grupoClaseId)] ?? []
      const ahora = new Date().toISOString().slice(0, 19).replace('T', ' ')
      let siguienteUnidad = Math.max(0, ...unidades.map((unidad) => unidad.id)) + 1
      let siguienteSesion = Math.max(0, ...sesiones.map((sesion) => sesion.id)) + 1
      let creados = 0

      for (const entrada of importadas) {
        const unidad: UnidadProgramacion = {
          id: siguienteUnidad++,
          grupo_clase_id: grupoClaseId,
          codigo: entrada.codigo ?? null,
          nombre: entrada.nombre,
          fecha_inicio: entrada.fecha_inicio ?? null,
          fecha_fin: entrada.fecha_fin ?? null,
          contenidos: entrada.contenidos ?? '',
          observaciones: entrada.observaciones ?? null,
          ra_codigos: entrada.ra_codigos ?? [],
          sesiones: [],
          creado_en: ahora,
          actualizado_en: ahora
        }
        unidades.push(unidad)
        for (const sesion of entrada.sesiones ?? []) {
          const existente = sesiones.find((fila) => fila.fecha === sesion.fecha)
          if (existente) {
            existente.unidad_id = unidad.id
            existente.contenido = sesion.contenido
            existente.desviacion = sesion.desviacion
            existente.observaciones = sesion.observaciones
            existente.actualizado_en = ahora
          } else {
            sesiones.push({
              id: siguienteSesion++,
              grupo_clase_id: grupoClaseId,
              unidad_id: unidad.id,
              fecha: sesion.fecha,
              hora: sesion.hora ?? null,
              orden: sesion.orden ?? 0,
              contenido: sesion.contenido,
              desviacion: sesion.desviacion,
              observaciones: sesion.observaciones,
              creado_en: ahora,
              actualizado_en: ahora
            })
          }
        }
        creados += 1
      }
      programacion[String(grupoClaseId)] = sesiones
      escribirProgramacion(programacion)
      escribirUnidades(unidades)
      return { creados, errores }
    }
  },
  calendarioEscolar: {
    listar: async (cursoAcademicoId: number): Promise<DiaCalendario[]> =>
      calendarioDeCurso(cursoAcademicoId),
    importar: async (
      cursoAcademicoId: number,
      texto: string
    ): Promise<ResultadoImportacionCalendario> => {
      if (!leerCursos().some((curso) => curso.id === cursoAcademicoId)) {
        throw new Error('El curso académico no existe.')
      }
      const { dias, errores } = parsearCalendarioEscolar(texto)
      if (dias.length === 0) return { creados: 0, errores }
      const calendario = leerCalendario()
      const ahora = new Date().toISOString().slice(0, 19).replace('T', ' ')
      let siguiente =
        Math.max(
          0,
          ...Object.values(calendario)
            .flat()
            .map((dia) => dia.id)
        ) + 1
      calendario[String(cursoAcademicoId)] = dias.map((dia) => ({
        id: siguiente++,
        curso_academico_id: cursoAcademicoId,
        fecha: dia.fecha,
        tipo: dia.tipo,
        descripcion: dia.descripcion ?? null,
        creado_en: ahora,
        actualizado_en: ahora
      }))
      escribirCalendario(calendario)
      return { creados: dias.length, errores }
    },
    vaciar: async (cursoAcademicoId: number): Promise<boolean> => {
      const calendario = leerCalendario()
      if (!calendario[String(cursoAcademicoId)]) return false
      delete calendario[String(cursoAcademicoId)]
      escribirCalendario(calendario)
      return true
    }
  },
  informes: {
    html: async (): Promise<string> => '',
    exportarPdf: async (): Promise<{ ok: boolean; mensaje: string }> => ({
      ok: false,
      mensaje:
        'La exportación a PDF está disponible en la aplicación de escritorio. En la previsualización web puedes usar «Ver informe».'
    }),
    exportarCsv: async (): Promise<{ ok: boolean; mensaje: string }> => ({
      ok: false,
      mensaje:
        'La exportación CSV está disponible en la aplicación de escritorio. En la previsualización web puedes usar «Ver informe».'
    })
  },
  demo: {
    cargar: async (): Promise<void> => {
      limpiarDatosDemo()
      escribirDemo()
      localStorage.setItem(CLAVE_DEMO, '1')
    },
    eliminar: async (): Promise<void> => {
      limpiarDatosDemo()
      // Deja la marca para que la previsualización no vuelva a sembrar datos.
      localStorage.setItem(CLAVE_DEMO, '1')
    },
    alumnos: async (grupoClaseId: number): Promise<void> => {
      if (!leer().some((grupo) => grupo.id === grupoClaseId)) {
        throw new Error('El grupo no existe.')
      }
      const alumnos = leerAlumnos()
      const matriculas = leerMatriculas()
      const ids = new Set(matriculas[String(grupoClaseId)] ?? [])

      for (const base of ALUMNOS_DEMO) {
        let alumno = buscarAlumno(alumnos, base)
        if (!alumno) {
          alumno = {
            ...base,
            id: Math.max(0, ...alumnos.map((a) => a.id)) + 1
          }
          alumnos.push(alumno)
        }
        ids.add(alumno.id)
      }

      escribirAlumnos(alumnos)
      escribirMatriculas({
        ...matriculas,
        [String(grupoClaseId)]: [...ids]
      })
    }
  }
}

export function instalarApiWeb(): void {
  if (window.api) return
  sembrarDemo()
  window.api = api as unknown as Api
}
