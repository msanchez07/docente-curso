/**
 * Registro de los handlers IPC del proceso principal.
 *
 * Todo el acceso del renderer al sistema pasa por aquí: es la única superficie
 * de comunicación entre la interfaz y el proceso principal.
 */
import { app, dialog, ipcMain } from 'electron'
import { readFile } from 'node:fs/promises'
import { CANALES } from '@shared/tipos'
import type {
  AlumnoEntrada,
  CursoAcademicoEntrada,
  EntregaClaseEntrada,
  EventoEvaluacionEntrada,
  EvidenciaClaseEntrada,
  EntregaEntrada,
  GrupoClaseEntrada,
  GrupoEntrada,
  Modalidad,
  ModeloEvaluacion,
  NotaEntradaClase,
  NotaRegistro,
  OpcionesExportacionEntregas,
  PeriodoFormacionEmpresaEntrada,
  ProgramacionEntrada,
  UnidadProgramacionEntrada
} from '@shared/tipos'
import { obtenerBd, rutaBd } from '../bd'
import {
  actualizarAlumno,
  borrarAlumno,
  crearAlumno,
  desmatricular,
  importarAlumnos,
  listarAlumnos
} from '../db/repositorios/alumnos'
import {
  activarAlumnoClase,
  crearAlumnoEnGrupoClase,
  desmatricularDeGrupoClase,
  listarAlumnosDeGrupoClase,
  obtenerAlumnoClase
} from '../db/repositorios/alumnos-clase'
import {
  actualizarEntregaClase,
  bloquearEntregaClase,
  borrarEntregaClase,
  crearEntregaClase,
  criteriosDisponiblesClase,
  listarEntregasClase
} from '../db/repositorios/entregas-clase'
import { guardarNotasClase, listarNotasClase } from '../db/repositorios/notas-clase'
import {
  borrarEvidenciaClase,
  listarEvidenciasClase,
  subirEvidenciasClase
} from '../db/repositorios/evidencias-clase'
import {
  actualizarFormacionEmpresa,
  borrarFormacionEmpresa,
  crearFormacionEmpresa,
  listarFormacionEmpresa
} from '../db/repositorios/formacion-empresa'
import {
  actualizarEventoEvaluacion,
  borrarEventoEvaluacion,
  crearEventoEvaluacion,
  importarEventosEvaluacion,
  listarEventosEvaluacion
} from '../db/repositorios/eventos-evaluacion'
import { importarNormativaFpt, leerNormativaFpt, restaurarNormativaFpt } from '../normativa-fpt'
import {
  listarCiclos,
  listarModulos,
  obtenerCiclo,
  obtenerModulo,
  guardarPesosRa
} from '../db/repositorios/boe'
import { coberturaModulo } from '../db/repositorios/cobertura'
import {
  actualizarEntrega,
  borrarEntrega,
  crearEntrega,
  criteriosDisponibles,
  listarCriteriosDeEntrega,
  listarEntregas,
  mapearCriterios
} from '../db/repositorios/entregas'
import {
  registrarNotaDe,
  registrarNotaEntrega,
  notasDe,
  resumenModulo
} from '../db/repositorios/notas'
import {
  aplicarModeloATodos,
  guardarModeloDeGrupo,
  obtenerModelo,
  resumenEvaluacion
} from '../db/repositorios/evaluacion'
import {
  actualizarCursoAcademico,
  asegurarCursoActual,
  borrarCursoAcademico,
  crearCursoAcademico,
  listarCursosAcademicos,
  marcarCursoActual,
  obtenerCursoActual
} from '../db/repositorios/cursos-academicos'
import { actualizarGrupo, borrarGrupo, crearGrupo, listarGrupos } from '../db/repositorios/grupos'
import {
  actualizarGrupoClase,
  borrarGrupoClase,
  crearGrupoClase,
  listarGruposClase
} from '../db/repositorios/grupos-clase'
import { importarAlumnosEnGrupoClase } from '../db/repositorios/matriculas-clase'
import {
  copiarCriteriosMismoModulo,
  guardarCriterios,
  obtenerCriterios
} from '../db/repositorios/criterios-grupo'
import {
  borrarPlantilla,
  crearPlantillaDesdeGrupo,
  guardarPlantilla,
  listarPlantillas,
  obtenerPlantilla,
  plantillaParaGrupo
} from '../db/repositorios/plantillas-criterios'
import { guardarProgramacion, listarProgramacion } from '../db/repositorios/programacion-aula'
import {
  actualizarUnidadProgramacion,
  borrarUnidadProgramacion,
  crearUnidadProgramacion,
  importarUnidadesProgramacion,
  listarUnidadesProgramacion
} from '../db/repositorios/unidades-programacion'
import {
  importarCalendarioEscolar,
  listarCalendarioEscolar,
  vaciarCalendarioEscolar
} from '../db/repositorios/calendario-escolar'
import { vaciarDatos } from '../db/mantenimiento'
import { modeloPorDefecto } from '../domain/modelo'
import { contarBoe } from '../db/seed'
import { exportarCsv, exportarPdf, informeHtml } from '../informes/servicio'
import { exportarProgramacionPdf } from '../programacion/servicio'
import { exportarEntregas, vistaPreviaEntregas } from '../entregas/servicio'
import {
  guardarAjustesFaltas,
  guardarModuloFaltas,
  importarInformeFaltas,
  listarCursosFaltas,
  listarInformesFaltas,
  obtenerCursoFaltas,
  obtenerInformeFaltas
} from '../db/repositorios/faltas'
import {
  abrirCarpetaBackup,
  backupAutomatico,
  crearBackupGrupo,
  crearBackupsTodos,
  elegirCarpetaBackup,
  estadoBackup,
  importarBackupConDialogo,
  listarBackups,
  usarCarpetaRecomendada
} from '../backup/servicio'

export function registrarIpc(): void {
  const bd = (): ReturnType<typeof obtenerBd> => obtenerBd()

  ipcMain.handle(CANALES.appVersion, () => app.getVersion())

  // Datos del BOE (desde la base de datos ya sembrada).
  ipcMain.handle(CANALES.boeListarCiclos, () => listarCiclos(bd()))
  ipcMain.handle(CANALES.boeObtenerCiclo, (_e, id: string) => obtenerCiclo(bd(), id))
  ipcMain.handle(CANALES.boeObtenerModulo, (_e, codigo: string) => obtenerModulo(bd(), codigo))
  ipcMain.handle(CANALES.boeGuardarPesosRa, (_e, modulo: string, pesos: Record<string, number>) =>
    guardarPesosRa(bd(), modulo, pesos ?? {})
  )

  // Estado de la base de datos.
  ipcMain.handle(CANALES.bdEstado, () => ({ ruta: rutaBd(), ...contarBoe(bd()) }))
  ipcMain.handle(CANALES.bdListarModulos, (_e, cicloId: string) => listarModulos(bd(), cicloId))
  ipcMain.handle(CANALES.bdVaciar, () => vaciarDatos(bd()))

  // Alumnado.
  ipcMain.handle(CANALES.alumnosListar, (_e, grupoId?: number) => listarAlumnos(bd(), { grupoId }))
  ipcMain.handle(CANALES.alumnosCrear, (_e, entrada: AlumnoEntrada) => crearAlumno(bd(), entrada))
  ipcMain.handle(CANALES.alumnosActualizar, (_e, id: number, entrada: AlumnoEntrada) =>
    actualizarAlumno(bd(), id, entrada)
  )
  ipcMain.handle(CANALES.alumnosBorrar, (_e, id: number) => borrarAlumno(bd(), id))
  ipcMain.handle(CANALES.alumnosDesmatricular, (_e, alumnoId: number, grupoId: number) =>
    desmatricular(bd(), alumnoId, grupoId)
  )
  ipcMain.handle(CANALES.alumnosImportar, (_e, texto: string, grupoId?: number) => ({
    ok: true,
    ...importarAlumnos(bd(), texto, grupoId)
  }))

  ipcMain.handle(CANALES.alumnosImportarFichero, async (_e, grupoId?: number) => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Importar alumnado',
      properties: ['openFile'],
      filters: [
        { name: 'Datos (JSON o CSV)', extensions: ['json', 'csv', 'txt'] },
        { name: 'Todos los ficheros', extensions: ['*'] }
      ]
    })
    if (canceled || filePaths.length === 0) {
      return { ok: false, cancelado: true, creados: 0, errores: [] }
    }
    const ruta = filePaths[0]
    try {
      const texto = await readFile(ruta, 'utf-8')
      return { ok: true, ruta, ...importarAlumnos(bd(), texto, grupoId) }
    } catch (error) {
      return {
        ok: false,
        ruta,
        creados: 0,
        errores: [`No se pudo leer el fichero: ${(error as Error).message}`]
      }
    }
  })

  // Alumnado por grupo de clase.
  ipcMain.handle(CANALES.alumnosClaseListar, (_e, grupoClaseId: number) =>
    listarAlumnosDeGrupoClase(bd(), grupoClaseId)
  )
  ipcMain.handle(CANALES.alumnosClaseCrear, (_e, grupoClaseId: number, entrada: AlumnoEntrada) =>
    crearAlumnoEnGrupoClase(bd(), grupoClaseId, entrada)
  )
  ipcMain.handle(CANALES.alumnosClaseActualizar, (_e, id: number, entrada: AlumnoEntrada) => {
    const actualizado = actualizarAlumno(bd(), id, entrada)
    return actualizado ? obtenerAlumnoClase(bd(), id) : null
  })
  ipcMain.handle(CANALES.alumnosClaseActivar, (_e, id: number, activo: boolean) =>
    activarAlumnoClase(bd(), id, activo)
  )
  ipcMain.handle(CANALES.alumnosClaseDesmatricular, (_e, grupoClaseId: number, alumnoId: number) =>
    desmatricularDeGrupoClase(bd(), grupoClaseId, alumnoId)
  )

  // Entregas por grupo de clase.
  ipcMain.handle(CANALES.entregasClaseListar, (_e, grupoClaseId: number) =>
    listarEntregasClase(bd(), grupoClaseId)
  )
  ipcMain.handle(
    CANALES.entregasClaseCrear,
    (_e, grupoClaseId: number, entrada: EntregaClaseEntrada) =>
      crearEntregaClase(bd(), grupoClaseId, entrada)
  )
  ipcMain.handle(CANALES.entregasClaseActualizar, (_e, id: number, entrada: EntregaClaseEntrada) =>
    actualizarEntregaClase(bd(), id, entrada)
  )
  ipcMain.handle(CANALES.entregasClaseBorrar, (_e, id: number) => borrarEntregaClase(bd(), id))
  ipcMain.handle(CANALES.entregasClaseBloquear, (_e, id: number, bloqueada: boolean) =>
    bloquearEntregaClase(bd(), id, bloqueada)
  )
  ipcMain.handle(CANALES.entregasClaseCriterios, (_e, grupoClaseId: number) =>
    criteriosDisponiblesClase(bd(), grupoClaseId)
  )
  ipcMain.handle(
    CANALES.entregasClaseVistaPrevia,
    (_e, grupoClaseId: number, opciones: OpcionesExportacionEntregas) =>
      vistaPreviaEntregas(grupoClaseId, opciones)
  )
  ipcMain.handle(
    CANALES.entregasClaseExportar,
    (_e, grupoClaseId: number, opciones: OpcionesExportacionEntregas) =>
      exportarEntregas(grupoClaseId, opciones)
  )

  // Fechas de evaluaciones y exámenes.
  ipcMain.handle(CANALES.eventosEvaluacionListar, (_e, grupoClaseId: number) =>
    listarEventosEvaluacion(bd(), grupoClaseId)
  )
  ipcMain.handle(
    CANALES.eventosEvaluacionCrear,
    (_e, grupoClaseId: number, entrada: EventoEvaluacionEntrada) =>
      crearEventoEvaluacion(bd(), grupoClaseId, entrada)
  )
  ipcMain.handle(
    CANALES.eventosEvaluacionActualizar,
    (_e, id: number, entrada: EventoEvaluacionEntrada) =>
      actualizarEventoEvaluacion(bd(), id, entrada)
  )
  ipcMain.handle(CANALES.eventosEvaluacionBorrar, (_e, id: number) =>
    borrarEventoEvaluacion(bd(), id)
  )
  ipcMain.handle(CANALES.eventosEvaluacionImportar, (_e, grupoClaseId: number, texto: string) =>
    importarEventosEvaluacion(bd(), grupoClaseId, texto)
  )

  // Normativa de FP (documento incluido o importado).
  ipcMain.handle(CANALES.normativaFptLeer, () => leerNormativaFpt())
  ipcMain.handle(CANALES.normativaFptImportar, (_e, html: string) => importarNormativaFpt(html))
  ipcMain.handle(CANALES.normativaFptRestaurar, () => restaurarNormativaFpt())

  // Formación en empresa por alumno.
  ipcMain.handle(CANALES.formacionEmpresaListar, (_e, grupoClaseId: number, alumnoId?: number) =>
    listarFormacionEmpresa(bd(), grupoClaseId, alumnoId)
  )
  ipcMain.handle(
    CANALES.formacionEmpresaCrear,
    (_e, grupoClaseId: number, alumnoId: number, entrada: PeriodoFormacionEmpresaEntrada) =>
      crearFormacionEmpresa(bd(), grupoClaseId, alumnoId, entrada)
  )
  ipcMain.handle(
    CANALES.formacionEmpresaActualizar,
    (_e, id: number, entrada: PeriodoFormacionEmpresaEntrada) =>
      actualizarFormacionEmpresa(bd(), id, entrada)
  )
  ipcMain.handle(CANALES.formacionEmpresaBorrar, (_e, id: number) =>
    borrarFormacionEmpresa(bd(), id)
  )

  // Evidencias (ficheros) de una entrega.
  ipcMain.handle(CANALES.evidenciasClaseListar, (_e, grupoClaseId: number, entregaId: number) =>
    listarEvidenciasClase(bd(), grupoClaseId, entregaId)
  )
  ipcMain.handle(
    CANALES.evidenciasClaseSubir,
    (_e, grupoClaseId: number, entregaId: number, archivos: EvidenciaClaseEntrada[]) =>
      subirEvidenciasClase(bd(), grupoClaseId, entregaId, archivos)
  )
  ipcMain.handle(CANALES.evidenciasClaseBorrar, (_e, id: number) => borrarEvidenciaClase(bd(), id))

  // Notas de las entregas por grupo de clase.
  ipcMain.handle(CANALES.notasClaseListar, (_e, grupoClaseId: number) =>
    listarNotasClase(bd(), grupoClaseId)
  )
  ipcMain.handle(
    CANALES.notasClaseGuardar,
    (_e, grupoClaseId: number, alumnoId: number, notas: NotaEntradaClase[]) =>
      guardarNotasClase(bd(), grupoClaseId, alumnoId, notas)
  )

  // Entregas y su mapeo al BOE.
  ipcMain.handle(CANALES.entregasListar, (_e, modulo: string) => listarEntregas(bd(), modulo))
  ipcMain.handle(CANALES.entregasCrear, (_e, entrada: EntregaEntrada) =>
    crearEntrega(bd(), entrada)
  )
  ipcMain.handle(CANALES.entregasActualizar, (_e, id: number, entrada: EntregaEntrada) =>
    actualizarEntrega(bd(), id, entrada)
  )
  ipcMain.handle(CANALES.entregasBorrar, (_e, id: number) => borrarEntrega(bd(), id))
  ipcMain.handle(CANALES.entregasCriterios, (_e, id: number) => listarCriteriosDeEntrega(bd(), id))
  ipcMain.handle(
    CANALES.entregasMapear,
    (_e, id: number, ceIds: number[], pesos: Record<number, number>) =>
      mapearCriterios(bd(), id, ceIds, pesos ?? {})
  )
  ipcMain.handle(CANALES.entregasCriteriosDisponibles, (_e, modulo: string) =>
    criteriosDisponibles(bd(), modulo)
  )

  // Notas y calificaciones.
  ipcMain.handle(CANALES.notasRegistrar, (_e, entrada: NotaRegistro) =>
    registrarNotaDe(
      bd(),
      entrada.entregaId,
      entrada.alumnoId,
      entrada.ce_id,
      entrada.nota,
      entrada.comentario
    )
  )
  ipcMain.handle(
    CANALES.notasRegistrarEntrega,
    (_e, entregaId: number, alumnoId: number, nota: number | null) =>
      registrarNotaEntrega(bd(), entregaId, alumnoId, nota)
  )
  ipcMain.handle(CANALES.notasDetalle, (_e, entregaId: number, alumnoId: number) =>
    notasDe(bd(), entregaId, alumnoId)
  )
  ipcMain.handle(CANALES.notasResumen, (_e, grupoId: number) => resumenModulo(bd(), grupoId))

  // Grupos.
  ipcMain.handle(CANALES.gruposListar, (_e, modulo?: string) => listarGrupos(bd(), modulo))
  ipcMain.handle(CANALES.gruposCrear, (_e, entrada: GrupoEntrada) => crearGrupo(bd(), entrada))
  ipcMain.handle(CANALES.gruposActualizar, (_e, id: number, entrada: GrupoEntrada) =>
    actualizarGrupo(bd(), id, entrada)
  )
  ipcMain.handle(CANALES.gruposBorrar, (_e, id: number) => borrarGrupo(bd(), id))

  // Cursos académicos: nivel superior de los grupos de clase.
  ipcMain.handle(CANALES.cursosAcademicosListar, () => listarCursosAcademicos(bd()))
  ipcMain.handle(CANALES.cursosAcademicosActual, () => obtenerCursoActual(bd()))
  ipcMain.handle(CANALES.cursosAcademicosAsegurarActual, () => asegurarCursoActual(bd()))
  ipcMain.handle(CANALES.cursosAcademicosCrear, (_e, entrada: CursoAcademicoEntrada) =>
    crearCursoAcademico(bd(), entrada)
  )
  ipcMain.handle(
    CANALES.cursosAcademicosActualizar,
    (_e, id: number, entrada: CursoAcademicoEntrada) => actualizarCursoAcademico(bd(), id, entrada)
  )
  ipcMain.handle(CANALES.cursosAcademicosMarcarActual, (_e, id: number) =>
    marcarCursoActual(bd(), id)
  )
  ipcMain.handle(CANALES.cursosAcademicosBorrar, (_e, id: number) => borrarCursoAcademico(bd(), id))

  // Grupos de clase (FP): la unidad de trabajo de la sección Grupos.
  ipcMain.handle(CANALES.gruposClaseListar, (_e, cursoAcademicoId?: number) =>
    listarGruposClase(bd(), cursoAcademicoId)
  )
  ipcMain.handle(CANALES.gruposClaseCrear, (_e, entrada: GrupoClaseEntrada) =>
    crearGrupoClase(bd(), entrada)
  )
  ipcMain.handle(CANALES.gruposClaseActualizar, (_e, id: number, entrada: GrupoClaseEntrada) =>
    actualizarGrupoClase(bd(), id, entrada)
  )
  ipcMain.handle(CANALES.gruposClaseBorrar, (_e, id: number) => borrarGrupoClase(bd(), id))
  ipcMain.handle(CANALES.matriculasClaseImportar, (_e, grupoClaseId: number, texto: string) =>
    importarAlumnosEnGrupoClase(bd(), grupoClaseId, texto)
  )

  // Criterios de calificación por grupo de clase.
  ipcMain.handle(CANALES.criteriosObtener, (_e, grupoClaseId: number) =>
    obtenerCriterios(bd(), grupoClaseId)
  )
  ipcMain.handle(CANALES.criteriosGuardar, (_e, grupoClaseId: number, modelo: ModeloEvaluacion) =>
    guardarCriterios(bd(), grupoClaseId, modelo)
  )
  ipcMain.handle(CANALES.criteriosPlantillaParaGrupo, (_e, grupoClaseId: number) =>
    plantillaParaGrupo(bd(), grupoClaseId)
  )
  ipcMain.handle(
    CANALES.criteriosCrearPlantilla,
    (_e, grupoClaseId: number, modelo: ModeloEvaluacion) =>
      crearPlantillaDesdeGrupo(bd(), grupoClaseId, modelo)
  )
  ipcMain.handle(CANALES.criteriosListarPlantillas, () => listarPlantillas(bd()))
  ipcMain.handle(CANALES.criteriosObtenerPlantilla, (_e, id: number) => obtenerPlantilla(bd(), id))
  ipcMain.handle(CANALES.criteriosGuardarPlantilla, (_e, id: number, modelo: ModeloEvaluacion) =>
    guardarPlantilla(bd(), id, modelo)
  )
  ipcMain.handle(CANALES.criteriosBorrarPlantilla, (_e, id: number) => borrarPlantilla(bd(), id))

  // Programación de aula por grupo.
  ipcMain.handle(CANALES.programacionListar, (_e, grupoClaseId: number) =>
    listarProgramacion(bd(), grupoClaseId)
  )
  ipcMain.handle(
    CANALES.programacionGuardar,
    (_e, grupoClaseId: number, filas: ProgramacionEntrada[]) =>
      guardarProgramacion(bd(), grupoClaseId, filas)
  )
  ipcMain.handle(CANALES.programacionExportarPdf, (_e, grupoClaseId: number) =>
    exportarProgramacionPdf(grupoClaseId)
  )

  // Unidades de programación.
  ipcMain.handle(CANALES.unidadesProgramacionListar, (_e, grupoClaseId: number) =>
    listarUnidadesProgramacion(bd(), grupoClaseId)
  )
  ipcMain.handle(
    CANALES.unidadesProgramacionCrear,
    (_e, grupoClaseId: number, entrada: UnidadProgramacionEntrada) =>
      crearUnidadProgramacion(bd(), grupoClaseId, entrada)
  )
  ipcMain.handle(
    CANALES.unidadesProgramacionActualizar,
    (_e, id: number, entrada: UnidadProgramacionEntrada) =>
      actualizarUnidadProgramacion(bd(), id, entrada)
  )
  ipcMain.handle(CANALES.unidadesProgramacionBorrar, (_e, id: number) =>
    borrarUnidadProgramacion(bd(), id)
  )
  ipcMain.handle(CANALES.unidadesProgramacionImportar, (_e, grupoClaseId: number, texto: string) =>
    importarUnidadesProgramacion(bd(), grupoClaseId, texto)
  )

  // Calendario escolar por curso académico.
  ipcMain.handle(CANALES.calendarioEscolarListar, (_e, cursoAcademicoId: number) =>
    listarCalendarioEscolar(bd(), cursoAcademicoId)
  )
  ipcMain.handle(CANALES.calendarioEscolarImportar, (_e, cursoAcademicoId: number, texto: string) =>
    importarCalendarioEscolar(bd(), cursoAcademicoId, texto)
  )
  ipcMain.handle(CANALES.calendarioEscolarVaciar, (_e, cursoAcademicoId: number) =>
    vaciarCalendarioEscolar(bd(), cursoAcademicoId)
  )
  ipcMain.handle(CANALES.criteriosCopiar, (_e, grupoClaseId: number) =>
    copiarCriteriosMismoModulo(bd(), grupoClaseId)
  )

  // Evaluación (modelo configurable por grupo).
  ipcMain.handle(CANALES.evaluacionModelo, (_e, grupoId: number) => obtenerModelo(bd(), grupoId))
  ipcMain.handle(CANALES.evaluacionGuardarModelo, (_e, grupoId: number, modelo: ModeloEvaluacion) =>
    guardarModeloDeGrupo(bd(), grupoId, modelo)
  )
  ipcMain.handle(CANALES.evaluacionAplicarTodos, (_e, cicloId: string, modelo: ModeloEvaluacion) =>
    aplicarModeloATodos(bd(), cicloId, modelo)
  )
  ipcMain.handle(CANALES.evaluacionPorDefecto, (_e, modalidad: Modalidad) =>
    modeloPorDefecto(modalidad)
  )
  ipcMain.handle(CANALES.evaluacionResumen, (_e, grupoId: number) =>
    resumenEvaluacion(bd(), grupoId)
  )

  // Cobertura del BOE.
  ipcMain.handle(CANALES.coberturaModulo, (_e, modulo: string) => coberturaModulo(bd(), modulo))

  // Informes.
  ipcMain.handle(CANALES.informesHtml, (_e, grupoId: number, alumnoId?: number) =>
    informeHtml(grupoId, alumnoId)
  )
  ipcMain.handle(CANALES.informesPdf, (_e, grupoId: number, alumnoId?: number) =>
    exportarPdf(grupoId, alumnoId)
  )
  ipcMain.handle(CANALES.informesCsv, (_e, grupoId: number) => exportarCsv(grupoId))

  // Copias de seguridad por grupo.
  ipcMain.handle(CANALES.backupEstado, () => estadoBackup())
  ipcMain.handle(CANALES.backupElegirCarpeta, () => elegirCarpetaBackup())
  ipcMain.handle(CANALES.backupCarpetaRecomendada, () => usarCarpetaRecomendada())
  ipcMain.handle(CANALES.backupAbrirCarpeta, () => abrirCarpetaBackup())
  ipcMain.handle(CANALES.backupListar, () => listarBackups())
  ipcMain.handle(CANALES.backupCrear, (_e, grupoClaseId: number) => crearBackupGrupo(grupoClaseId))
  ipcMain.handle(CANALES.backupCrearTodos, () => crearBackupsTodos())
  ipcMain.handle(CANALES.backupImportar, (_e, ruta?: string) => importarBackupConDialogo(ruta))
  // Se conserva el canal automático para poder lanzarlo desde pruebas o ajustes.
  ipcMain.handle('backup:automatico', () => backupAutomatico())

  // Control de faltas por curso.
  ipcMain.handle(CANALES.faltasCursos, () => listarCursosFaltas(bd()))
  ipcMain.handle(
    CANALES.faltasObtenerCurso,
    (_e, clave: import('@shared/tipos').ClaveCursoFaltas) => obtenerCursoFaltas(bd(), clave)
  )
  ipcMain.handle(
    CANALES.faltasGuardarModulo,
    (_e, grupoClaseId: number, nombreInforme: string, horas: number) =>
      guardarModuloFaltas(bd(), grupoClaseId, nombreInforme, horas)
  )
  ipcMain.handle(
    CANALES.faltasGuardarAjustes,
    (
      _e,
      clave: import('@shared/tipos').ClaveCursoFaltas,
      limite: number,
      incluirJustificadas: boolean
    ) => guardarAjustesFaltas(bd(), clave, limite, incluirJustificadas)
  )
  ipcMain.handle(
    CANALES.faltasListarInformes,
    (_e, clave: import('@shared/tipos').ClaveCursoFaltas) => listarInformesFaltas(bd(), clave)
  )
  ipcMain.handle(CANALES.faltasObtenerInforme, (_e, id: number) => obtenerInformeFaltas(bd(), id))
  ipcMain.handle(
    CANALES.faltasImportarInforme,
    (
      _e,
      clave: import('@shared/tipos').ClaveCursoFaltas,
      archivo: string,
      datos: import('@shared/tipos').InformeFaltasDatos
    ) => importarInformeFaltas(bd(), clave, archivo, datos)
  )
}
