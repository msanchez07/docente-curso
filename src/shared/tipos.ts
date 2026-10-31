/**
 * Tipos compartidos entre el proceso principal, el preload y el renderer.
 *
 * El modelo es genérico y multi-ciclo: un ciclo (p. ej. DAW) contiene módulos,
 * cada módulo contiene RA (Resultados de Aprendizaje) y cada RA contiene CE
 * (Criterios de Evaluación). Los datos provienen del BOE.
 */

export interface CriterioEvaluacion {
  codigo: string
  descripcion: string
}

export interface ResultadoAprendizaje {
  codigo: string
  numero: number
  descripcion: string
  ce: CriterioEvaluacion[]
}

export interface Modulo {
  codigo: string
  nombre: string
  /** Siglas cortas del módulo (DWES, BD…). Si faltan, se generan del nombre. */
  siglas?: string
  /** Curso del ciclo en el que se imparte (1º o 2º), si se conoce. */
  curso?: Curso
  ects: number | null
  horas_minimas_boe: number | null
  ra: ResultadoAprendizaje[]
}

export interface Ciclo {
  id: string
  denominacion: string
  nivel: string
  familia_profesional: string
  duracion_horas: number
  ects: number
  rd: string
  rd_actualizacion?: string
  boe_url: string
  boe_url_actualizacion?: string
  modulos: Modulo[]
}

export interface ResumenCiclo {
  id: string
  denominacion: string
  nivel: string
  modulos: number
  ra: number
  ce: number
}

export interface ResumenModulo {
  codigo: string
  nombre: string
  siglas: string | null
  curso: Curso | null
  ects: number | null
  horas_minimas_boe: number | null
  ra: number
  ce: number
}

/* --- Gestión ---------------------------------------------------------- */

export interface Alumno {
  id: number
  nombre: string
  apellidos: string
  dni: string | null
  email: string | null
  activo: boolean
  /** Identificadores de los grupos en los que está matriculado. */
  grupos: number[]
}

export interface AlumnoEntrada {
  nombre: string
  apellidos: string
  dni?: string | null
  email?: string | null
  activo?: boolean
  /** Grupos en los que matricularlo. Si se omite, no se tocan las matrículas. */
  grupos?: number[]
}

export interface Entrega {
  id: number
  modulo_codigo: string
  titulo: string
  descripcion: string | null
  origen: string | null
  tipo: string
  fecha_limite: string | null
  peso: number
  /** Avaluación a la que pertenece (p. ej. «AV1»), según el modelo. */
  avaluacion: string | null
  /** Categoría del modelo (p. ej. «examenes», «actividades»). */
  categoria: string | null
  /** Número de criterios de evaluación a los que está mapeada. */
  criterios: number
}

export interface EntregaEntrada {
  modulo_codigo: string
  titulo: string
  descripcion?: string | null
  origen?: string | null
  tipo?: string
  fecha_limite?: string | null
  peso?: number
  avaluacion?: string | null
  categoria?: string | null
}

/** Archivo adjunto de la rúbrica (base64, sin prefijo data:). */
export interface ArchivoRubrica {
  nombre: string
  tipo: string
  datos: string
}

/** Entrega de un grupo de clase, ubicada en sus criterios y mapeada al BOE. */
export interface EntregaClase {
  id: number
  grupo_clase_id: number
  titulo: string
  descripcion: string | null
  /** Texto principal de la ficha: qué debe hacer el alumnado. */
  enunciado: string
  /** Contexto y descripción del problema. */
  problema: string
  /** Condiciones y límites de la entrega. */
  restricciones: string
  tipo: string
  fecha_limite: string | null
  /** Rúbrica libre: criterios, niveles y puntuaciones. */
  rubrica: string | null
  /** Rúbrica adjunta como fichero, si la hay. */
  rubrica_archivo: ArchivoRubrica | null
  /** Id de la avaluación en los criterios del grupo (AV1, AV2…). */
  avaluacion_id: string
  /** Id de la categoría en los criterios del grupo (examenes, proyectos…). */
  categoria_id: string
  /** Unidad didáctica a la que pertenece la entrega (modo unidades). */
  unidad_id: number | null
  /** Número de criterios de evaluación mapeados. */
  criterios: number
  /** Ids de los CE mapeados. */
  ce_ids: number[]
  /** Alumnos con nota o anotación en esta entrega. */
  notas: number
  /** Ficheros de evidencia asociados a la entrega. */
  evidencias: number
  /** Bloqueada: no se puede editar, borrar ni calificar. */
  bloqueada: boolean
  creada_en: string
}

export interface EntregaClaseEntrada {
  titulo: string
  descripcion?: string | null
  enunciado?: string
  problema?: string
  restricciones?: string
  tipo?: string
  fecha_limite?: string | null
  rubrica?: string | null
  rubrica_archivo?: ArchivoRubrica | null
  avaluacion_id: string
  categoria_id: string
  unidad_id?: number | null
  ce_ids: number[]
}

/** Ámbito de una exportación de entregas. */
export type AmbitoExportacionEntregas = 'entrega' | 'avaluacion' | 'curso'

export interface OpcionesExportacionEntregas {
  ambito: AmbitoExportacionEntregas
  /** Obligatorio si el ámbito es `entrega`. */
  entregaId?: number
  /** Obligatorio si el ámbito es `avaluacion`. */
  avaluacionId?: string
}

/** Resultado de preparar la previsualización de una exportación. */
export interface VistaPreviaEntregas {
  html: string
  titulo: string
  total: number
  conArchivos: boolean
  conTexto: boolean
}

/** Fecha de evaluación o examen de un grupo. */
export type TipoEventoEvaluacion = 'evaluacion' | 'examen'

export interface EventoEvaluacionClase {
  id: number
  grupo_clase_id: number
  tipo: TipoEventoEvaluacion
  titulo: string
  fecha: string
  hora: string | null
  avaluacion_id: string | null
  observaciones: string | null
  creado_en: string
  actualizado_en: string
}

export interface EventoEvaluacionEntrada {
  tipo: TipoEventoEvaluacion
  titulo: string
  fecha: string
  hora?: string | null
  avaluacion_id?: string | null
  observaciones?: string | null
}

export interface ResultadoImportacionEventos {
  creados: number
  errores: string[]
}

/** Periodo de formación en empresa (FCT, dual…) de un alumno. */
export interface PeriodoFormacionEmpresa {
  id: number
  grupo_clase_id: number
  alumno_id: number
  fecha_inicio: string
  fecha_fin: string
  empresa: string
  horas: number
  observaciones: string | null
  creado_en: string
  actualizado_en: string
}

export interface PeriodoFormacionEmpresaEntrada {
  fecha_inicio: string
  fecha_fin: string
  empresa: string
  horas?: number
  observaciones?: string | null
}

/**
 * Normativa de FP que se muestra en la sección de consulta.
 *
 * En Electron se sirve por el protocolo interno `normativa:` (`url`); en la
 * previsualización web se entrega el HTML (`html`) para usar `srcdoc`.
 */
export interface NormativaFpt {
  origen: 'incluida' | 'importada'
  actualizado_en: string | null
  url: string | null
  html: string | null
}

/* --- Calificaciones por grupo de clase -------------------------------- */

/** Tipo de documento que se adjunta como evidencia. */
export type CategoriaEvidencia = 'material' | 'solucion' | 'apuntes' | 'entrega' | 'otro'

/** Fichero de evidencia asociado a una entrega (global para el grupo). */
export interface EvidenciaClase {
  id: number
  entrega_id: number
  categoria: CategoriaEvidencia
  nombre: string
  tipo: string
  tamano: number
  datos: string
  creado_en: string
}

export interface EvidenciaClaseEntrada {
  categoria?: CategoriaEvidencia
  nombre: string
  tipo: string
  tamano: number
  datos: string
}

export interface NotaGuardadaClase {
  entrega_id: number
  alumno_id: number
  nota: number | null
  observaciones: string | null
}

export interface NotaEntradaClase {
  entregaId: number
  nota: number | null
  observaciones?: string | null
}

export interface EntregaCalificacion {
  entregaId: number
  titulo: string
  nota: number | null
  observaciones: string | null
  suspensa: boolean
  /** La entrega está bloqueada y no admite cambios de nota. */
  bloqueada: boolean
}

export interface CategoriaCalificacion {
  categoriaId: string
  nombre: string
  peso: number
  media: number | null
  suspensa: boolean
  entregas: EntregaCalificacion[]
}

export interface AvaluacionCalificacion {
  avaluacionId: string
  nombre: string
  nota: number | null
  suspensa: boolean
  motivos: string[]
  categorias: CategoriaCalificacion[]
}

export interface CriterioCalificacion {
  ceId: number
  codigo: string
  descripcion: string
  /** Media de las entregas mapeadas al CE; null si no hay ninguna nota. */
  nota: number | null
  superado: boolean
  /** `false` si el CE no tiene entregas o ninguna está corregida. */
  evaluado: boolean
  entregas: number
}

export interface RaCalificacion {
  codigo: string
  descripcion: string
  nota: number | null
  superado: boolean
  criterios: CriterioCalificacion[]
  entregas: {
    entregaId: number
    titulo: string
    nota: number | null
  }[]
}

export interface AvaluacionUnidadCalificacion {
  avaluacionId: string
  nombre: string
  peso: number
  nota: number | null
  suspensa: boolean
}

export interface UnidadCalificacion {
  unidadId: number
  avaluacionId: string | null
  codigo: string | null
  nombre: string
  peso: number
  nota: number | null
  suspensa: boolean
  entregas: EntregaCalificacion[]
}

export interface FilaCalificacionClase {
  alumno: AlumnoClase
  avaluaciones: AvaluacionCalificacion[]
  /** Cálculo por unidades. */
  unidades: UnidadCalificacion[]
  /** Nota de cada trimestre agrupando sus unidades. */
  trimestres: AvaluacionUnidadCalificacion[]
  /** Resultados de aprendizaje del módulo, con su nota y estado. */
  ras: RaCalificacion[]
  /** Códigos de los RA que el alumno todavía no tiene superados. */
  rasNoSuperados: string[]
  todosRasSuperados: boolean
  notaFinal: number | null
  aprobado: boolean
  vaAConvocatoria: boolean
  incompleta: boolean
}

export interface ResumenCalificacionesClase {
  grupo: GrupoClase
  modelo: ModeloEvaluacion
  alumnos: FilaCalificacionClase[]
}

/** Criterio de evaluación con su RA, para los selectores de mapeo. */
export interface CriterioDisponible {
  ceId: number
  ceCodigo: string
  raCodigo: string
  raDescripcion: string
  descripcion: string
}

export interface CriterioDeEntrega extends CriterioDisponible {
  peso: number
}

export interface Nota {
  id: number
  entrega_alumno_id: number
  ce_id: number
  nota: number
  comentario: string | null
}

export interface NotaEntrada {
  entrega_alumno_id: number
  ce_id: number
  nota: number
  comentario?: string | null
}

/** Registro de una nota desde la interfaz (entrega y alumno explícitos). */
export interface NotaRegistro {
  entregaId: number
  alumnoId: number
  ce_id: number
  nota: number
  comentario?: string | null
}

/** Nota ya registrada de un criterio, para editar en la interfaz. */
export interface NotaCe {
  ceId: number
  nota: number
  comentario: string | null
}

/* --- Grupos ----------------------------------------------------------- */

/**
 * Grupo: un módulo impartido en una modalidad concreta, con su propio alumnado
 * y su propio modelo de evaluación. Es la unidad de trabajo de la aplicación.
 */
export interface Grupo {
  id: number
  modulo_codigo: string
  nombre: string
  modalidad: Modalidad
}

export interface GrupoDetalle extends Grupo {
  modulo_nombre: string
  alumnos: number
}

export interface GrupoEntrada {
  modulo_codigo: string
  nombre: string
  modalidad: Modalidad
}

/* --- Grupos de clase (FP) --------------------------------------------- */

/** Curso del ciclo: primero o segundo. */
export type Curso = '1' | '2'

/** Día de la semana con la misma numeración que `Date.getDay()`: 0 = domingo. */
export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** Número de sesiones semanales por día; los días sin sesiones no aparecen. */
export type DiasSemana = Partial<Record<DiaSemana, number>>

/** Horario de tutorías de un día en un grupo semipresencial. */
export interface TutoriasDia {
  /** Horas de las tutorías presenciales colectivas (HH:MM). */
  presencial: string[]
  /** Horas de las tutorías individuales (HH:MM). */
  individual: string[]
}

/** Tutorías semanales; los días sin tutorías no aparecen. */
export type TutoriasSemana = Partial<Record<DiaSemana, TutoriasDia>>

/** Tipo de un bloque del calendario semanal. */
export type TipoBloqueHorario = 'sesion' | 'colectiva' | 'individual'

/** Bloque de 55 minutos del calendario semanal. */
export interface BloqueSemana {
  /** Hora de inicio del bloque (HH:MM). */
  inicio: string
  tipo: TipoBloqueHorario
}

/** Bloques seleccionados en el calendario semanal. */
export type BloquesSemana = Partial<Record<DiaSemana, BloqueSemana[]>>

/**
 * Grupo de clase: una clase de FP de DAW identificada por ciclo, curso,
 * modalidad y módulo. Es la unidad de trabajo de la aplicación a partir de
 * ahora.
 *
 * No sustituye todavía al grupo de módulo (`Grupo`): convive con él mientras
 * el resto de secciones se van incorporando.
 */
export interface CursoAcademico {
  id: number
  nombre: string
  /** Año de inicio (septiembre). */
  inicio: number
  /** Año de fin (julio del año siguiente). */
  fin: number
  /** Curso que se abre por defecto al iniciar la aplicación. */
  actual: boolean
  /** Grupos de clase que cuelgan de este curso. */
  grupos: number
  creado_en: string
}

export interface CursoAcademicoEntrada {
  nombre: string
  actual?: boolean
}

export interface GrupoClase {
  id: number
  /** Curso académico al que pertenece el grupo (26/26, 25/26…). */
  curso_academico_id: number
  curso_academico_nombre: string
  ciclo_id: string
  ciclo_nombre: string
  curso: Curso
  modalidad: Modalidad
  modulo_codigo: string
  modulo_nombre: string
  /** Siglas del módulo (DWES, BD…), ya resueltas. */
  modulo_siglas: string
  nombre: string
  /** Alumnado matriculado en este grupo. */
  alumnos: number
  /** Número de resultados de aprendizaje del módulo. */
  ra: number
  /** Número de criterios de evaluación del módulo. */
  ce: number
  /** `true` si el grupo ya tiene criterios de calificación guardados. */
  criterios: boolean
  /** Sesiones habituales por día de la semana (horario semanal del grupo). */
  dias_semana: DiasSemana
  /** Tutorías presenciales e individuales, solo para grupos semipresenciales. */
  tutorias_semana: TutoriasSemana
  /** Bloques horarios semanales (hora de inicio de cada bloque). */
  bloques_semana: BloquesSemana
  creado_en: string
}

export interface GrupoClaseEntrada {
  /** Si se omite, el grupo se crea en el curso académico actual. */
  curso_academico_id?: number
  ciclo_id: string
  curso: Curso
  modalidad: Modalidad
  modulo_codigo: string
  /**
   * Horario semanal del grupo: sesiones por día (0 = domingo … 6 = sábado).
   * Se indica una sola vez y la programación de aula lo usa como base.
   */
  dias_semana?: DiasSemana
  /** Tutorías semanales; solo se usan en la modalidad semipresencial. */
  tutorias_semana?: TutoriasSemana
  /** Bloques de 55 minutos del calendario semanal. */
  bloques_semana?: BloquesSemana
}

/** Plantilla de criterios creada desde un grupo. */
export interface PlantillaCriterios {
  id: number
  nombre: string
  modulo_codigo: string
  modalidad: Modalidad
  creado_en: string
  actualizado_en: string
}

/** Plantilla que le corresponde a un grupo; `nombre` es `null` si no hay. */
export interface PlantillaParaGrupo {
  nombre: string | null
  modelo: ModeloEvaluacion
}

/* --- Alumnado por grupo de clase -------------------------------------- */

export interface AlumnoClase {
  id: number
  nombre: string
  apellidos: string
  dni: string | null
  email: string | null
  activo: boolean
  /** Grupos de clase en los que está matriculado. */
  grupos_clase: number[]
}

export interface ResultadoAltaAlumnoClase {
  alumno: AlumnoClase
  /** `false` si ya existía y solo se ha matriculado en el grupo. */
  creado: boolean
}

/* --- Programación de aula --------------------------------------------- */
export interface ProgramacionAula {
  id: number
  grupo_clase_id: number
  unidad_id: number | null
  fecha: string
  /** Hora de la sesión, HH:MM, si está definida. */
  hora: string | null
  /** Orden dentro del mismo día. */
  orden: number
  contenido: string
  desviacion: string
  observaciones: string
  creado_en: string
  actualizado_en: string
}

export interface ProgramacionEntrada {
  /** `0` o ausente para una fila nueva. */
  id?: number
  fecha: string
  hora?: string | null
  orden?: number
  contenido: string
  desviacion: string
  observaciones: string
  unidad_id?: number | null
}

/** Unidad de programación: agrupa sesiones, RA y contenidos. */
export interface CriterioUnidad {
  raCodigo: string
  ceCodigo: string
}

export interface UnidadProgramacion {
  id: number
  grupo_clase_id: number
  codigo: string | null
  nombre: string
  fecha_inicio: string | null
  fecha_fin: string | null
  /** Evaluación/trimestre al que pertenece la unidad. */
  avaluacion_id: string | null
  /** Peso de la unidad dentro de su evaluación. */
  peso: number
  /** Plantilla de calificación propia de la unidad. */
  categorias: CategoriaEvaluacion[]
  /** Mínimos de la plantilla de la unidad. */
  requisitos: RequisitoEvaluacion[]
  contenidos: string
  observaciones: string | null
  /** RA afectados; se deriva de los criterios seleccionados. */
  ra_codigos: string[]
  /** Criterios de evaluación concretos que trabaja la unidad. */
  criterios: CriterioUnidad[]
  sesiones: ProgramacionAula[]
  creado_en: string
  actualizado_en: string
}

export interface UnidadProgramacionEntrada {
  codigo?: string | null
  nombre: string
  fecha_inicio?: string | null
  fecha_fin?: string | null
  avaluacion_id?: string | null
  peso?: number
  categorias?: CategoriaEvaluacion[]
  requisitos?: RequisitoEvaluacion[]
  contenidos?: string
  observaciones?: string | null
  /** Criterios concretos (RA + CE) que trabaja la unidad. */
  criterios?: CriterioUnidad[]
  /** Compatibilidad: si no hay criterios, se expanden todos los CE de estos RA. */
  ra_codigos?: string[]
  /** Solo en importación: sesiones que se asignan a la unidad. */
  sesiones?: ProgramacionEntrada[]
}

export interface ResultadoImportacionUnidades {
  creados: number
  errores: string[]
}

/* --- Calendario escolar ----------------------------------------------- */

export type TipoDiaCalendario = 'lectivo' | 'no_lectivo' | 'festivo' | 'vacaciones'

export interface DiaCalendario {
  id: number
  curso_academico_id: number
  fecha: string
  tipo: TipoDiaCalendario
  descripcion: string | null
  creado_en: string
  actualizado_en: string
}

export interface DiaCalendarioEntrada {
  fecha: string
  tipo: TipoDiaCalendario
  descripcion?: string | null
}

export interface ResultadoImportacionCalendario {
  creados: number
  errores: string[]
}

/* --- Calificación ----------------------------------------------------- */

export interface NotaCriterio {
  ceId: number
  peso: number
  nota: number | null
}

export interface ResultadoEntrega {
  nota: number | null
  completa: boolean
  ceSinNota: number[]
}

export interface NotaEntregaPonderada {
  entregaId: number
  peso: number
  nota: number | null
}

export interface NotaRaPonderada {
  raId: number
  peso: number
  nota: number | null
}

export interface ResultadoNotaFinal {
  nota: number | null
  aprobado: boolean
  incompleta: boolean
  avisos: string[]
}

/* --- Calificaciones (vista) ------------------------------------------- */

/** Nota de un alumno en una entrega concreta. */
export interface CeldaNota {
  entregaId: number
  nota: number | null
  completa: boolean
}

/** Nota de un alumno en un RA concreto. */
export interface CeldaRa {
  raCodigo: string
  raDescripcion: string
  peso: number
  nota: number | null
}

export interface FilaCalificacion {
  alumno: Alumno
  celdas: CeldaNota[]
  ras: CeldaRa[]
  final: ResultadoNotaFinal
}

export interface ResumenCalificaciones {
  modulo: { codigo: string; nombre: string }
  entregas: Entrega[]
  filas: FilaCalificacion[]
}

/* --- Importación de alumnado ------------------------------------------ */

export interface ResultadoImportacion {
  ok: boolean
  /** `true` si el usuario cerró el diálogo sin elegir fichero. */
  cancelado?: boolean
  /** Ruta del fichero importado, cuando procede. */
  ruta?: string
  creados: number
  errores: string[]
}

/** Resultado de importar alumnado en un grupo de clase. */
export interface ResultadoImportacionClase {
  creados: number
  /** Alumnado que ya existía (por DNI) y se ha matriculado en el grupo. */
  existentes: number
  errores: string[]
}

/* --- Modelo de evaluación --------------------------------------------- */

export type Modalidad = 'presencial' | 'semipresencial'

/** Bloque de entregas con su peso dentro de cada avaluación. */
export interface CategoriaEvaluacion {
  id: string
  nombre: string
  peso: number
}

/** Periodo de evaluación (trimestre) con su peso en la nota final. */
export interface Avaluacion {
  id: string
  nombre: string
  peso: number
  /**
   * Pesos de categorías propios de este trimestre. Si están definidos, sustituyen
   * a los pesos generales de `ModeloEvaluacion.categorias` en esta avaluación.
   * Las categorías omitidas cuentan 0.
   */
  pesosCategorias?: Record<string, number>
}

export interface RequisitoEvaluacion {
  id: string
  nombre: string
  valor: number
  descripcion: string
}

/** Reglas de las convocatorias extraordinaria y de pérdida de evaluación continua. */
export interface ConvocatoriasEvaluacion {
  /** La extraordinaria recupera solo las avaluaciones suspensas. */
  extraordinaria: 'suspensas'
  /** La pérdida de evaluación continua se resuelve con un examen global. */
  perdidaEvaluacionContinua: 'global'
}

/**
 * Requisitos que el motor de evaluación aplica al cálculo (por su `id`). Los
 * que se añadan de más se guardan y salen en el informe, pero no alteran la
 * nota.
 */
export const REQUISITOS_CONOCIDOS = [
  'notaMinimaEntrega',
  'notaMinimaCategoria',
  'notaMinimaAvaluacion',
  'aprobado'
] as const

export type ModoCalificacion = 'trimestres' | 'unidades'

export interface ModeloEvaluacion {
  categorias: CategoriaEvaluacion[]
  avaluaciones: Avaluacion[]
  requisitos: RequisitoEvaluacion[]
  /** Reglas de convocatorias; si faltan, se aplican las de por defecto. */
  convocatorias?: ConvocatoriasEvaluacion
  /** Cálculo final por trimestres o por unidades didácticas. */
  modoCalificacion?: ModoCalificacion
  /** Peso de cada RA en la nota final, por código de RA. */
  pesosRa?: Record<string, number>
}

/* --- Resultado de la evaluación --------------------------------------- */

export interface EvaluacionEntrega {
  entregaId: number
  titulo: string
  nota: number | null
  /** `false` si no hay nota registrada (cuenta como 0). */
  corregida: boolean
}

export interface EvaluacionCategoria {
  categoriaId: string
  nombre: string
  peso: number
  /** Media simple de las entregas de la categoría. */
  media: number | null
  suspensa: boolean
  motivos: string[]
  entregas: EvaluacionEntrega[]
}

export interface EvaluacionAvaluacion {
  avaluacionId: string
  nombre: string
  peso: number
  nota: number | null
  suspensa: boolean
  motivos: string[]
  categorias: EvaluacionCategoria[]
}

export interface EvaluacionAlumno {
  alumno: Alumno
  avaluaciones: EvaluacionAvaluacion[]
  notaFinal: number | null
  aprobado: boolean
  incompleta: boolean
  avisos: string[]
  /** Debe presentarse a la convocatoria ordinaria para recuperar partes. */
  vaAConvocatoria: boolean
}

export interface ResumenEvaluacion {
  grupo: Grupo
  modulo: { codigo: string; nombre: string }
  modelo: ModeloEvaluacion
  alumnos: EvaluacionAlumno[]
}

/* --- Cobertura -------------------------------------------------------- */

export interface CoberturaCe {
  ceId: number
  ceCodigo: string
  descripcion: string
  entregas: { id: number; titulo: string }[]
}

export interface CoberturaRa {
  raCodigo: string
  raDescripcion: string
  peso: number
  ce: CoberturaCe[]
  /** Criterios sin ninguna entrega asociada. */
  ceSinCubrir: number
}

/* --- Informes --------------------------------------------------------- */

export interface ResultadoInforme {
  ok: boolean
  ruta?: string
  mensaje?: string
}

/* --- Control de faltas ----------------------------------------------- */

export interface ConfigModuloFaltas {
  /** Código único del módulo dentro del curso. */
  moduloCodigo: string
  /** Grupo existente para este módulo, si ya se ha creado. */
  grupoId: number | null
  nombre: string
  /** Nombre exacto de la columna en el PDF de ITACA. */
  nombreInforme: string
  /** Horas totales del módulo para calcular el porcentaje. */
  horas: number
}

export interface CursoFaltasResumen {
  cursoAcademicoId: number
  cursoAcademicoNombre: string
  cicloId: string
  cicloNombre: string
  curso: Curso
  modalidad: Modalidad
  nombre: string
  modulos: number
  alumnos: number
}

export interface AlumnoFaltasCurso {
  id: number
  nombre: string
  apellidos: string
}

export interface DatosCursoFaltas {
  cursoAcademicoId: number
  cursoAcademicoNombre: string
  cicloId: string
  cicloNombre: string
  curso: Curso
  modalidad: Modalidad
  modulos: ConfigModuloFaltas[]
  alumnos: AlumnoFaltasCurso[]
  limite: number
  incluirJustificadas: boolean
}

export interface FaltasAlumnoInforme {
  alumnoId: number
  /** Total de faltas por módulo; la clave es el código del módulo. */
  faltas: Record<string, number>
}

export interface InformeFaltasDatos {
  modulos: ConfigModuloFaltas[]
  alumnos: FaltasAlumnoInforme[]
  limite: number
  incluirJustificadas: boolean
}

export interface InformeFaltasResumen {
  id: number
  archivo: string
  subidoEn: string
  totalAlumnos: number
  totalModulos: number
}

export interface InformeFaltas extends InformeFaltasResumen {
  datos: InformeFaltasDatos
  cursoAcademicoId: number
  cicloId: string
  curso: Curso
  modalidad: Modalidad
}

export interface UltimaFaltaAlumno {
  informeId: number
  archivo: string
  subidoEn: string
  moduloCodigo: string
  moduloNombre: string
  faltas: number
  horas: number
  porcentaje: number
  limite: number
}

export interface ClaveCursoFaltas {
  cursoAcademicoId: number
  cicloId: string
  curso: Curso
  modalidad: Modalidad
}

/* --- Copias de seguridad --------------------------------------------- */

export interface EstadoBackup {
  /** Carpeta raíz configurada; `null` si no hay ninguna. */
  carpeta: string | null
  existe: boolean
  configurada: boolean
  /** Número de grupos de trabajo actuales. */
  grupos: number
  /** Número de backups encontrados en la carpeta. */
  backups: number
  /** Aviso para la interfaz, si la carpeta no está disponible. */
  mensaje?: string
}

export interface ArchivoBackup {
  archivo: string
  ruta: string
  grupo_id: number | null
  grupo_nombre: string
  curso: string
  generado_en: string
  tamano: number
}

export interface ResultadoBackup extends ResultadoInforme {
  grupo_id?: number
}

export interface ApiBackup {
  estado(): Promise<EstadoBackup>
  elegirCarpeta(): Promise<EstadoBackup | null>
  usarCarpetaRecomendada(): Promise<EstadoBackup>
  abrirCarpeta(): Promise<boolean>
  listar(): Promise<ArchivoBackup[]>
  crear(grupoClaseId: number): Promise<ResultadoBackup>
  crearTodos(): Promise<ResultadoBackup[]>
  importar(ruta?: string): Promise<ResultadoBackup>
}

/* --- Convocatorias ordinaria y extraordinaria ------------------------- */

export type TipoConvocatoria = 'ordinaria' | 'extraordinaria'

export interface Convocatoria {
  id: number
  grupo_clase_id: number
  tipo: TipoConvocatoria
  nombre: string
  fecha: string | null
  creado_en: string
  actualizado_en: string
}

export interface BloqueConvocatoria {
  id: number
  convocatoria_id: number
  nombre: string
  descripcion: string
  avaluacion_id: string | null
  unidad_id: number | null
  ra_codigo: string | null
  ce_codigo: string | null
  peso: number
  orden: number
}

export interface AsignacionConvocatoria {
  id: number
  convocatoria_id: number
  alumno_id: number
  bloque_id: number
  nota: number | null
  observaciones: string | null
  incluida: boolean
}

export interface ConvocatoriaDetalle {
  convocatoria: Convocatoria
  bloques: BloqueConvocatoria[]
  asignaciones: AsignacionConvocatoria[]
}

export interface ConvocatoriaEntrada {
  tipo: TipoConvocatoria
  nombre: string
  fecha?: string | null
}

export interface BloqueConvocatoriaEntrada {
  nombre: string
  descripcion?: string
  avaluacion_id?: string | null
  unidad_id?: number | null
  ra_codigo?: string | null
  ce_codigo?: string | null
  peso?: number
  orden?: number
}

export interface AsignacionConvocatoriaEntrada {
  alumnoId: number
  bloqueId: number
  nota?: number | null
  observaciones?: string | null
  incluida?: boolean
}

/* --- Presentación editable del módulo ---------------------------------- */

export interface PresentacionConfig {
  /** HTML de la plantilla con marcadores {{campo}}, {{#lista}}…{{/lista}}. */
  plantilla: string
  titulo: string
  subtitulo: string
  profesor: string
  contacto: string
  webApuntes: string
  tutorias: string
  cierre: string
}

/* --- API (preload) ---------------------------------------------------- */

export interface ConfiguracionGeneral {
  profesor: {
    nombre: string
    apellidos: string
    email: string
    telefono: string
    departamento: string
  }
  centro: {
    nombre: string
    direccion: string
    localidad: string
    provincia: string
    codigoPostal: string
    telefono: string
    email: string
    web: string
  }
  /** Logo del centro como data URL PNG. */
  logo: string | null
}

export const CONFIGURACION_GENERAL_POR_DEFECTO: ConfiguracionGeneral = {
  profesor: { nombre: '', apellidos: '', email: '', telefono: '', departamento: '' },
  centro: {
    nombre: '',
    direccion: '',
    localidad: '',
    provincia: '',
    codigoPostal: '',
    telefono: '',
    email: '',
    web: ''
  },
  logo: null
}

export interface Api {
  app: {
    version(): Promise<string>
  }
  configuracion: {
    obtener(): Promise<ConfiguracionGeneral>
    guardar(configuracion: ConfiguracionGeneral): Promise<ConfiguracionGeneral>
  }
  boe: {
    listarCiclos(): Promise<ResumenCiclo[]>
    obtenerCiclo(id: string): Promise<Ciclo | null>
    /** Módulo con sus RA y CE, para consultarlos desde cualquier sección. */
    obtenerModulo(codigo: string): Promise<Modulo | null>
    guardarPesosRa(modulo: string, pesos: Record<string, number>): Promise<void>
  }
  bd: {
    estado(): Promise<{ ruta: string; ciclos: number; modulos: number; ra: number; ce: number }>
    listarModulos(cicloId: string): Promise<ResumenModulo[]>
    /** Borra los datos de trabajo (grupos, alumnado, entregas, notas) y deja el BOE. */
    vaciar(): Promise<void>
  }
  alumnos: {
    /** Si se indica un grupo, devuelve solo el alumnado matriculado en él. */
    listar(grupoId?: number): Promise<Alumno[]>
    crear(entrada: AlumnoEntrada): Promise<Alumno>
    actualizar(id: number, entrada: AlumnoEntrada): Promise<Alumno | null>
    borrar(id: number): Promise<boolean>
    desmatricular(alumnoId: number, grupoId: number): Promise<boolean>
    importar(texto: string, grupoId?: number): Promise<ResultadoImportacion>
    importarFichero(grupoId?: number): Promise<ResultadoImportacion>
  }
  alumnosClase: {
    listar(grupoClaseId: number): Promise<AlumnoClase[]>
    crear(grupoClaseId: number, entrada: AlumnoEntrada): Promise<ResultadoAltaAlumnoClase>
    actualizar(id: number, entrada: AlumnoEntrada): Promise<AlumnoClase | null>
    activar(id: number, activo: boolean): Promise<AlumnoClase | null>
    desmatricular(grupoClaseId: number, alumnoId: number): Promise<boolean>
  }
  entregasClase: {
    listar(grupoClaseId: number): Promise<EntregaClase[]>
    crear(grupoClaseId: number, entrada: EntregaClaseEntrada): Promise<EntregaClase>
    actualizar(id: number, entrada: EntregaClaseEntrada): Promise<EntregaClase | null>
    borrar(id: number): Promise<boolean>
    /** Bloquea o desbloquea una entrega ya calificada. */
    bloquear(id: number, bloqueada: boolean): Promise<EntregaClase | null>
    /** CE del módulo del grupo, para el selector de mapeo. */
    criterios(grupoClaseId: number): Promise<CriterioDisponible[]>
    /** Prepara el HTML que se verá antes de exportar. */
    vistaPrevia(
      grupoClaseId: number,
      opciones: OpcionesExportacionEntregas
    ): Promise<VistaPreviaEntregas>
    /** Exporta una entrega, una avaluación o el curso completo. */
    exportar(grupoClaseId: number, opciones: OpcionesExportacionEntregas): Promise<ResultadoInforme>
  }
  eventosEvaluacion: {
    listar(grupoClaseId: number): Promise<EventoEvaluacionClase[]>
    crear(grupoClaseId: number, entrada: EventoEvaluacionEntrada): Promise<EventoEvaluacionClase>
    actualizar(id: number, entrada: EventoEvaluacionEntrada): Promise<EventoEvaluacionClase | null>
    borrar(id: number): Promise<boolean>
    importar(grupoClaseId: number, texto: string): Promise<ResultadoImportacionEventos>
  }
  formacionEmpresa: {
    listar(grupoClaseId: number, alumnoId?: number): Promise<PeriodoFormacionEmpresa[]>
    crear(
      grupoClaseId: number,
      alumnoId: number,
      entrada: PeriodoFormacionEmpresaEntrada
    ): Promise<PeriodoFormacionEmpresa>
    actualizar(
      id: number,
      entrada: PeriodoFormacionEmpresaEntrada
    ): Promise<PeriodoFormacionEmpresa | null>
    borrar(id: number): Promise<boolean>
  }
  convocatorias: {
    listar(grupoClaseId: number): Promise<Convocatoria[]>
    obtener(id: number): Promise<ConvocatoriaDetalle | null>
    crear(grupoClaseId: number, entrada: ConvocatoriaEntrada): Promise<Convocatoria>
    actualizar(id: number, entrada: ConvocatoriaEntrada): Promise<Convocatoria | null>
    borrar(id: number): Promise<boolean>
    crearBloque(
      convocatoriaId: number,
      entrada: BloqueConvocatoriaEntrada
    ): Promise<BloqueConvocatoria>
    actualizarBloque(
      id: number,
      entrada: BloqueConvocatoriaEntrada
    ): Promise<BloqueConvocatoria | null>
    borrarBloque(id: number): Promise<boolean>
    guardarAsignaciones(
      convocatoriaId: number,
      asignaciones: AsignacionConvocatoriaEntrada[]
    ): Promise<ConvocatoriaDetalle>
  }
  presentacion: {
    obtener(): Promise<PresentacionConfig>
    guardar(config: PresentacionConfig): Promise<PresentacionConfig>
  }
  normativaFpt: {
    leer(): Promise<NormativaFpt>
    importar(html: string): Promise<NormativaFpt>
    restaurar(): Promise<NormativaFpt>
  }
  evidenciasClase: {
    listar(grupoClaseId: number, entregaId: number): Promise<EvidenciaClase[]>
    subir(
      grupoClaseId: number,
      entregaId: number,
      archivos: EvidenciaClaseEntrada[]
    ): Promise<EvidenciaClase[]>
    borrar(id: number): Promise<boolean>
  }
  notasClase: {
    listar(grupoClaseId: number): Promise<NotaGuardadaClase[]>
    guardar(
      grupoClaseId: number,
      alumnoId: number,
      notas: NotaEntradaClase[]
    ): Promise<NotaGuardadaClase[]>
  }
  grupos: {
    listar(modulo?: string): Promise<GrupoDetalle[]>
    crear(entrada: GrupoEntrada): Promise<Grupo>
    actualizar(id: number, entrada: GrupoEntrada): Promise<Grupo | null>
    borrar(id: number): Promise<boolean>
  }
  cursosAcademicos: {
    listar(): Promise<CursoAcademico[]>
    actual(): Promise<CursoAcademico | null>
    /** Crea el curso académico derivado de la fecha si todavía no existe. */
    asegurarActual(): Promise<CursoAcademico>
    crear(entrada: CursoAcademicoEntrada): Promise<CursoAcademico>
    actualizar(id: number, entrada: CursoAcademicoEntrada): Promise<CursoAcademico | null>
    marcarActual(id: number): Promise<CursoAcademico | null>
    borrar(id: number): Promise<boolean>
  }
  gruposClase: {
    /** Si se indica un curso académico, solo devuelve sus grupos. */
    listar(cursoAcademicoId?: number): Promise<GrupoClase[]>
    crear(entrada: GrupoClaseEntrada): Promise<GrupoClase>
    actualizar(id: number, entrada: GrupoClaseEntrada): Promise<GrupoClase | null>
    borrar(id: number): Promise<boolean>
  }
  matriculasClase: {
    /** Importa alumnado (JSON/CSV) y lo matricula en el grupo de clase. */
    importar(grupoClaseId: number, texto: string): Promise<ResultadoImportacionClase>
  }
  criterios: {
    obtener(grupoClaseId: number): Promise<ModeloEvaluacion | null>
    guardar(grupoClaseId: number, modelo: ModeloEvaluacion): Promise<ModeloEvaluacion>
    /** Plantilla que corresponde al grupo (o los valores por defecto de su modalidad). */
    plantillaParaGrupo(grupoClaseId: number): Promise<PlantillaParaGrupo>
    /** Crea o actualiza la plantilla a partir del grupo; se llama «Plantilla <grupo>». */
    crearPlantillaDesdeGrupo(
      grupoClaseId: number,
      modelo: ModeloEvaluacion
    ): Promise<PlantillaCriterios>
    listarPlantillas(): Promise<PlantillaCriterios[]>
    obtenerPlantilla(id: number): Promise<ModeloEvaluacion | null>
    guardarPlantilla(id: number, modelo: ModeloEvaluacion): Promise<ModeloEvaluacion>
    borrarPlantilla(id: number): Promise<boolean>
    /** Copia a los grupos del mismo módulo; devuelve cuántos. */
    copiar(grupoClaseId: number): Promise<number>
  }
  programacion: {
    listar(grupoClaseId: number): Promise<ProgramacionAula[]>
    /** Guarda el estado completo de la tabla: inserta, actualiza y borra lo que falte. */
    guardar(grupoClaseId: number, filas: ProgramacionEntrada[]): Promise<ProgramacionAula[]>
    /** Exporta todas las sesiones del grupo a un PDF, no solo la quincena visible. */
    exportarPdf(grupoClaseId: number): Promise<ResultadoInforme>
  }
  unidadesProgramacion: {
    listar(grupoClaseId: number): Promise<UnidadProgramacion[]>
    crear(grupoClaseId: number, entrada: UnidadProgramacionEntrada): Promise<UnidadProgramacion>
    actualizar(id: number, entrada: UnidadProgramacionEntrada): Promise<UnidadProgramacion | null>
    borrar(id: number): Promise<boolean>
    importar(grupoClaseId: number, texto: string): Promise<ResultadoImportacionUnidades>
  }
  calendarioEscolar: {
    listar(cursoAcademicoId: number): Promise<DiaCalendario[]>
    importar(cursoAcademicoId: number, texto: string): Promise<ResultadoImportacionCalendario>
    vaciar(cursoAcademicoId: number): Promise<boolean>
  }
  entregas: {
    listar(modulo: string): Promise<Entrega[]>
    crear(entrada: EntregaEntrada): Promise<Entrega>
    actualizar(id: number, entrada: EntregaEntrada): Promise<Entrega | null>
    borrar(id: number): Promise<boolean>
    criterios(entregaId: number): Promise<CriterioDeEntrega[]>
    mapear(entregaId: number, ceIds: number[], pesos?: Record<number, number>): Promise<void>
    criteriosDisponibles(modulo: string): Promise<CriterioDisponible[]>
  }
  notas: {
    registrar(entrada: NotaRegistro): Promise<Nota>
    registrarEntrega(entregaId: number, alumnoId: number, nota: number | null): Promise<void>
    detalle(entregaId: number, alumnoId: number): Promise<NotaCe[]>
    resumen(modulo: string): Promise<ResumenCalificaciones>
  }
  evaluacion: {
    modelo(grupoId: number): Promise<ModeloEvaluacion>
    guardarModelo(grupoId: number, modelo: ModeloEvaluacion): Promise<ModeloEvaluacion>
    aplicarATodos(cicloId: string, modelo: ModeloEvaluacion): Promise<number>
    porDefecto(modalidad: Modalidad): Promise<ModeloEvaluacion>
    resumen(grupoId: number): Promise<ResumenEvaluacion>
  }
  cobertura: {
    modulo(modulo: string): Promise<CoberturaRa[]>
  }
  informes: {
    html(grupoId: number, alumnoId?: number): Promise<string>
    exportarPdf(grupoId: number, alumnoId?: number): Promise<ResultadoInforme>
    exportarCsv(grupoId: number): Promise<ResultadoInforme>
  }
  backup: ApiBackup
  faltas: {
    cursos(): Promise<CursoFaltasResumen[]>
    obtenerCurso(clave: ClaveCursoFaltas): Promise<DatosCursoFaltas>
    guardarModulo(
      clave: ClaveCursoFaltas,
      moduloCodigo: string,
      nombreInforme: string,
      horas: number
    ): Promise<void>
    guardarAjustes(
      clave: ClaveCursoFaltas,
      limite: number,
      incluirJustificadas: boolean
    ): Promise<DatosCursoFaltas>
    listarInformes(clave: ClaveCursoFaltas): Promise<InformeFaltasResumen[]>
    obtenerInforme(id: number): Promise<InformeFaltas | null>
    ultimoAlumno(grupoClaseId: number, alumnoId: number): Promise<UltimaFaltaAlumno | null>
    importarInforme(
      clave: ClaveCursoFaltas,
      archivo: string,
      datos: InformeFaltasDatos
    ): Promise<InformeFaltas>
  }
  /** Solo en la previsualización web: carga el curso de ejemplo. */
  demo?: {
    cargar(): Promise<void>
    /** Elimina los datos de la previsualización y deja la aplicación vacía. */
    eliminar(): Promise<void>
    /** Añade el alumnado de ejemplo al grupo indicado, sin tocar el resto. */
    alumnos(grupoClaseId: number): Promise<void>
  }
}

/** Nombres de los canales IPC, en un único sitio para evitar erratas. */
export const CANALES = {
  appVersion: 'app:version',
  boeListarCiclos: 'boe:listarCiclos',
  boeObtenerCiclo: 'boe:obtenerCiclo',
  boeObtenerModulo: 'boe:obtenerModulo',
  boeGuardarPesosRa: 'boe:guardarPesosRa',
  bdEstado: 'bd:estado',
  bdListarModulos: 'bd:listarModulos',
  bdVaciar: 'bd:vaciar',
  alumnosListar: 'alumnos:listar',
  alumnosCrear: 'alumnos:crear',
  alumnosActualizar: 'alumnos:actualizar',
  alumnosBorrar: 'alumnos:borrar',
  alumnosDesmatricular: 'alumnos:desmatricular',
  alumnosImportar: 'alumnos:importar',
  alumnosImportarFichero: 'alumnos:importarFichero',
  alumnosClaseListar: 'alumnosClase:listar',
  alumnosClaseCrear: 'alumnosClase:crear',
  alumnosClaseActualizar: 'alumnosClase:actualizar',
  alumnosClaseActivar: 'alumnosClase:activar',
  alumnosClaseDesmatricular: 'alumnosClase:desmatricular',
  entregasClaseListar: 'entregasClase:listar',
  entregasClaseCrear: 'entregasClase:crear',
  entregasClaseActualizar: 'entregasClase:actualizar',
  entregasClaseBorrar: 'entregasClase:borrar',
  entregasClaseBloquear: 'entregasClase:bloquear',
  entregasClaseCriterios: 'entregasClase:criterios',
  entregasClaseVistaPrevia: 'entregasClase:vistaPrevia',
  entregasClaseExportar: 'entregasClase:exportar',
  eventosEvaluacionListar: 'eventosEvaluacion:listar',
  eventosEvaluacionCrear: 'eventosEvaluacion:crear',
  eventosEvaluacionActualizar: 'eventosEvaluacion:actualizar',
  eventosEvaluacionBorrar: 'eventosEvaluacion:borrar',
  eventosEvaluacionImportar: 'eventosEvaluacion:importar',
  formacionEmpresaListar: 'formacionEmpresa:listar',
  formacionEmpresaCrear: 'formacionEmpresa:crear',
  formacionEmpresaActualizar: 'formacionEmpresa:actualizar',
  formacionEmpresaBorrar: 'formacionEmpresa:borrar',
  convocatoriasListar: 'convocatorias:listar',
  convocatoriasObtener: 'convocatorias:obtener',
  convocatoriasCrear: 'convocatorias:crear',
  convocatoriasActualizar: 'convocatorias:actualizar',
  convocatoriasBorrar: 'convocatorias:borrar',
  convocatoriasCrearBloque: 'convocatorias:crearBloque',
  convocatoriasActualizarBloque: 'convocatorias:actualizarBloque',
  convocatoriasBorrarBloque: 'convocatorias:borrarBloque',
  convocatoriasGuardarAsignaciones: 'convocatorias:guardarAsignaciones',
  presentacionObtener: 'presentacion:obtener',
  presentacionGuardar: 'presentacion:guardar',
  normativaFptLeer: 'normativaFpt:leer',
  normativaFptImportar: 'normativaFpt:importar',
  normativaFptRestaurar: 'normativaFpt:restaurar',
  evidenciasClaseListar: 'evidenciasClase:listar',
  evidenciasClaseSubir: 'evidenciasClase:subir',
  evidenciasClaseBorrar: 'evidenciasClase:borrar',
  notasClaseListar: 'notasClase:listar',
  notasClaseGuardar: 'notasClase:guardar',
  gruposListar: 'grupos:listar',
  gruposCrear: 'grupos:crear',
  gruposActualizar: 'grupos:actualizar',
  gruposBorrar: 'grupos:borrar',
  cursosAcademicosListar: 'cursosAcademicos:listar',
  cursosAcademicosActual: 'cursosAcademicos:actual',
  cursosAcademicosAsegurarActual: 'cursosAcademicos:asegurarActual',
  cursosAcademicosCrear: 'cursosAcademicos:crear',
  cursosAcademicosActualizar: 'cursosAcademicos:actualizar',
  cursosAcademicosMarcarActual: 'cursosAcademicos:marcarActual',
  cursosAcademicosBorrar: 'cursosAcademicos:borrar',
  gruposClaseListar: 'gruposClase:listar',
  gruposClaseCrear: 'gruposClase:crear',
  gruposClaseActualizar: 'gruposClase:actualizar',
  gruposClaseBorrar: 'gruposClase:borrar',
  matriculasClaseImportar: 'matriculasClase:importar',
  criteriosObtener: 'criterios:obtener',
  criteriosGuardar: 'criterios:guardar',
  criteriosPlantillaParaGrupo: 'criterios:plantillaParaGrupo',
  criteriosCrearPlantilla: 'criterios:crearPlantilla',
  criteriosListarPlantillas: 'criterios:listarPlantillas',
  criteriosObtenerPlantilla: 'criterios:obtenerPlantilla',
  criteriosGuardarPlantilla: 'criterios:guardarPlantilla',
  criteriosBorrarPlantilla: 'criterios:borrarPlantilla',
  criteriosCopiar: 'criterios:copiar',
  programacionListar: 'programacion:listar',
  programacionGuardar: 'programacion:guardar',
  programacionExportarPdf: 'programacion:exportarPdf',
  unidadesProgramacionListar: 'unidadesProgramacion:listar',
  unidadesProgramacionCrear: 'unidadesProgramacion:crear',
  unidadesProgramacionActualizar: 'unidadesProgramacion:actualizar',
  unidadesProgramacionBorrar: 'unidadesProgramacion:borrar',
  unidadesProgramacionImportar: 'unidadesProgramacion:importar',
  calendarioEscolarListar: 'calendarioEscolar:listar',
  calendarioEscolarImportar: 'calendarioEscolar:importar',
  calendarioEscolarVaciar: 'calendarioEscolar:vaciar',
  entregasListar: 'entregas:listar',
  entregasCrear: 'entregas:crear',
  entregasActualizar: 'entregas:actualizar',
  entregasBorrar: 'entregas:borrar',
  entregasCriterios: 'entregas:criterios',
  entregasMapear: 'entregas:mapear',
  entregasCriteriosDisponibles: 'entregas:criteriosDisponibles',
  notasRegistrar: 'notas:registrar',
  notasRegistrarEntrega: 'notas:registrarEntrega',
  notasDetalle: 'notas:detalle',
  notasResumen: 'notas:resumen',
  evaluacionModelo: 'evaluacion:modelo',
  evaluacionGuardarModelo: 'evaluacion:guardarModelo',
  evaluacionAplicarTodos: 'evaluacion:aplicarTodos',
  evaluacionPorDefecto: 'evaluacion:porDefecto',
  evaluacionResumen: 'evaluacion:resumen',
  coberturaModulo: 'cobertura:modulo',
  informesHtml: 'informes:html',
  informesPdf: 'informes:pdf',
  informesCsv: 'informes:csv',
  configuracionObtener: 'configuracion:obtener',
  configuracionGuardar: 'configuracion:guardar',
  backupEstado: 'backup:estado',
  backupElegirCarpeta: 'backup:elegirCarpeta',
  backupCarpetaRecomendada: 'backup:carpetaRecomendada',
  backupAbrirCarpeta: 'backup:abrirCarpeta',
  backupListar: 'backup:listar',
  backupCrear: 'backup:crear',
  backupCrearTodos: 'backup:crearTodos',
  backupImportar: 'backup:importar',
  faltasCursos: 'faltas:cursos',
  faltasObtenerCurso: 'faltas:obtenerCurso',
  faltasGuardarModulo: 'faltas:guardarModulo',
  faltasGuardarAjustes: 'faltas:guardarAjustes',
  faltasListarInformes: 'faltas:listarInformes',
  faltasObtenerInforme: 'faltas:obtenerInforme',
  faltasUltimoAlumno: 'faltas:ultimoAlumno',
  faltasImportarInforme: 'faltas:importarInforme'
} as const
