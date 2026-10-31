import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { CANALES, type Api } from '@shared/tipos'

// Contrato IPC tipado: única vía por la que el renderer llega al proceso principal.
const api: Api = {
  app: {
    version: () => ipcRenderer.invoke(CANALES.appVersion)
  },
  configuracion: {
    obtener: () => ipcRenderer.invoke(CANALES.configuracionObtener),
    guardar: (configuracion) => ipcRenderer.invoke(CANALES.configuracionGuardar, configuracion),
    cabeceraDocumento: () => ipcRenderer.invoke(CANALES.configuracionCabeceraDocumento),
    pieDocumento: () => ipcRenderer.invoke(CANALES.configuracionPieDocumento)
  },
  boe: {
    listarCiclos: () => ipcRenderer.invoke(CANALES.boeListarCiclos),
    obtenerCiclo: (id) => ipcRenderer.invoke(CANALES.boeObtenerCiclo, id),
    obtenerModulo: (codigo) => ipcRenderer.invoke(CANALES.boeObtenerModulo, codigo),
    guardarPesosRa: (modulo, pesos) => ipcRenderer.invoke(CANALES.boeGuardarPesosRa, modulo, pesos)
  },
  catalogo: {
    listar: () => ipcRenderer.invoke(CANALES.catalogoListar)
  },
  bd: {
    estado: () => ipcRenderer.invoke(CANALES.bdEstado),
    listarModulos: (cicloId) => ipcRenderer.invoke(CANALES.bdListarModulos, cicloId),
    vaciar: () => ipcRenderer.invoke(CANALES.bdVaciar)
  },
  alumnos: {
    listar: (grupoId) => ipcRenderer.invoke(CANALES.alumnosListar, grupoId),
    crear: (entrada) => ipcRenderer.invoke(CANALES.alumnosCrear, entrada),
    actualizar: (id, entrada) => ipcRenderer.invoke(CANALES.alumnosActualizar, id, entrada),
    borrar: (id) => ipcRenderer.invoke(CANALES.alumnosBorrar, id),
    desmatricular: (alumnoId, grupoId) =>
      ipcRenderer.invoke(CANALES.alumnosDesmatricular, alumnoId, grupoId),
    importar: (texto, grupoId) => ipcRenderer.invoke(CANALES.alumnosImportar, texto, grupoId),
    importarFichero: (grupoId) => ipcRenderer.invoke(CANALES.alumnosImportarFichero, grupoId)
  },
  alumnosClase: {
    listar: (grupoClaseId) => ipcRenderer.invoke(CANALES.alumnosClaseListar, grupoClaseId),
    crear: (grupoClaseId, entrada) =>
      ipcRenderer.invoke(CANALES.alumnosClaseCrear, grupoClaseId, entrada),
    actualizar: (id, entrada) => ipcRenderer.invoke(CANALES.alumnosClaseActualizar, id, entrada),
    activar: (id, activo) => ipcRenderer.invoke(CANALES.alumnosClaseActivar, id, activo),
    desmatricular: (grupoClaseId, alumnoId) =>
      ipcRenderer.invoke(CANALES.alumnosClaseDesmatricular, grupoClaseId, alumnoId)
  },
  entregasClase: {
    listar: (grupoClaseId) => ipcRenderer.invoke(CANALES.entregasClaseListar, grupoClaseId),
    crear: (grupoClaseId, entrada) =>
      ipcRenderer.invoke(CANALES.entregasClaseCrear, grupoClaseId, entrada),
    actualizar: (id, entrada) => ipcRenderer.invoke(CANALES.entregasClaseActualizar, id, entrada),
    borrar: (id) => ipcRenderer.invoke(CANALES.entregasClaseBorrar, id),
    bloquear: (id, bloqueada) => ipcRenderer.invoke(CANALES.entregasClaseBloquear, id, bloqueada),
    criterios: (grupoClaseId) => ipcRenderer.invoke(CANALES.entregasClaseCriterios, grupoClaseId),
    vistaPrevia: (grupoClaseId, opciones) =>
      ipcRenderer.invoke(CANALES.entregasClaseVistaPrevia, grupoClaseId, opciones),
    exportar: (grupoClaseId, opciones) =>
      ipcRenderer.invoke(CANALES.entregasClaseExportar, grupoClaseId, opciones)
  },
  eventosEvaluacion: {
    listar: (grupoClaseId) => ipcRenderer.invoke(CANALES.eventosEvaluacionListar, grupoClaseId),
    crear: (grupoClaseId, entrada) =>
      ipcRenderer.invoke(CANALES.eventosEvaluacionCrear, grupoClaseId, entrada),
    actualizar: (id, entrada) =>
      ipcRenderer.invoke(CANALES.eventosEvaluacionActualizar, id, entrada),
    borrar: (id) => ipcRenderer.invoke(CANALES.eventosEvaluacionBorrar, id),
    importar: (grupoClaseId, texto) =>
      ipcRenderer.invoke(CANALES.eventosEvaluacionImportar, grupoClaseId, texto)
  },
  formacionEmpresa: {
    listar: (grupoClaseId, alumnoId) =>
      ipcRenderer.invoke(CANALES.formacionEmpresaListar, grupoClaseId, alumnoId),
    crear: (grupoClaseId, alumnoId, entrada) =>
      ipcRenderer.invoke(CANALES.formacionEmpresaCrear, grupoClaseId, alumnoId, entrada),
    actualizar: (id, entrada) =>
      ipcRenderer.invoke(CANALES.formacionEmpresaActualizar, id, entrada),
    borrar: (id) => ipcRenderer.invoke(CANALES.formacionEmpresaBorrar, id)
  },
  convocatorias: {
    listar: (grupoClaseId) => ipcRenderer.invoke(CANALES.convocatoriasListar, grupoClaseId),
    obtener: (id) => ipcRenderer.invoke(CANALES.convocatoriasObtener, id),
    crear: (grupoClaseId, entrada) =>
      ipcRenderer.invoke(CANALES.convocatoriasCrear, grupoClaseId, entrada),
    actualizar: (id, entrada) => ipcRenderer.invoke(CANALES.convocatoriasActualizar, id, entrada),
    borrar: (id) => ipcRenderer.invoke(CANALES.convocatoriasBorrar, id),
    crearBloque: (convocatoriaId, entrada) =>
      ipcRenderer.invoke(CANALES.convocatoriasCrearBloque, convocatoriaId, entrada),
    actualizarBloque: (id, entrada) =>
      ipcRenderer.invoke(CANALES.convocatoriasActualizarBloque, id, entrada),
    borrarBloque: (id) => ipcRenderer.invoke(CANALES.convocatoriasBorrarBloque, id),
    guardarAsignaciones: (convocatoriaId, asignaciones) =>
      ipcRenderer.invoke(CANALES.convocatoriasGuardarAsignaciones, convocatoriaId, asignaciones)
  },
  presentacion: {
    obtener: () => ipcRenderer.invoke(CANALES.presentacionObtener),
    guardar: (config) => ipcRenderer.invoke(CANALES.presentacionGuardar, config)
  },
  normativaFpt: {
    leer: () => ipcRenderer.invoke(CANALES.normativaFptLeer),
    importar: (html) => ipcRenderer.invoke(CANALES.normativaFptImportar, html),
    restaurar: () => ipcRenderer.invoke(CANALES.normativaFptRestaurar)
  },
  evidenciasClase: {
    listar: (grupoClaseId, entregaId) =>
      ipcRenderer.invoke(CANALES.evidenciasClaseListar, grupoClaseId, entregaId),
    subir: (grupoClaseId, entregaId, archivos) =>
      ipcRenderer.invoke(CANALES.evidenciasClaseSubir, grupoClaseId, entregaId, archivos),
    borrar: (id) => ipcRenderer.invoke(CANALES.evidenciasClaseBorrar, id)
  },
  notasClase: {
    listar: (grupoClaseId) => ipcRenderer.invoke(CANALES.notasClaseListar, grupoClaseId),
    guardar: (grupoClaseId, alumnoId, notas) =>
      ipcRenderer.invoke(CANALES.notasClaseGuardar, grupoClaseId, alumnoId, notas)
  },
  grupos: {
    listar: (modulo) => ipcRenderer.invoke(CANALES.gruposListar, modulo),
    crear: (entrada) => ipcRenderer.invoke(CANALES.gruposCrear, entrada),
    actualizar: (id, entrada) => ipcRenderer.invoke(CANALES.gruposActualizar, id, entrada),
    borrar: (id) => ipcRenderer.invoke(CANALES.gruposBorrar, id)
  },
  cursosAcademicos: {
    listar: () => ipcRenderer.invoke(CANALES.cursosAcademicosListar),
    actual: () => ipcRenderer.invoke(CANALES.cursosAcademicosActual),
    asegurarActual: () => ipcRenderer.invoke(CANALES.cursosAcademicosAsegurarActual),
    crear: (entrada) => ipcRenderer.invoke(CANALES.cursosAcademicosCrear, entrada),
    actualizar: (id, entrada) =>
      ipcRenderer.invoke(CANALES.cursosAcademicosActualizar, id, entrada),
    marcarActual: (id) => ipcRenderer.invoke(CANALES.cursosAcademicosMarcarActual, id),
    borrar: (id) => ipcRenderer.invoke(CANALES.cursosAcademicosBorrar, id)
  },
  gruposClase: {
    listar: (cursoAcademicoId) => ipcRenderer.invoke(CANALES.gruposClaseListar, cursoAcademicoId),
    crear: (entrada) => ipcRenderer.invoke(CANALES.gruposClaseCrear, entrada),
    actualizar: (id, entrada) => ipcRenderer.invoke(CANALES.gruposClaseActualizar, id, entrada),
    borrar: (id) => ipcRenderer.invoke(CANALES.gruposClaseBorrar, id)
  },
  matriculasClase: {
    importar: (grupoClaseId, texto) =>
      ipcRenderer.invoke(CANALES.matriculasClaseImportar, grupoClaseId, texto)
  },
  criterios: {
    obtener: (grupoClaseId) => ipcRenderer.invoke(CANALES.criteriosObtener, grupoClaseId),
    guardar: (grupoClaseId, modelo) =>
      ipcRenderer.invoke(CANALES.criteriosGuardar, grupoClaseId, modelo),
    plantillaParaGrupo: (grupoClaseId) =>
      ipcRenderer.invoke(CANALES.criteriosPlantillaParaGrupo, grupoClaseId),
    crearPlantillaDesdeGrupo: (grupoClaseId, modelo) =>
      ipcRenderer.invoke(CANALES.criteriosCrearPlantilla, grupoClaseId, modelo),
    listarPlantillas: () => ipcRenderer.invoke(CANALES.criteriosListarPlantillas),
    obtenerPlantilla: (id) => ipcRenderer.invoke(CANALES.criteriosObtenerPlantilla, id),
    guardarPlantilla: (id, modelo) =>
      ipcRenderer.invoke(CANALES.criteriosGuardarPlantilla, id, modelo),
    borrarPlantilla: (id) => ipcRenderer.invoke(CANALES.criteriosBorrarPlantilla, id),
    copiar: (grupoClaseId) => ipcRenderer.invoke(CANALES.criteriosCopiar, grupoClaseId)
  },
  programacion: {
    listar: (grupoClaseId) => ipcRenderer.invoke(CANALES.programacionListar, grupoClaseId),
    guardar: (grupoClaseId, filas) =>
      ipcRenderer.invoke(CANALES.programacionGuardar, grupoClaseId, filas),
    exportarPdf: (grupoClaseId) => ipcRenderer.invoke(CANALES.programacionExportarPdf, grupoClaseId)
  },
  unidadesProgramacion: {
    listar: (grupoClaseId) => ipcRenderer.invoke(CANALES.unidadesProgramacionListar, grupoClaseId),
    crear: (grupoClaseId, entrada) =>
      ipcRenderer.invoke(CANALES.unidadesProgramacionCrear, grupoClaseId, entrada),
    actualizar: (id, entrada) =>
      ipcRenderer.invoke(CANALES.unidadesProgramacionActualizar, id, entrada),
    borrar: (id) => ipcRenderer.invoke(CANALES.unidadesProgramacionBorrar, id),
    importar: (grupoClaseId, texto) =>
      ipcRenderer.invoke(CANALES.unidadesProgramacionImportar, grupoClaseId, texto)
  },
  calendarioEscolar: {
    listar: (cursoAcademicoId) =>
      ipcRenderer.invoke(CANALES.calendarioEscolarListar, cursoAcademicoId),
    importar: (cursoAcademicoId, texto) =>
      ipcRenderer.invoke(CANALES.calendarioEscolarImportar, cursoAcademicoId, texto),
    vaciar: (cursoAcademicoId) =>
      ipcRenderer.invoke(CANALES.calendarioEscolarVaciar, cursoAcademicoId)
  },
  entregas: {
    listar: (modulo) => ipcRenderer.invoke(CANALES.entregasListar, modulo),
    crear: (entrada) => ipcRenderer.invoke(CANALES.entregasCrear, entrada),
    actualizar: (id, entrada) => ipcRenderer.invoke(CANALES.entregasActualizar, id, entrada),
    borrar: (id) => ipcRenderer.invoke(CANALES.entregasBorrar, id),
    criterios: (entregaId) => ipcRenderer.invoke(CANALES.entregasCriterios, entregaId),
    mapear: (entregaId, ceIds, pesos) =>
      ipcRenderer.invoke(CANALES.entregasMapear, entregaId, ceIds, pesos ?? {}),
    criteriosDisponibles: (modulo) =>
      ipcRenderer.invoke(CANALES.entregasCriteriosDisponibles, modulo)
  },
  notas: {
    registrar: (entrada) => ipcRenderer.invoke(CANALES.notasRegistrar, entrada),
    registrarEntrega: (entregaId, alumnoId, nota) =>
      ipcRenderer.invoke(CANALES.notasRegistrarEntrega, entregaId, alumnoId, nota),
    detalle: (entregaId, alumnoId) => ipcRenderer.invoke(CANALES.notasDetalle, entregaId, alumnoId),
    resumen: (modulo) => ipcRenderer.invoke(CANALES.notasResumen, modulo)
  },
  evaluacion: {
    modelo: (grupoId) => ipcRenderer.invoke(CANALES.evaluacionModelo, grupoId),
    guardarModelo: (grupoId, modelo) =>
      ipcRenderer.invoke(CANALES.evaluacionGuardarModelo, grupoId, modelo),
    aplicarATodos: (cicloId, modelo) =>
      ipcRenderer.invoke(CANALES.evaluacionAplicarTodos, cicloId, modelo),
    porDefecto: (modalidad) => ipcRenderer.invoke(CANALES.evaluacionPorDefecto, modalidad),
    resumen: (grupoId) => ipcRenderer.invoke(CANALES.evaluacionResumen, grupoId)
  },
  cobertura: {
    modulo: (modulo) => ipcRenderer.invoke(CANALES.coberturaModulo, modulo)
  },
  informes: {
    html: (grupoId, alumnoId) => ipcRenderer.invoke(CANALES.informesHtml, grupoId, alumnoId),
    exportarPdf: (grupoId, alumnoId) => ipcRenderer.invoke(CANALES.informesPdf, grupoId, alumnoId),
    exportarCsv: (grupoId) => ipcRenderer.invoke(CANALES.informesCsv, grupoId)
  },
  faltas: {
    cursos: () => ipcRenderer.invoke(CANALES.faltasCursos),
    obtenerCurso: (clave) => ipcRenderer.invoke(CANALES.faltasObtenerCurso, clave),
    guardarModulo: (clave, moduloCodigo, nombreInforme, horas) =>
      ipcRenderer.invoke(CANALES.faltasGuardarModulo, clave, moduloCodigo, nombreInforme, horas),
    guardarAjustes: (clave, limite, incluirJustificadas) =>
      ipcRenderer.invoke(CANALES.faltasGuardarAjustes, clave, limite, incluirJustificadas),
    listarInformes: (clave) => ipcRenderer.invoke(CANALES.faltasListarInformes, clave),
    obtenerInforme: (id) => ipcRenderer.invoke(CANALES.faltasObtenerInforme, id),
    ultimoAlumno: (grupoClaseId, alumnoId) =>
      ipcRenderer.invoke(CANALES.faltasUltimoAlumno, grupoClaseId, alumnoId),
    importarInforme: (clave, archivo, datos) =>
      ipcRenderer.invoke(CANALES.faltasImportarInforme, clave, archivo, datos)
  },
  backup: {
    estado: () => ipcRenderer.invoke(CANALES.backupEstado),
    elegirCarpeta: () => ipcRenderer.invoke(CANALES.backupElegirCarpeta),
    usarCarpetaRecomendada: () => ipcRenderer.invoke(CANALES.backupCarpetaRecomendada),
    abrirCarpeta: () => ipcRenderer.invoke(CANALES.backupAbrirCarpeta),
    listar: () => ipcRenderer.invoke(CANALES.backupListar),
    crear: (grupoClaseId) => ipcRenderer.invoke(CANALES.backupCrear, grupoClaseId),
    crearTodos: () => ipcRenderer.invoke(CANALES.backupCrearTodos),
    importar: (ruta) => ipcRenderer.invoke(CANALES.backupImportar, ruta)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (definido en index.d.ts)
  window.electron = electronAPI
  // @ts-ignore (definido en index.d.ts)
  window.api = api
}
