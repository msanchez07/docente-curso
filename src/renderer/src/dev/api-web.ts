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
  moduloConFaltas,
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
import { modeloPorDefecto, REQUISITOS_POR_DEFECTO } from '@shared/modelo'
import { CONFIGURACION_GENERAL_POR_DEFECTO } from '@shared/tipos'
import { generarCabeceraDocumento, generarPieDocumento } from '@shared/cabecera-documento'
import conselleriaLogo from '@renderer/assets/plantillas/conselleria.png'
import unionEuropeaLogo from '@renderer/assets/plantillas/union-europea.png'
import centroLogo from '@renderer/assets/plantillas/logo-centro.png'
import { normalizarPresentacion } from '@shared/presentacion'
import JSZip from 'jszip'
import type {
  AlumnoClase,
  CriterioUnidad,
  AlumnoEntrada,
  AlumnoFaltasCurso,
  AsignacionConvocatoria,
  AsignacionConvocatoriaEntrada,
  BloqueConvocatoria,
  BloqueConvocatoriaEntrada,
  Convocatoria,
  ConvocatoriaDetalle,
  ConvocatoriaEntrada,
  PresentacionConfig,
  ClaveCursoFaltas,
  ConfigModuloFaltas,
  CursoFaltasResumen,
  DatosCursoFaltas,
  InformeFaltas,
  InformeFaltasDatos,
  InformeFaltasResumen,
  Api,
  Ciclo,
  CriterioDisponible,
  ConfiguracionGeneral,
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
const CLAVE_FALTAS = 'gestion-entregas:faltas-clase'
const CLAVE_DEMO = 'gestion-entregas:demo-cargado'
const CLAVE_PRESENTACION = 'gestion-entregas:presentacion'
const CLAVE_CONVOCATORIAS = 'gestion-entregas:convocatorias'
const CLAVE_CONFIGURACION = 'gestion-entregas:configuracion-general'

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

const CE_DEMO: Record<string, string[]> = {
  RA1: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
  RA2: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
  RA3: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
  RA4: ['a', 'b', 'c', 'd', 'e', 'f', 'g']
}

function criteriosDemo(raCodigos: string[]): CriterioUnidad[] {
  return raCodigos.flatMap((raCodigo) =>
    (CE_DEMO[raCodigo] ?? []).map((ceCodigo) => ({ raCodigo, ceCodigo }))
  )
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
      avaluacion_id: unidad.avaluacion_id ?? null,
      peso: unidad.peso ?? 0,
      categorias: unidad.categorias ?? [],
      requisitos: unidad.requisitos ?? [],
      criterios: unidad.criterios ?? criteriosDemo(unidad.ra_codigos ?? []),
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
    modoCalificacion: 'unidades',
    pesosRa:
      modelo.pesosRa && typeof modelo.pesosRa === 'object'
        ? (modelo.pesosRa as Record<string, number>)
        : {},
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
  localStorage.removeItem(CLAVE_FALTAS)
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
      avaluacion_id: 'AV1',
      peso: 100,
      categorias: [
        { id: 'examenes', nombre: 'Exámenes', peso: 50 },
        { id: 'actividades', nombre: 'Actividades', peso: 50 }
      ],
      requisitos: REQUISITOS_POR_DEFECTO,
      contenidos: 'Entorno PHP, sintaxis, estructuras de control, arrays y formularios.',
      observaciones: null,
      ra_codigos: ['RA1', 'RA2'],
      criterios: criteriosDemo(['RA1', 'RA2']),
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
      avaluacion_id: 'AV2',
      peso: 100,
      categorias: [
        { id: 'proyectos', nombre: 'Proyectos', peso: 60 },
        { id: 'actividades', nombre: 'Actividades', peso: 40 }
      ],
      requisitos: REQUISITOS_POR_DEFECTO,
      contenidos: 'Sesiones, acceso a datos, MVC, APIs REST y seguridad básica.',
      observaciones: 'Incluye la práctica 1.',
      ra_codigos: ['RA2', 'RA3', 'RA4'],
      criterios: criteriosDemo(['RA2', 'RA3', 'RA4']),
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
      enunciado:
        'Crea un formulario PHP que valide los datos recibidos y conserve la información en sesión.',
      problema:
        'La clínica necesita registrar solicitudes de cita sin perder los datos entre pasos del formulario.',
      restricciones:
        'Entrega un único proyecto PHP. No uses frameworks externos. Incluye validación de campos obligatorios y un mensaje de error por campo.',
      tipo: 'practica',
      fecha_limite: '2026-11-06',
      rubrica:
        'Criterios: formulario funcional (40 %), validación de datos (30 %), persistencia en sesión (20 %) y presentación (10 %).',
      rubrica_archivo: null,
      avaluacion_id: 'AV1',
      categoria_id: 'actividades',
      unidad_id: 1,
      ce_ids: [1, 2, 3],
      bloqueada: false,
      creada_en: '2026-10-27 09:00:00'
    },
    {
      id: 2,
      grupo_clase_id: 1,
      titulo: 'Examen AV1',
      descripcion: 'Prueba teórico-práctica de la primera evaluación.',
      enunciado: 'Resuelve el supuesto práctico aplicando los contenidos de la primera evaluación.',
      problema:
        'El equipo debe justificar una solución técnica y demostrar que domina los conceptos del módulo.',
      restricciones:
        'Prueba individual. No se permite material adicional salvo el indicado por el docente. Duración máxima: una sesión.',
      tipo: 'examen',
      fecha_limite: '2026-11-19',
      rubrica:
        'Criterios: preguntas teóricas (50 %), supuesto práctico (40 %) y claridad de la solución (10 %).',
      rubrica_archivo: null,
      avaluacion_id: 'AV1',
      categoria_id: 'examenes',
      unidad_id: 1,
      ce_ids: [4, 5],
      bloqueada: false,
      creada_en: '2026-10-27 09:00:00'
    },
    {
      id: 3,
      grupo_clase_id: 1,
      titulo: 'Proyecto: mini framework MVC',
      descripcion: 'Entrega del proyecto de la segunda evaluación.',
      enunciado:
        'Desarrolla un mini framework MVC funcional y documenta las decisiones de arquitectura.',
      problema:
        'La aplicación debe separar presentación, lógica y acceso a datos para poder mantenerla y ampliarla.',
      restricciones:
        'Arquitectura MVC obligatoria. Incluye documentación y una defensa individual. No se aceptan entregas fuera de plazo sin justificación.',
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
      unidad_id: 2,
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

  const modulosFaltas = [
    {
      moduloCodigo: '0612',
      grupoId: 2,
      nombre: 'Desarrollo Web en entorno cliente',
      nombreInforme: 'DWEC',
      horas: 80
    },
    {
      moduloCodigo: '0613',
      grupoId: 1,
      nombre: 'Desarrollo Web en entorno servidor',
      nombreInforme: 'DWES',
      horas: 100
    },
    {
      moduloCodigo: '0614',
      grupoId: null,
      nombre: 'Despliegue de aplicaciones Web',
      nombreInforme: 'DESPL',
      horas: 50
    },
    {
      moduloCodigo: '0615',
      grupoId: 3,
      nombre: 'Diseño de interfaces web',
      nombreInforme: 'DIW',
      horas: 80
    },
    {
      moduloCodigo: '0616',
      grupoId: null,
      nombre: 'Proyecto de desarrollo de aplicaciones Web',
      nombreInforme: 'PROY',
      horas: 25
    },
    {
      moduloCodigo: '0618',
      grupoId: null,
      nombre: 'Empresa e iniciativa emprendedora',
      nombreInforme: 'EIE',
      horas: 35
    }
  ]
  const faltasOctubre = alumnos.map((alumno, indice) => ({
    alumnoId: alumno.id,
    faltas: { '0612': indice + 1, '0613': indice * 2 + 2, '0615': indice + 1 }
  }))
  const faltasNoviembre = alumnos.map((alumno, indice) => ({
    alumnoId: alumno.id,
    faltas: { '0612': indice + 2, '0613': indice * 3 + 4, '0615': indice + 2 }
  }))
  localStorage.setItem(
    CLAVE_FALTAS,
    JSON.stringify({
      '1|daw|2|presencial': {
        modulos: {
          '0612': { nombreInforme: 'DWEC', horas: 80 },
          '0613': { nombreInforme: 'DWES', horas: 100 },
          '0614': { nombreInforme: 'DESPL', horas: 50 },
          '0615': { nombreInforme: 'DIW', horas: 80 },
          '0616': { nombreInforme: 'PROY', horas: 25 },
          '0618': { nombreInforme: 'EIE', horas: 35 }
        },
        limite: 15,
        incluirJustificadas: false,
        siguienteId: 3,
        informes: [
          {
            id: 2,
            archivo: 'faltas-noviembre.pdf',
            subidoEn: '2026-11-15 10:00:00',
            totalAlumnos: alumnos.length,
            totalModulos: modulosFaltas.length,
            cursoAcademicoId: 1,
            cicloId: 'daw',
            curso: '2',
            modalidad: 'presencial',
            datos: {
              modulos: modulosFaltas,
              alumnos: faltasNoviembre,
              limite: 15,
              incluirJustificadas: false
            }
          },
          {
            id: 1,
            archivo: 'faltas-octubre.pdf',
            subidoEn: '2026-10-15 10:00:00',
            totalAlumnos: alumnos.length,
            totalModulos: modulosFaltas.length,
            cursoAcademicoId: 1,
            cicloId: 'daw',
            curso: '2',
            modalidad: 'presencial',
            datos: {
              modulos: modulosFaltas,
              alumnos: faltasOctubre,
              limite: 15,
              incluirJustificadas: false
            }
          }
        ]
      }
    })
  )
  sembrarDemoExtra()
}

/** Añade dos módulos más al escenario de ejemplo para probar el panel general. */
function sembrarDemoExtra(): void {
  const grupos = leer()
  if (grupos.some((grupo) => grupo.id === 2)) return

  const gruposExtra: GrupoGuardado[] = [
    {
      id: 2,
      curso_academico_id: 1,
      ciclo_id: 'daw',
      ciclo_nombre: 'Desarrollo de Aplicaciones Web',
      curso: '2',
      modalidad: 'presencial',
      modulo_codigo: '0612',
      modulo_nombre: 'Desarrollo web en entorno cliente',
      modulo_siglas: 'DWEC',
      nombre: '2º DAW · DWEC · Presencial',
      dias_semana: { 2: 2, 4: 2 },
      tutorias_semana: {},
      bloques_semana: {
        2: [
          { inicio: '10:00', tipo: 'sesion' },
          { inicio: '10:55', tipo: 'sesion' }
        ],
        4: [
          { inicio: '10:00', tipo: 'sesion' },
          { inicio: '10:55', tipo: 'sesion' }
        ]
      },
      creado_en: '2026-10-27 09:00:00'
    },
    {
      id: 3,
      curso_academico_id: 1,
      ciclo_id: 'daw',
      ciclo_nombre: 'Desarrollo de Aplicaciones Web',
      curso: '2',
      modulo_codigo: '0615',
      modulo_nombre: 'Diseño de interfaces web',
      modulo_siglas: 'DIW',
      modalidad: 'semipresencial',
      nombre: '2º DAW · DIW · Semipresencial',
      dias_semana: { 2: 1, 4: 1 },
      tutorias_semana: {},
      bloques_semana: {
        2: [{ inicio: '12:10', tipo: 'sesion' }],
        4: [{ inicio: '12:10', tipo: 'sesion' }]
      },
      creado_en: '2026-10-27 09:00:00'
    }
  ]
  escribir([...grupos, ...gruposExtra])

  const criterios = leerCriterios()
  criterios['2'] = modeloPorDefecto('presencial')
  criterios['3'] = modeloPorDefecto('semipresencial')
  escribirCriterios(criterios)

  const alumnos = leerAlumnos()
  const nuevos = [
    { nombre: 'Elena', apellidos: 'Torres', dni: '66666666P', email: 'elena@ejemplo.com' },
    { nombre: 'Diego', apellidos: 'Ramos', dni: '77777777R', email: 'diego@ejemplo.com' }
  ]
  const idsNuevos: number[] = []
  for (const base of nuevos) {
    let alumno = alumnos.find((item) => item.email === base.email)
    if (!alumno) {
      alumno = { ...base, id: Math.max(0, ...alumnos.map((item) => item.id)) + 1, activo: true }
      alumnos.push(alumno)
    }
    idsNuevos.push(alumno.id)
  }
  escribirAlumnos(alumnos)

  const matriculas = leerMatriculas()
  matriculas['2'] = [1, 2, 3, idsNuevos[0]]
  matriculas['3'] = [3, 4, 5, idsNuevos[1]]
  escribirMatriculas(matriculas)

  const unidades = leerUnidades()
  unidades.push(
    {
      id: 3,
      grupo_clase_id: 2,
      codigo: 'UD1',
      nombre: 'JavaScript y consumo de APIs',
      fecha_inicio: '2026-10-28',
      fecha_fin: '2026-11-20',
      avaluacion_id: 'AV1',
      peso: 100,
      categorias: [
        { id: 'examenes', nombre: 'Exámenes', peso: 40 },
        { id: 'actividades', nombre: 'Actividades', peso: 60 }
      ],
      requisitos: REQUISITOS_POR_DEFECTO,
      contenidos: 'DOM, eventos, asincronía, fetch y consumo de APIs.',
      observaciones: null,
      ra_codigos: ['RA1', 'RA2'],
      criterios: criteriosDemo(['RA1', 'RA2']),
      sesiones: [],
      creado_en: '2026-10-27 09:00:00',
      actualizado_en: '2026-10-27 09:00:00'
    },
    {
      id: 4,
      grupo_clase_id: 2,
      codigo: 'UD2',
      nombre: 'Aplicaciones web interactivas',
      fecha_inicio: '2026-11-23',
      fecha_fin: '2026-12-20',
      avaluacion_id: 'AV2',
      peso: 100,
      categorias: [
        { id: 'proyectos', nombre: 'Proyectos', peso: 70 },
        { id: 'actividades', nombre: 'Actividades', peso: 30 }
      ],
      requisitos: REQUISITOS_POR_DEFECTO,
      contenidos: 'Componentes, estado, validación y experiencia de usuario.',
      observaciones: null,
      ra_codigos: ['RA3', 'RA4'],
      criterios: criteriosDemo(['RA3', 'RA4']),
      sesiones: [],
      creado_en: '2026-10-27 09:00:00',
      actualizado_en: '2026-10-27 09:00:00'
    },
    {
      id: 5,
      grupo_clase_id: 3,
      codigo: 'UD1',
      nombre: 'Diseño visual y accesibilidad',
      fecha_inicio: '2026-10-28',
      fecha_fin: '2026-12-04',
      avaluacion_id: 'AV1',
      peso: 100,
      categorias: [
        { id: 'examenes', nombre: 'Exámenes', peso: 40 },
        { id: 'actividades', nombre: 'Actividades', peso: 60 }
      ],
      requisitos: REQUISITOS_POR_DEFECTO,
      contenidos: 'Color, tipografía, layout, componentes y accesibilidad.',
      observaciones: null,
      ra_codigos: ['RA1', 'RA2'],
      criterios: criteriosDemo(['RA1', 'RA2']),
      sesiones: [],
      creado_en: '2026-10-27 09:00:00',
      actualizado_en: '2026-10-27 09:00:00'
    }
  )
  escribirUnidades(unidades)

  const dias = diasProgramacionDemo()
  const contenidosDwec = [
    'DOM y selección de elementos',
    'Eventos y formularios',
    'Fetch y consumo de APIs',
    'Asincronía y promesas',
    'Validación en cliente',
    'Estado y persistencia en el navegador'
  ]
  const contenidosDiw = [
    'Color, contraste y jerarquía visual',
    'Tipografía y legibilidad',
    'Layout responsive',
    'Componentes y estados',
    'Accesibilidad y navegación'
  ]
  const programacion = leerProgramacion()
  programacion['2'] = dias.slice(0, 22).map((dia, indice) => ({
    id: 1000 + indice,
    grupo_clase_id: 2,
    unidad_id: indice < 10 ? 3 : 4,
    hora: null,
    orden: 0,
    ...dia,
    contenido: contenidosDwec[indice % contenidosDwec.length],
    creado_en: '2026-10-27 09:00:00',
    actualizado_en: '2026-10-27 09:00:00'
  }))
  programacion['3'] = dias.slice(0, 14).map((dia, indice) => ({
    id: 2000 + indice,
    grupo_clase_id: 3,
    unidad_id: 5,
    hora: null,
    orden: 0,
    ...dia,
    contenido: contenidosDiw[indice % contenidosDiw.length],
    creado_en: '2026-10-27 09:00:00',
    actualizado_en: '2026-10-27 09:00:00'
  }))
  escribirProgramacion(programacion)

  const entregas = leerEntregas()
  entregas['2'] = [
    {
      id: 4,
      grupo_clase_id: 2,
      titulo: 'Práctica 1: consumo de API',
      descripcion: 'Consumo de una API pública y renderizado de resultados.',
      enunciado: 'Crea una pequeña aplicación que consulte una API y muestre los datos.',
      problema: 'La interfaz debe responder a búsquedas y mostrar estados de carga y error.',
      restricciones: 'JavaScript sin frameworks. Incluye validación y manejo de errores.',
      tipo: 'practica',
      fecha_limite: '2026-11-10',
      rubrica: 'Consumo de API 40 %, interfaz 30 %, estados 20 %, código 10 %.',
      rubrica_archivo: null,
      avaluacion_id: 'AV1',
      categoria_id: 'actividades',
      unidad_id: 3,
      ce_ids: [1, 2],
      bloqueada: false,
      creada_en: '2026-10-27 09:00:00'
    },
    {
      id: 5,
      grupo_clase_id: 2,
      titulo: 'Examen AV1',
      descripcion: 'Prueba práctica de JavaScript y DOM.',
      enunciado: 'Resuelve los ejercicios propuestos sobre DOM, eventos y asincronía.',
      problema: 'Debes demostrar que dominas la manipulación del DOM y el consumo de datos.',
      restricciones: 'Prueba individual. Duración máxima: una sesión.',
      tipo: 'examen',
      fecha_limite: '2026-11-25',
      rubrica: 'Ejercicios 60 %, calidad 20 %, manejo de errores 20 %.',
      rubrica_archivo: null,
      avaluacion_id: 'AV1',
      categoria_id: 'examenes',
      unidad_id: 3,
      ce_ids: [3, 4],
      bloqueada: false,
      creada_en: '2026-10-27 09:00:00'
    },
    {
      id: 6,
      grupo_clase_id: 2,
      titulo: 'Proyecto: interfaz interactiva',
      descripcion: 'Proyecto de la segunda evaluación.',
      enunciado: 'Desarrolla una interfaz interactiva y accesible para un caso real.',
      problema: 'La aplicación debe ser usable, accesible y mantener un estado coherente.',
      restricciones: 'Incluye documentación y una defensa individual.',
      tipo: 'proyecto',
      fecha_limite: '2026-12-16',
      rubrica: 'Funcionalidad 40 %, accesibilidad 30 %, diseño 20 %, defensa 10 %.',
      rubrica_archivo: null,
      avaluacion_id: 'AV2',
      categoria_id: 'proyectos',
      unidad_id: 4,
      ce_ids: [5, 6],
      bloqueada: false,
      creada_en: '2026-10-27 09:00:00'
    }
  ]
  entregas['3'] = [
    {
      id: 7,
      grupo_clase_id: 3,
      titulo: 'Auditoría de accesibilidad',
      descripcion: 'Revisión de una interfaz aplicando criterios de accesibilidad.',
      enunciado: 'Analiza una interfaz y propone mejoras de accesibilidad.',
      problema: 'Hay que identificar barreras reales y priorizar las correcciones.',
      restricciones: 'Incluye capturas, justificación y propuesta de mejora.',
      tipo: 'practica',
      fecha_limite: '2026-11-13',
      rubrica: 'Análisis 40 %, propuestas 40 %, presentación 20 %.',
      rubrica_archivo: null,
      avaluacion_id: 'AV1',
      categoria_id: 'actividades',
      unidad_id: 5,
      ce_ids: [1, 2],
      bloqueada: false,
      creada_en: '2026-10-27 09:00:00'
    },
    {
      id: 8,
      grupo_clase_id: 3,
      titulo: 'Examen AV1',
      descripcion: 'Prueba de diseño visual y accesibilidad.',
      enunciado: 'Resuelve el supuesto de diseño y justifica las decisiones.',
      problema: 'La solución debe cumplir contraste, jerarquía y navegación accesible.',
      restricciones: 'Prueba individual. Duración máxima: una sesión.',
      tipo: 'examen',
      fecha_limite: '2026-11-27',
      rubrica: 'Contraste 30 %, layout 30 %, accesibilidad 30 %, justificación 10 %.',
      rubrica_archivo: null,
      avaluacion_id: 'AV1',
      categoria_id: 'examenes',
      unidad_id: 5,
      ce_ids: [3, 4],
      bloqueada: false,
      creada_en: '2026-10-27 09:00:00'
    }
  ]
  escribirEntregas(entregas)

  const notas = leerNotas()
  notas['2'] = {
    '1': {
      '4': { nota: 7.5, observaciones: 'API bien integrada.' },
      '5': { nota: 8, observaciones: 'Examen correcto.' },
      '6': { nota: 7, observaciones: 'Proyecto funcional.' }
    },
    '2': {
      '4': { nota: 5, observaciones: 'Faltan estados de error.' },
      '5': { nota: 4.5, observaciones: 'No alcanza el mínimo.' }
    },
    '3': {
      '4': { nota: 8, observaciones: 'Buen trabajo.' },
      '5': { nota: 9, observaciones: 'Examen excelente.' },
      '6': { nota: 8.5, observaciones: 'Proyecto muy completo.' }
    },
    [String(idsNuevos[0])]: {
      '4': { nota: 6, observaciones: 'Entrega básica.' }
    }
  }
  notas['3'] = {
    '3': {
      '7': { nota: 8, observaciones: 'Auditoría clara.' },
      '8': { nota: 9, observaciones: 'Examen muy bueno.' }
    },
    '4': {
      '7': { nota: 4.5, observaciones: 'Faltan mejoras.' },
      '8': { nota: 3, observaciones: 'No alcanza los mínimos.' }
    },
    '5': {
      '7': { nota: 7, observaciones: 'Correcto.' },
      '8': { nota: 6, observaciones: 'Suficiente.' }
    },
    [String(idsNuevos[1])]: {
      '7': { nota: 5, observaciones: 'Entrega justa.' }
    }
  }
  escribirNotas(notas)

  const eventos = leerEventosEvaluacion()
  eventos.push(
    {
      id: 4,
      grupo_clase_id: 2,
      tipo: 'examen',
      titulo: 'Examen AV1 · DWEC',
      fecha: '2026-11-25',
      hora: '10:00',
      avaluacion_id: 'AV1',
      observaciones: 'Aula 2.',
      creado_en: '2026-10-27 09:00:00',
      actualizado_en: '2026-10-27 09:00:00'
    },
    {
      id: 5,
      grupo_clase_id: 2,
      tipo: 'evaluacion',
      titulo: 'Sesión de evaluación 1ª · DWEC',
      fecha: '2026-12-10',
      hora: '18:00',
      avaluacion_id: 'AV1',
      observaciones: null,
      creado_en: '2026-10-27 09:00:00',
      actualizado_en: '2026-10-27 09:00:00'
    },
    {
      id: 6,
      grupo_clase_id: 3,
      tipo: 'examen',
      titulo: 'Examen AV1 · DIW',
      fecha: '2026-11-27',
      hora: '12:10',
      avaluacion_id: 'AV1',
      observaciones: 'Aula 4.',
      creado_en: '2026-10-27 09:00:00',
      actualizado_en: '2026-10-27 09:00:00'
    },
    {
      id: 7,
      grupo_clase_id: 3,
      tipo: 'evaluacion',
      titulo: 'Sesión de evaluación 1ª · DIW',
      fecha: '2026-12-10',
      hora: '18:00',
      avaluacion_id: 'AV1',
      observaciones: null,
      creado_en: '2026-10-27 09:00:00',
      actualizado_en: '2026-10-27 09:00:00'
    }
  )
  escribirEventosEvaluacion(eventos)
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

  const idsCategorias = new Set(modelo.categorias.map((categoria) => categoria.id))
  for (const avaluacion of modelo.avaluaciones) {
    const pesos = avaluacion.pesosCategorias
    if (!pesos || Object.keys(pesos).length === 0) continue
    const desconocidas = Object.keys(pesos).filter((id) => !idsCategorias.has(id))
    if (desconocidas.length > 0) {
      throw new Error(
        `La avaluación «${avaluacion.nombre}» tiene categorías desconocidas: ${desconocidas.join(', ')}.`
      )
    }
    if (Object.values(pesos).some((peso) => Number(peso) < 0)) {
      throw new Error(`La avaluación «${avaluacion.nombre}» tiene pesos negativos.`)
    }
    const suma = Object.values(pesos).reduce((total, peso) => total + (Number(peso) || 0), 0)
    if (Math.abs(redondear2(suma) - 100) > 1e-9) {
      throw new Error(
        `Los pesos de la avaluación «${avaluacion.nombre}» suman ${redondear2(suma)} %; deben sumar exactamente 100 %.`
      )
    }
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
    fecha: new Date(),
    cabeceraHtml: generarCabeceraDocumento(leerConfiguracionGeneral(), {
      conselleria: conselleriaLogo,
      unionEuropea: unionEuropeaLogo,
      centro: centroLogo
    }),
    pieHtml: generarPieDocumento({
      conselleria: conselleriaLogo,
      unionEuropea: unionEuropeaLogo,
      centro: centroLogo
    })
  })
}

interface FaltasGuardadas {
  [clave: string]: {
    modulos: Record<string, { nombreInforme: string; horas: number }>
    limite: number
    incluirJustificadas: boolean
    informes: InformeFaltas[]
    siguienteId: number
  }
}

function claveFaltas(clave: ClaveCursoFaltas): string {
  return `${clave.cursoAcademicoId}|${clave.cicloId}|${clave.curso}|${clave.modalidad}`
}

function leerFaltas(): FaltasGuardadas {
  try {
    const crudo = localStorage.getItem(CLAVE_FALTAS)
    return crudo ? (JSON.parse(crudo) as FaltasGuardadas) : {}
  } catch {
    return {}
  }
}

function escribirFaltas(datos: FaltasGuardadas): void {
  localStorage.setItem(CLAVE_FALTAS, JSON.stringify(datos))
}

function gruposDeCohorte(clave: ClaveCursoFaltas) {
  return leer().filter(
    (grupo) =>
      grupo.curso_academico_id === clave.cursoAcademicoId &&
      grupo.ciclo_id === clave.cicloId &&
      grupo.curso === clave.curso &&
      grupo.modalidad === clave.modalidad
  )
}

function alumnosDeCohorte(clave: ClaveCursoFaltas): AlumnoFaltasCurso[] {
  const ids = new Set<number>()
  for (const grupo of gruposDeCohorte(clave)) {
    for (const id of leerMatriculas()[String(grupo.id)] ?? []) ids.add(id)
  }
  return leerAlumnos()
    .filter((alumno) => ids.has(alumno.id))
    .sort((a, b) => `${a.apellidos} ${a.nombre}`.localeCompare(`${b.apellidos} ${b.nombre}`))
    .map((alumno) => ({ id: alumno.id, nombre: alumno.nombre, apellidos: alumno.apellidos }))
}

async function obtenerCursoFaltasWeb(clave: ClaveCursoFaltas): Promise<DatosCursoFaltas> {
  const grupos = gruposDeCohorte(clave)
  if (grupos.length === 0) throw new Error('No hay módulos para este curso.')
  const guardado = leerFaltas()[claveFaltas(clave)]
  const ciclo = await cicloDaw()
  const modulos: ConfigModuloFaltas[] = ciclo.modulos
    .filter(
      (modulo) =>
        (modulo.curso === clave.curso || modulo.curso === null) &&
        moduloConFaltas(modulo.nombre, modulo.siglas)
    )
    .map((modulo) => {
      const grupo = grupos.find((item) => item.modulo_codigo === modulo.codigo)
      const config = guardado?.modulos[modulo.codigo]
      return {
        grupoId: grupo?.id ?? null,
        moduloCodigo: modulo.codigo,
        nombre: modulo.nombre,
        nombreInforme: config?.nombreInforme ?? modulo.siglas ?? modulo.codigo,
        horas: config?.horas ?? modulo.horas_minimas_boe ?? 0
      }
    })
  return {
    ...clave,
    cursoAcademicoNombre: cursoPorId(grupos[0].curso_academico_id)?.nombre ?? '—',
    cicloNombre: grupos[0].ciclo_nombre,
    modulos,
    alumnos: alumnosDeCohorte(clave),
    limite: guardado?.limite ?? 15,
    incluirJustificadas: guardado?.incluirJustificadas ?? false
  }
}

interface EstadoConvocatorias {
  convocatorias: Convocatoria[]
  bloques: BloqueConvocatoria[]
  asignaciones: AsignacionConvocatoria[]
}

function leerEstadoConvocatorias(): EstadoConvocatorias {
  try {
    const crudo = localStorage.getItem(CLAVE_CONVOCATORIAS)
    return crudo
      ? (JSON.parse(crudo) as EstadoConvocatorias)
      : { convocatorias: [], bloques: [], asignaciones: [] }
  } catch {
    return { convocatorias: [], bloques: [], asignaciones: [] }
  }
}

function escribirEstadoConvocatorias(estado: EstadoConvocatorias): void {
  localStorage.setItem(CLAVE_CONVOCATORIAS, JSON.stringify(estado))
}

function detalleConvocatoria(estado: EstadoConvocatorias, id: number): ConvocatoriaDetalle | null {
  const convocatoria = estado.convocatorias.find((item) => item.id === id)
  if (!convocatoria) return null
  return {
    convocatoria,
    bloques: estado.bloques
      .filter((bloque) => bloque.convocatoria_id === id)
      .sort((a, b) => a.orden - b.orden || a.id - b.id),
    asignaciones: estado.asignaciones
      .filter((asignacion) => asignacion.convocatoria_id === id)
      .map((asignacion) => ({ ...asignacion, incluida: asignacion.incluida !== false }))
  }
}

function leerPresentacion(): PresentacionConfig {
  try {
    const crudo = localStorage.getItem(CLAVE_PRESENTACION)
    return normalizarPresentacion(crudo ? (JSON.parse(crudo) as Partial<PresentacionConfig>) : null)
  } catch {
    return normalizarPresentacion(null)
  }
}

function escribirPresentacion(config: PresentacionConfig): PresentacionConfig {
  const normalizada = normalizarPresentacion(config)
  localStorage.setItem(CLAVE_PRESENTACION, JSON.stringify(normalizada))
  return normalizada
}

function leerConfiguracionGeneral(): ConfiguracionGeneral {
  try {
    const crudo = localStorage.getItem(CLAVE_CONFIGURACION)
    if (!crudo) return { ...CONFIGURACION_GENERAL_POR_DEFECTO }
    const datos = JSON.parse(crudo) as Partial<ConfiguracionGeneral>
    return {
      profesor: { ...CONFIGURACION_GENERAL_POR_DEFECTO.profesor, ...(datos.profesor ?? {}) },
      centro: { ...CONFIGURACION_GENERAL_POR_DEFECTO.centro, ...(datos.centro ?? {}) },
      logo: datos.logo ?? null
    }
  } catch {
    return { ...CONFIGURACION_GENERAL_POR_DEFECTO }
  }
}

function escribirConfiguracionGeneral(configuracion: ConfiguracionGeneral): void {
  localStorage.setItem(CLAVE_CONFIGURACION, JSON.stringify(configuracion))
}

const api = {
  app: {
    version: async () => '0.1.0-web'
  },
  configuracion: {
    obtener: async (): Promise<ConfiguracionGeneral> => leerConfiguracionGeneral(),
    guardar: async (configuracion: ConfiguracionGeneral): Promise<ConfiguracionGeneral> => {
      escribirConfiguracionGeneral(configuracion)
      return configuracion
    },
    cabeceraDocumento: async (): Promise<string> =>
      generarCabeceraDocumento(leerConfiguracionGeneral(), {
        conselleria: conselleriaLogo,
        unionEuropea: unionEuropeaLogo,
        centro: centroLogo
      }),
    pieDocumento: async (): Promise<string> =>
      generarPieDocumento({
        conselleria: conselleriaLogo,
        unionEuropea: unionEuropeaLogo,
        centro: centroLogo
      })
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
      const unidad = unidadesDeGrupo(Number(grupoClaseId)).find(
        (item) => item.id === entrada.unidad_id
      )
      if (!unidad) throw new Error('Selecciona la unidad didáctica de la entrega.')
      const categoriasUnidad = unidad.categorias.length > 0 ? unidad.categorias : modelo.categorias
      if (!categoriasUnidad.some((c) => c.id === entrada.categoria_id)) {
        throw new Error('La categoría no pertenece a la plantilla de la unidad.')
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
        enunciado: entrada.enunciado?.trim() || '',
        problema: entrada.problema?.trim() || '',
        restricciones: entrada.restricciones?.trim() || '',
        tipo: entrada.tipo || 'tarea',
        fecha_limite: entrada.fecha_limite?.trim() || null,
        rubrica: entrada.rubrica?.trim() || null,
        rubrica_archivo: entrada.rubrica_archivo ?? null,
        avaluacion_id: entrada.avaluacion_id,
        categoria_id: entrada.categoria_id,
        unidad_id: entrada.unidad_id ?? null,
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
      const unidad = unidadesDeGrupo(Number(grupoClaseId)).find(
        (item) => item.id === entrada.unidad_id
      )
      if (!unidad) throw new Error('Selecciona la unidad didáctica de la entrega.')
      const categoriasUnidad = unidad.categorias.length > 0 ? unidad.categorias : modelo.categorias
      if (!categoriasUnidad.some((c) => c.id === entrada.categoria_id)) {
        throw new Error('La categoría no pertenece a la plantilla de la unidad.')
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
              enunciado: entrada.enunciado?.trim() || '',
              problema: entrada.problema?.trim() || '',
              restricciones: entrada.restricciones?.trim() || '',
              tipo: entrada.tipo || 'tarea',
              fecha_limite: entrada.fecha_limite?.trim() || null,
              rubrica: entrada.rubrica?.trim() || null,
              rubrica_archivo: entrada.rubrica_archivo ?? null,
              avaluacion_id: entrada.avaluacion_id,
              categoria_id: entrada.categoria_id,
              unidad_id: entrada.unidad_id ?? null,
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
  convocatorias: {
    listar: async (grupoClaseId: number): Promise<Convocatoria[]> =>
      leerEstadoConvocatorias()
        .convocatorias.filter((item) => item.grupo_clase_id === grupoClaseId)
        .sort((a, b) => (a.fecha ?? '9999').localeCompare(b.fecha ?? '9999') || a.id - b.id),
    obtener: async (id: number): Promise<ConvocatoriaDetalle | null> =>
      detalleConvocatoria(leerEstadoConvocatorias(), id),
    crear: async (grupoClaseId: number, entrada: ConvocatoriaEntrada): Promise<Convocatoria> => {
      const estado = leerEstadoConvocatorias()
      const nueva: Convocatoria = {
        id: Math.max(0, ...estado.convocatorias.map((item) => item.id)) + 1,
        grupo_clase_id: grupoClaseId,
        tipo: entrada.tipo,
        nombre: entrada.nombre.trim(),
        fecha: entrada.fecha ?? null,
        creado_en: new Date().toISOString(),
        actualizado_en: new Date().toISOString()
      }
      estado.convocatorias.push(nueva)
      escribirEstadoConvocatorias(estado)
      return nueva
    },
    actualizar: async (id: number, entrada: ConvocatoriaEntrada): Promise<Convocatoria | null> => {
      const estado = leerEstadoConvocatorias()
      const actual = estado.convocatorias.find((item) => item.id === id)
      if (!actual) return null
      Object.assign(actual, {
        tipo: entrada.tipo,
        nombre: entrada.nombre.trim(),
        fecha: entrada.fecha ?? null,
        actualizado_en: new Date().toISOString()
      })
      escribirEstadoConvocatorias(estado)
      return actual
    },
    borrar: async (id: number): Promise<boolean> => {
      const estado = leerEstadoConvocatorias()
      const antes = estado.convocatorias.length
      estado.convocatorias = estado.convocatorias.filter((item) => item.id !== id)
      estado.bloques = estado.bloques.filter((item) => item.convocatoria_id !== id)
      estado.asignaciones = estado.asignaciones.filter((item) => item.convocatoria_id !== id)
      escribirEstadoConvocatorias(estado)
      return estado.convocatorias.length !== antes
    },
    crearBloque: async (
      convocatoriaId: number,
      entrada: BloqueConvocatoriaEntrada
    ): Promise<BloqueConvocatoria> => {
      const estado = leerEstadoConvocatorias()
      const bloque: BloqueConvocatoria = {
        id: Math.max(0, ...estado.bloques.map((item) => item.id)) + 1,
        convocatoria_id: convocatoriaId,
        nombre: entrada.nombre.trim(),
        descripcion: entrada.descripcion?.trim() || '',
        avaluacion_id: entrada.avaluacion_id ?? null,
        unidad_id: entrada.unidad_id ?? null,
        ra_codigo: entrada.ra_codigo ?? null,
        ce_codigo: entrada.ce_codigo ?? null,
        peso: Number(entrada.peso) || 0,
        orden: Number(entrada.orden) || 0
      }
      estado.bloques.push(bloque)
      escribirEstadoConvocatorias(estado)
      return bloque
    },
    actualizarBloque: async (
      id: number,
      entrada: BloqueConvocatoriaEntrada
    ): Promise<BloqueConvocatoria | null> => {
      const estado = leerEstadoConvocatorias()
      const bloque = estado.bloques.find((item) => item.id === id)
      if (!bloque) return null
      Object.assign(bloque, {
        nombre: entrada.nombre.trim(),
        descripcion: entrada.descripcion?.trim() || '',
        avaluacion_id: entrada.avaluacion_id ?? null,
        unidad_id: entrada.unidad_id ?? null,
        ra_codigo: entrada.ra_codigo ?? null,
        ce_codigo: entrada.ce_codigo ?? null,
        peso: Number(entrada.peso) || 0,
        orden: Number(entrada.orden) || 0
      })
      escribirEstadoConvocatorias(estado)
      return bloque
    },
    borrarBloque: async (id: number): Promise<boolean> => {
      const estado = leerEstadoConvocatorias()
      const antes = estado.bloques.length
      estado.bloques = estado.bloques.filter((item) => item.id !== id)
      estado.asignaciones = estado.asignaciones.filter((item) => item.bloque_id !== id)
      escribirEstadoConvocatorias(estado)
      return estado.bloques.length !== antes
    },
    guardarAsignaciones: async (
      convocatoriaId: number,
      asignaciones: AsignacionConvocatoriaEntrada[]
    ): Promise<ConvocatoriaDetalle> => {
      const estado = leerEstadoConvocatorias()
      const bloqueIds = new Set(
        estado.bloques
          .filter((item) => item.convocatoria_id === convocatoriaId)
          .map((item) => item.id)
      )
      estado.asignaciones = estado.asignaciones.filter(
        (item) => item.convocatoria_id !== convocatoriaId
      )
      let siguiente = Math.max(0, ...estado.asignaciones.map((item) => item.id)) + 1
      for (const asignacion of asignaciones) {
        if (!bloqueIds.has(asignacion.bloqueId)) continue
        estado.asignaciones.push({
          id: siguiente++,
          convocatoria_id: convocatoriaId,
          alumno_id: asignacion.alumnoId,
          bloque_id: asignacion.bloqueId,
          nota: asignacion.nota ?? null,
          observaciones: asignacion.observaciones?.trim() || null,
          incluida: asignacion.incluida !== false
        })
      }
      escribirEstadoConvocatorias(estado)
      return detalleConvocatoria(estado, convocatoriaId)!
    }
  },
  presentacion: {
    obtener: async (): Promise<PresentacionConfig> => leerPresentacion(),
    guardar: async (config: PresentacionConfig): Promise<PresentacionConfig> =>
      escribirPresentacion(config)
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
      const criterios = entrada.criterios ?? criteriosDemo(entrada.ra_codigos ?? [])
      const nueva: UnidadProgramacion = {
        id: Math.max(0, ...unidades.map((unidad) => unidad.id)) + 1,
        grupo_clase_id: grupoClaseId,
        codigo: entrada.codigo?.trim() || null,
        nombre,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        avaluacion_id: entrada.avaluacion_id ?? null,
        peso: Number(entrada.peso) || 0,
        categorias: entrada.categorias ?? [],
        requisitos: entrada.requisitos ?? [],
        contenidos: entrada.contenidos?.trim() ?? '',
        observaciones: entrada.observaciones?.trim() || null,
        ra_codigos: [...new Set(criterios.map((criterio) => criterio.raCodigo))],
        criterios,
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
      const criterios =
        entrada.criterios ??
        (entrada.ra_codigos ? criteriosDemo(entrada.ra_codigos) : anterior.criterios)
      const actualizada: UnidadProgramacion = {
        ...anterior,
        codigo: entrada.codigo?.trim() || null,
        nombre,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        avaluacion_id: entrada.avaluacion_id ?? null,
        peso: Number(entrada.peso) || 0,
        categorias: entrada.categorias ?? [],
        requisitos: entrada.requisitos ?? [],
        contenidos: entrada.contenidos?.trim() ?? '',
        observaciones: entrada.observaciones?.trim() || null,
        ra_codigos: [...new Set(criterios.map((criterio) => criterio.raCodigo))],
        criterios,
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
        const criterios = entrada.criterios ?? criteriosDemo(entrada.ra_codigos ?? [])
        const unidad: UnidadProgramacion = {
          id: siguienteUnidad++,
          grupo_clase_id: grupoClaseId,
          codigo: entrada.codigo ?? null,
          nombre: entrada.nombre,
          fecha_inicio: entrada.fecha_inicio ?? null,
          fecha_fin: entrada.fecha_fin ?? null,
          avaluacion_id: entrada.avaluacion_id ?? null,
          peso: Number(entrada.peso) || 0,
          categorias: entrada.categorias ?? [],
          requisitos: entrada.requisitos ?? [],
          contenidos: entrada.contenidos ?? '',
          observaciones: entrada.observaciones ?? null,
          ra_codigos: [...new Set(criterios.map((criterio) => criterio.raCodigo))],
          criterios,
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
  faltas: {
    cursos: async (): Promise<CursoFaltasResumen[]> => {
      const mapa = new Map<string, CursoFaltasResumen>()
      for (const grupo of leer()) {
        const clave: ClaveCursoFaltas = {
          cursoAcademicoId: grupo.curso_academico_id,
          cicloId: grupo.ciclo_id,
          curso: grupo.curso,
          modalidad: grupo.modalidad
        }
        const id = claveFaltas(clave)
        const existente = mapa.get(id)
        if (existente) {
          existente.modulos += 1
          existente.alumnos = alumnosDeCohorte(clave).length
          continue
        }
        mapa.set(id, {
          ...clave,
          cursoAcademicoNombre: cursoPorId(grupo.curso_academico_id)?.nombre ?? '—',
          cicloNombre: grupo.ciclo_nombre,
          nombre: `${grupo.curso}º ${grupo.ciclo_id.toUpperCase()} · ${
            grupo.modalidad === 'semipresencial' ? 'Semipresencial' : 'Presencial'
          }`,
          modulos: 1,
          alumnos: alumnosDeCohorte(clave).length
        })
      }
      return [...mapa.values()]
    },
    obtenerCurso: async (clave: ClaveCursoFaltas): Promise<DatosCursoFaltas> =>
      obtenerCursoFaltasWeb(clave),
    guardarModulo: async (
      clave: ClaveCursoFaltas,
      moduloCodigo: string,
      nombreInforme: string,
      horas: number
    ): Promise<void> => {
      const id = claveFaltas(clave)
      const datos = leerFaltas()
      const actual = datos[id] ?? {
        modulos: {},
        limite: 15,
        incluirJustificadas: false,
        informes: [],
        siguienteId: 1
      }
      actual.modulos[moduloCodigo] = { nombreInforme, horas }
      datos[id] = actual
      escribirFaltas(datos)
    },
    guardarAjustes: async (
      clave: ClaveCursoFaltas,
      limite: number,
      incluirJustificadas: boolean
    ): Promise<DatosCursoFaltas> => {
      const id = claveFaltas(clave)
      const datos = leerFaltas()
      const actual = datos[id] ?? {
        modulos: {},
        limite: 15,
        incluirJustificadas: false,
        informes: [],
        siguienteId: 1
      }
      actual.limite = limite
      actual.incluirJustificadas = incluirJustificadas
      datos[id] = actual
      escribirFaltas(datos)
      return obtenerCursoFaltasWeb(clave)
    },
    listarInformes: async (clave: ClaveCursoFaltas): Promise<InformeFaltasResumen[]> => {
      const guardado = leerFaltas()[claveFaltas(clave)]
      return (guardado?.informes ?? []).map((item) => ({
        id: item.id,
        archivo: item.archivo,
        subidoEn: item.subidoEn,
        totalAlumnos: item.datos.alumnos.length,
        totalModulos: item.datos.modulos.length
      }))
    },
    obtenerInforme: async (id: number): Promise<InformeFaltas | null> => {
      for (const guardado of Object.values(leerFaltas())) {
        const informe = guardado.informes.find((item) => item.id === id)
        if (informe) return informe
      }
      return null
    },
    ultimoAlumno: async (grupoClaseId: number, alumnoId: number) => {
      const grupo = leer().find((item) => item.id === grupoClaseId)
      if (!grupo) return null
      const clave: ClaveCursoFaltas = {
        cursoAcademicoId: grupo.curso_academico_id,
        cicloId: grupo.ciclo_id,
        curso: grupo.curso,
        modalidad: grupo.modalidad
      }
      const guardado = leerFaltas()[claveFaltas(clave)]
      for (const informe of guardado?.informes ?? []) {
        const modulo = informe.datos.modulos.find(
          (item) => item.moduloCodigo === grupo.modulo_codigo
        )
        const alumno = informe.datos.alumnos.find((item) => item.alumnoId === alumnoId)
        if (!modulo || !alumno) continue
        const faltas = Number(alumno.faltas[modulo.moduloCodigo] ?? 0)
        return {
          informeId: informe.id,
          archivo: informe.archivo,
          subidoEn: informe.subidoEn,
          moduloCodigo: modulo.moduloCodigo,
          moduloNombre: modulo.nombre,
          faltas,
          horas: modulo.horas,
          porcentaje: modulo.horas > 0 ? Math.round((faltas / modulo.horas) * 100) : 0,
          limite: informe.datos.limite
        }
      }
      return null
    },
    importarInforme: async (
      clave: ClaveCursoFaltas,
      archivo: string,
      datos: InformeFaltasDatos
    ): Promise<InformeFaltas> => {
      const id = claveFaltas(clave)
      const store = leerFaltas()
      const actual = store[id] ?? {
        modulos: {},
        limite: 15,
        incluirJustificadas: false,
        informes: [],
        siguienteId: 1
      }
      const curso = await obtenerCursoFaltasWeb(clave)
      const nuevo: InformeFaltas = {
        id: actual.siguienteId,
        archivo,
        subidoEn: new Date().toISOString().slice(0, 19).replace('T', ' '),
        totalAlumnos: datos.alumnos.length,
        totalModulos: datos.modulos.length,
        cursoAcademicoId: clave.cursoAcademicoId,
        cicloId: clave.cicloId,
        curso: clave.curso,
        modalidad: clave.modalidad,
        datos: {
          modulos: curso.modulos,
          alumnos: datos.alumnos,
          limite: curso.limite,
          incluirJustificadas: curso.incluirJustificadas
        }
      }
      actual.siguienteId += 1
      actual.informes.unshift(nuevo)
      store[id] = actual
      escribirFaltas(store)
      return nuevo
    }
  },
  backup: {
    estado: async () => ({
      carpeta: 'Solo disponible en la aplicación de escritorio',
      existe: false,
      configurada: false,
      grupos: 0,
      backups: 0,
      mensaje: 'Las copias de seguridad están disponibles en la aplicación de escritorio.'
    }),
    elegirCarpeta: async () => null,
    usarCarpetaRecomendada: async () => ({
      carpeta: 'Solo disponible en la aplicación de escritorio',
      existe: false,
      configurada: false,
      grupos: 0,
      backups: 0,
      mensaje: 'Las copias de seguridad están disponibles en la aplicación de escritorio.'
    }),
    abrirCarpeta: async () => false,
    listar: async () => [],
    crear: async () => ({
      ok: false,
      mensaje: 'Las copias de seguridad están disponibles en la aplicación de escritorio.'
    }),
    crearTodos: async () => [],
    importar: async () => ({
      ok: false,
      mensaje: 'Las copias de seguridad están disponibles en la aplicación de escritorio.'
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
