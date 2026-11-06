/**
 * Prueba E2E del flujo completo.
 *
 * Arranca el **proceso principal real** con una base de datos aislada en un
 * directorio temporal (no toca los datos reales) y ejercita de punta a punta:
 * canal IPC, siembra del BOE, grupos, alumnado, entregas, mapeo a CE, notas,
 * modelo de evaluación por grupo, ingesta del curso e informes.
 *
 *   npm run build && npm run smoke
 */
import { app, BrowserWindow } from 'electron'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const raiz = process.cwd()

// Base de datos aislada: la prueba no debe tocar los datos reales del usuario.
const dirDatos = mkdtempSync(join(tmpdir(), 'ge-smoke-'))
app.setPath('userData', dirDatos)

// El main real leerá esta variable y no mostrará la ventana.
process.env.GE_VENTANA_OCULTA = '1'

const rescate = setTimeout(() => {
  console.error('[smoke-app] ERROR: tiempo agotado')
  app.exit(1)
}, 90000)

let fallos = 0

function comprobar(nombre, condicion, detalle = '') {
  console.log(
    `[smoke-app] ${condicion ? 'OK  ' : 'FALLO'} ${nombre}${detalle ? ` → ${detalle}` : ''}`
  )
  if (!condicion) fallos++
}

async function esperarVentana() {
  for (let i = 0; i < 150; i++) {
    const ventanas = BrowserWindow.getAllWindows()
    if (ventanas.length > 0 && !ventanas[0].webContents.isLoading()) return ventanas[0]
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error('no apareció ninguna ventana')
}

async function principal() {
  try {
    const main = join(raiz, 'out/main/index.js')
    if (!existsSync(main)) {
      console.error(`[smoke-app] ERROR: falta ${main}. Ejecuta "npm run build" antes.`)
      app.exit(1)
      return
    }

    await import(pathToFileURL(main).href)
    const win = await esperarVentana()
    const ev = (expr) => win.webContents.executeJavaScript(expr)

    /* --- Canal IPC y datos del BOE --------------------------------- */
    comprobar('window.api disponible', (await ev('typeof window.api')) === 'object')
    comprobar(
      'sin carga de datos de prueba en la aplicación',
      (await ev('typeof window.api.demo')) === 'undefined'
    )

    const ciclos = await ev('window.api.boe.listarCiclos()')
    const daw = ciclos.find((ciclo) => ciclo.id === 'daw')
    comprobar(
      'catálogo completo con especializaciones, DAW con 20 módulos',
      ciclos.length === 217 && daw?.modulos === 20,
      `${ciclos.length} ciclos · DAW ${daw?.modulos ?? 0} módulos`
    )

    const catalogo = await ev('window.api.catalogo.listar()')
    comprobar(
      'catálogo oficial de horarios y especializaciones cargado',
      catalogo.length === 217 &&
        catalogo.find((ciclo) => ciclo.id === 'daw')?.modulos.length === 17,
      `${catalogo.length} ciclos`
    )

    const estado = await ev('window.api.bd.estado()')
    comprobar(
      'BD sembrada con todos los currículos',
      estado.modulos >= 1600 && estado.ra >= 8000 && estado.ce >= 60000,
      `${estado.modulos} módulos · ${estado.ra} RA · ${estado.ce} CE`
    )
    comprobar('BD aislada en directorio temporal', estado.ruta.startsWith(dirDatos))

    /* --- Importación de currículos con esquema ---------------------- */
    const curriculoPrueba = JSON.stringify({
      id: 'smoke-test',
      denominacion: 'Ciclo de prueba de importación',
      nivel: 'Formación Profesional de Grado Superior',
      familia_profesional: 'Informática y Comunicaciones',
      abreviatura: 'SMK',
      modulos: [
        {
          codigo: 'T999',
          nombre: 'Módulo de prueba',
          curso: '1',
          ra: [
            {
              codigo: 'RA1',
              numero: 1,
              descripcion: 'RA de prueba',
              ce: [{ codigo: 'a', descripcion: 'CE de prueba' }]
            }
          ]
        }
      ]
    })
    const importado = await ev(`window.api.curriculos.importar(${JSON.stringify(curriculoPrueba)})`)
    comprobar(
      'importa un currículo con el esquema',
      importado.ciclos === 1 &&
        importado.modulos === 1 &&
        importado.ra === 1 &&
        importado.ce === 1 &&
        importado.errores.length === 0,
      JSON.stringify(importado)
    )
    const importadoCiclo = await ev(`window.api.boe.obtenerCiclo('smoke-test')`)
    comprobar(
      'el currículo importado se puede consultar',
      importadoCiclo?.modulos?.[0]?.ra?.[0]?.ce?.[0]?.descripcion === 'CE de prueba'
    )

    /* --- Grupos: el mismo módulo en dos modalidades ---------------- */
    const presencial = await ev(
      `window.api.grupos.crear({ modulo_codigo: '0613', nombre: 'Presencial', modalidad: 'presencial' })`
    )
    const semipresencial = await ev(
      `window.api.grupos.crear({ modulo_codigo: '0613', nombre: 'Semipresencial', modalidad: 'semipresencial' })`
    )
    comprobar(
      'dos grupos del mismo módulo',
      presencial.id !== semipresencial.id && presencial.modulo_codigo === '0613'
    )

    /* --- Grupos de clase (sección Grupos) --------------------------- */
    const clase = await ev(
      `window.api.gruposClase.crear({ ciclo_id: 'daw', curso: '2', modalidad: 'presencial', modulo_codigo: '0613' })`
    )
    comprobar(
      'grupo de clase creado con nombre generado',
      clase.nombre === '2º DAW · DWES · Presencial' && clase.modulo_siglas === 'DWES',
      clase.nombre
    )
    comprobar(
      'el grupo muestra alumnado y RA/CE del módulo',
      clase.alumnos === 0 && clase.ra === 9 && clase.ce === 66,
      `${clase.alumnos} alumnos · ${clase.ra} RA · ${clase.ce} CE`
    )
    const cursoActual = await ev('window.api.cursosAcademicos.asegurarActual()')
    comprobar(
      'el grupo se asigna al curso académico calculado por la fecha',
      clase.curso_academico_id === cursoActual.id &&
        clase.curso_academico_nombre === cursoActual.nombre,
      cursoActual.nombre
    )
    let cursoManual = false
    try {
      await ev(`window.api.cursosAcademicos.crear({ nombre: '1999/2000' })`)
    } catch {
      cursoManual = true
    }
    comprobar('no se puede crear un curso fuera del actual', cursoManual)
    const modulo = await ev(`window.api.boe.obtenerModulo('0613')`)
    comprobar(
      'el módulo se carga con sus RA y CE',
      modulo?.ra.length === 9 && modulo.ra[0].ce.length > 0,
      `${modulo?.ra.length} RA`
    )
    let duplicado = false
    try {
      await ev(
        `window.api.gruposClase.crear({ ciclo_id: 'daw', curso: '2', modalidad: 'presencial', modulo_codigo: '0613' })`
      )
    } catch {
      duplicado = true
    }
    comprobar('no se puede duplicar el mismo grupo', duplicado)
    comprobar(
      'el grupo de clase se lista',
      (await ev('window.api.gruposClase.listar()')).length === 1
    )

    const textoAlumnos = JSON.stringify('nombre,apellidos,dni\nAna,García,11111111H\nLuis,Pérez,')
    const importados = await ev(`window.api.matriculasClase.importar(${clase.id}, ${textoAlumnos})`)
    comprobar(
      'importa alumnado en el grupo de clase',
      importados.creados === 2 && (await ev('window.api.gruposClase.listar()'))[0].alumnos === 2,
      `${importados.creados} creados`
    )
    const repetidos = await ev(`window.api.matriculasClase.importar(${clase.id}, ${textoAlumnos})`)
    comprobar(
      'no duplica al alumnado ya importado',
      repetidos.creados === 0 &&
        repetidos.existentes === 2 &&
        (await ev('window.api.gruposClase.listar()'))[0].alumnos === 2
    )

    /* --- Alumnado del grupo de clase ------------------------------- */
    const altaManual = await ev(
      `window.api.alumnosClase.crear(${clase.id}, { nombre: 'Nuevo', apellidos: 'Alumno', dni: '33333333P' })`
    )
    comprobar('alta manual de alumnado', altaManual.creado === true)
    const altaRepetida = await ev(
      `window.api.alumnosClase.crear(${clase.id}, { nombre: 'Nuevo', apellidos: 'Alumno', dni: '33333333P' })`
    )
    comprobar('no duplica el alta por DNI', altaRepetida.creado === false)
    const desactivado = await ev(`window.api.alumnosClase.activar(${altaManual.alumno.id}, false)`)
    comprobar(
      'desactivar mantiene la matrícula',
      desactivado.activo === false &&
        (await ev(`window.api.alumnosClase.listar(${clase.id})`)).length === 3
    )
    await ev(`window.api.alumnosClase.activar(${altaManual.alumno.id}, true)`)
    const quitado = await ev(
      `window.api.alumnosClase.desmatricular(${clase.id}, ${altaManual.alumno.id})`
    )
    comprobar(
      'quitar del grupo no borra al alumno',
      quitado === true &&
        (await ev(`window.api.alumnosClase.listar(${clase.id})`)).length === 2 &&
        (await ev(
          `window.api.alumnosClase.actualizar(${altaManual.alumno.id}, { nombre: 'Nuevo', apellidos: 'Alumno', dni: '33333333P' })`
        )) !== null
    )

    /* --- Criterios de calificación --------------------------------- */
    comprobar(
      'el grupo arranca sin criterios',
      (await ev(`window.api.criterios.obtener(${clase.id})`)) === null
    )
    const base = await ev(`window.api.criterios.plantillaParaGrupo(${clase.id})`)
    const plantilla = base.modelo
    comprobar(
      'sin plantilla se usan los valores por defecto de la modalidad',
      base.nombre === null && plantilla.categorias.length === 3
    )
    comprobar(
      'plantilla presencial con avaluaciones, categorías y convocatorias',
      plantilla.avaluaciones.length === 3 &&
        plantilla.categorias.length === 3 &&
        plantilla.convocatorias.extraordinaria === 'suspensas',
      `${plantilla.avaluaciones.length} / ${plantilla.categorias.length}`
    )
    await ev(`window.api.criterios.guardar(${clase.id}, ${JSON.stringify(plantilla)})`)
    comprobar(
      'los criterios se guardan en el grupo',
      (await ev(`window.api.criterios.obtener(${clase.id})`))?.requisitos.length === 4
    )
    const creada = await ev(
      `window.api.criterios.crearPlantillaDesdeGrupo(${clase.id}, ${JSON.stringify(plantilla)})`
    )
    comprobar(
      'crea la plantilla con el nombre del grupo',
      creada.nombre === 'Plantilla 2º DAW · DWES · Presencial',
      creada.nombre
    )
    comprobar(
      'la plantilla se lista y se puede cargar',
      (await ev('window.api.criterios.listarPlantillas()')).length === 1 &&
        (await ev(`window.api.criterios.obtenerPlantilla(${creada.id})`)) !== null
    )

    /* --- Entregas y notas del grupo -------------------------------- */
    const ceClase = await ev(`window.api.entregasClase.criterios(${clase.id})`)
    const entregaClase = await ev(
      `window.api.entregasClase.crear(${clase.id}, { titulo: 'Examen AV1', avaluacion_id: 'AV1', categoria_id: 'examenes', rubrica: 'Criterios de prueba', rubrica_archivo: { nombre: 'rubrica.txt', tipo: 'text/plain', datos: 'SGVsbG8=' }, ce_ids: [${ceClase[0].ceId}, ${ceClase[1].ceId}] })`
    )
    comprobar(
      'entrega de clase con rúbrica y mapeo RA/CE',
      entregaClase.criterios === 2 &&
        entregaClase.rubrica === 'Criterios de prueba' &&
        entregaClase.rubrica_archivo?.nombre === 'rubrica.txt' &&
        (await ev(`window.api.entregasClase.listar(${clase.id})`)).length === 1
    )
    const evidenciasClase = await ev(
      `window.api.evidenciasClase.subir(${clase.id}, ${entregaClase.id}, [{ categoria: 'solucion', nombre: 'solucion.txt', tipo: 'text/plain', tamano: 5, datos: 'SGVsbG8=' }])`
    )
    comprobar(
      'evidencia global de la entrega',
      evidenciasClase.length === 1 &&
        evidenciasClase[0].categoria === 'solucion' &&
        evidenciasClase[0].nombre === 'solucion.txt'
    )
    const alumnoClase = (await ev(`window.api.alumnosClase.listar(${clase.id})`))[0]
    const notasClase = await ev(
      `window.api.notasClase.guardar(${clase.id}, ${alumnoClase.id}, [{ entregaId: ${entregaClase.id}, nota: 7.75, observaciones: 'Anotación de prueba' }])`
    )
    const formacion = await ev(
      `window.api.formacionEmpresa.crear(${clase.id}, ${alumnoClase.id}, { fecha_inicio: '2026-11-10', fecha_fin: '2026-11-20', empresa: 'Acme Web SL' })`
    )
    comprobar(
      'periodo de formación en empresa',
      formacion.empresa === 'Acme Web SL' &&
        (await ev(`window.api.formacionEmpresa.listar(${clase.id}, ${alumnoClase.id})`)).length ===
          1
    )

    const rasFormacion = await ev(
      `window.api.formacionEmpresa.guardarRas(${clase.id}, ${alumnoClase.id}, [{ ra_codigo: 'RA7', tipo: 'total' }, { ra_codigo: 'RA9', tipo: 'parcial' }])`
    )
    comprobar(
      'guarda los RA totales y parciales de formación en empresa',
      rasFormacion.length === 2 &&
        rasFormacion.some((ra) => ra.ra_codigo === 'RA7' && ra.tipo === 'total') &&
        rasFormacion.some((ra) => ra.ra_codigo === 'RA9' && ra.tipo === 'parcial')
    )

    const perdida = await ev(
      `window.api.alumnosClase.marcarPerdidaContinua(${clase.id}, ${alumnoClase.id}, true)`
    )
    comprobar(
      'marca la pérdida de evaluación continua por alumno',
      perdida?.perdida_evaluacion_continua === true
    )
    comprobar(
      'la marca de pérdida de evaluación continua se conserva al listar',
      (await ev(`window.api.alumnosClase.listar(${clase.id})`)).some(
        (item) => item.id === alumnoClase.id && item.perdida_evaluacion_continua
      )
    )

    const eventoOtro = await ev(
      `window.api.eventosEvaluacion.crear(${clase.id}, { tipo: 'otro', titulo: 'Reunión sintética', fecha: '2026-11-21' })`
    )
    comprobar(
      'crea una fecha de tipo otras',
      eventoOtro.tipo === 'otro' &&
        (await ev(`window.api.eventosEvaluacion.listar(${clase.id})`)).some(
          (evento) => evento.id === eventoOtro.id
        )
    )

    const convocatoria = await ev(
      `window.api.convocatorias.crear(${clase.id}, { tipo: 'ordinaria', nombre: 'Ordinaria sintética', fecha: '2026-11-20' })`
    )
    const bloqueGlobal = await ev(
      `window.api.convocatorias.crearBloque(${convocatoria.id}, { nombre: 'Examen global', peso: 100, orden: 0 })`
    )
    const convocatoriaGuardada = await ev(
      `window.api.convocatorias.guardarAsignaciones(${convocatoria.id}, [{ alumnoId: ${alumnoClase.id}, bloqueId: ${bloqueGlobal.id}, nota: 6, observaciones: null, incluida: true }])`
    )
    comprobar(
      'guarda la nota de la convocatoria ordinaria',
      convocatoriaGuardada.asignaciones.some(
        (asignacion) =>
          asignacion.alumno_id === alumnoClase.id &&
          asignacion.bloque_id === bloqueGlobal.id &&
          asignacion.nota === 6 &&
          asignacion.incluida
      )
    )

    const normativaIncluida = await ev('window.api.normativaFpt.leer()')
    comprobar(
      'normativa FP incluida',
      normativaIncluida.origen === 'incluida' &&
        String(normativaIncluida.url).startsWith('normativa://')
    )
    const normativaImportada = await ev(
      `window.api.normativaFpt.importar('<!doctype html><html><body>Prueba</body></html>')`
    )
    comprobar('normativa FP importada', normativaImportada.origen === 'importada')
    const normativaRestaurada = await ev('window.api.normativaFpt.restaurar()')
    comprobar('normativa FP restaurada', normativaRestaurada.origen === 'incluida')
    const cargaNormativa = await ev(`new Promise((resolve) => {
      const marco = document.createElement('iframe')
      marco.style.display = 'none'
      marco.src = 'normativa://app/index.html'
      marco.onload = () => { marco.remove(); resolve('ok') }
      marco.onerror = () => { marco.remove(); resolve('error') }
      document.body.appendChild(marco)
      setTimeout(() => { marco.remove(); resolve('timeout') }, 2500)
    })`)
    comprobar(
      'el iframe de normativa carga por el protocolo interno',
      cargaNormativa === 'ok',
      cargaNormativa
    )

    comprobar(
      'nota decimal y anotación guardadas',
      notasClase.length === 1 &&
        notasClase[0].nota === 7.75 &&
        notasClase[0].observaciones === 'Anotación de prueba'
    )
    const bloqueada = await ev(`window.api.entregasClase.bloquear(${entregaClase.id}, true)`)
    comprobar('entrega bloqueada', bloqueada?.bloqueada === true)
    await ev(`window.api.entregasClase.bloquear(${entregaClase.id}, false)`)

    /* --- Programación de aula --------------------------------------- */
    const programacion = await ev(
      `window.api.programacion.guardar(${clase.id}, ${JSON.stringify([
        { fecha: '2026-10-28', contenido: 'Presentación', desviacion: '', observaciones: '' },
        { fecha: '2026-11-03', contenido: 'UD1', desviacion: 'Sin desviación', observaciones: '' }
      ])})`
    )
    comprobar(
      'programación guardada y ordenada por fecha',
      programacion.length === 2 && programacion[0].fecha === '2026-10-28'
    )
    const programacionEditada = await ev(
      `window.api.programacion.guardar(${clase.id}, ${JSON.stringify([
        {
          id: programacion[0].id,
          fecha: '2026-10-29',
          contenido: 'Presentación (corregida)',
          desviacion: '',
          observaciones: ''
        }
      ])})`
    )
    comprobar(
      'programación actualiza y borra las filas que faltan',
      programacionEditada.length === 1 && programacionEditada[0].fecha === '2026-10-29'
    )

    const claseSemi = await ev(
      `window.api.gruposClase.crear({ ciclo_id: 'daw', curso: '2', modalidad: 'semipresencial', modulo_codigo: '0613' })`
    )
    const copiados = await ev(`window.api.criterios.copiar(${clase.id})`)
    comprobar(
      'copia los criterios al mismo módulo',
      copiados === 1 && (await ev(`window.api.criterios.obtener(${claseSemi.id})`)) !== null,
      `${copiados} copiados`
    )

    /* --- Alumnado por grupo ----------------------------------------- */
    const alumno = await ev(
      `window.api.alumnos.crear({ nombre: 'Alumno', apellidos: 'De Prueba', grupos: [${presencial.id}] })`
    )
    comprobar('alumno matriculado en el grupo presencial', alumno.grupos.includes(presencial.id))

    await ev(
      `window.api.alumnos.crear({ nombre: 'Solo', apellidos: 'Semipresencial', grupos: [${semipresencial.id}] })`
    )

    let enPresencial = await ev(`window.api.alumnos.listar(${presencial.id})`)
    let enSemipresencial = await ev(`window.api.alumnos.listar(${semipresencial.id})`)
    comprobar(
      'cada grupo tiene su propio alumnado',
      enPresencial.length === 1 && enSemipresencial.length === 1,
      `${enPresencial.length} / ${enSemipresencial.length}`
    )

    /* --- Importación del fichero de ejemplo ------------------------- */
    const rutaEjemplo = join(raiz, 'ejemplos', 'alumnos-ejemplo.json')
    if (existsSync(rutaEjemplo)) {
      const contenido = readFileSync(rutaEjemplo, 'utf-8')
      const importados = await ev(
        `window.api.alumnos.importar(${JSON.stringify(contenido)}, ${presencial.id})`
      )
      comprobar(
        'importa el fichero de ejemplo (8 alumnos)',
        importados.creados === 8 && importados.errores.length === 0,
        JSON.stringify(importados)
      )
      enPresencial = await ev(`window.api.alumnos.listar(${presencial.id})`)
      enSemipresencial = await ev(`window.api.alumnos.listar(${semipresencial.id})`)
      comprobar(
        'los 8 van al grupo indicado, no al otro',
        enPresencial.length === 9 && enSemipresencial.length === 1,
        `${enPresencial.length} / ${enSemipresencial.length}`
      )
    } else {
      console.log(`[smoke-app] (omitido) falta ${rutaEjemplo}`)
    }

    /* --- Entregas y mapeo a CE (a nivel de módulo) ------------------ */
    const ce = await ev(`window.api.entregas.criteriosDisponibles('0613')`)
    comprobar('CE del módulo 0613', ce.length === 66, `${ce.length} CE`)

    const entrega = await ev(
      `window.api.entregas.crear({ modulo_codigo: '0613', titulo: 'Examen AV1', tipo: 'examen', avaluacion: 'AV1', categoria: 'examenes' })`
    )
    await ev(`window.api.entregas.mapear(${entrega.id}, [${ce[0].ceId}, ${ce[1].ceId}])`)
    comprobar(
      'entrega creada y mapeada a 2 CE',
      (await ev(`window.api.entregas.criterios(${entrega.id})`)).length === 2
    )

    /* --- Nota por criterios (trazabilidad BOE) ---------------------- */
    await ev(`window.api.boe.guardarPesosRa('0613', { RA1: 100 })`)
    await ev(
      `window.api.notas.registrar({ entregaId: ${entrega.id}, alumnoId: ${alumno.id}, ce_id: ${ce[0].ceId}, nota: 8 })`
    )
    await ev(
      `window.api.notas.registrar({ entregaId: ${entrega.id}, alumnoId: ${alumno.id}, ce_id: ${ce[1].ceId}, nota: 6 })`
    )

    const resumenRa = await ev(`window.api.notas.resumen(${presencial.id})`)
    const filaRa = resumenRa.filas.find((f) => f.alumno.id === alumno.id)
    comprobar('nota por criterios = 7', filaRa.celdas[0].nota === 7, String(filaRa.celdas[0].nota))

    /* --- Modelo de evaluación por grupo ----------------------------- */
    const modeloPresencial = await ev(`window.api.evaluacion.modelo(${presencial.id})`)
    const modeloSemipresencial = await ev(`window.api.evaluacion.modelo(${semipresencial.id})`)
    comprobar(
      'cada grupo arranca con la plantilla de su modalidad',
      modeloPresencial.categorias.some((c) => c.id === 'proyectos') &&
        modeloSemipresencial.categorias.find((c) => c.id === 'examenes')?.peso === 70,
      `${modeloPresencial.categorias.length} / ${modeloSemipresencial.categorias.length} categorías`
    )

    // Se cambia el modelo del grupo semipresencial (70/30) y el presencial no se toca.
    await ev(
      `window.api.evaluacion.guardarModelo(${semipresencial.id}, ${JSON.stringify({
        ...modeloSemipresencial,
        categorias: [
          { id: 'examenes', nombre: 'Exámenes', peso: 70 },
          { id: 'actividades', nombre: 'Actividades', peso: 30 }
        ]
      })})`
    )
    const modeloPresencialDespues = await ev(`window.api.evaluacion.modelo(${presencial.id})`)
    comprobar(
      'el modelo del otro grupo no se ve afectado',
      modeloPresencialDespues.categorias.some((c) => c.id === 'proyectos')
    )

    /* --- Nota directa de la entrega y evaluación -------------------- */
    await ev(`window.api.notas.registrarEntrega(${entrega.id}, ${alumno.id}, 7)`)

    const evaluacion = await ev(`window.api.evaluacion.resumen(${presencial.id})`)
    comprobar('el resumen lleva el grupo', evaluacion.grupo.id === presencial.id)
    const fila = evaluacion.alumnos.find((f) => f.alumno.id === alumno.id)
    comprobar('AV1 = 7', fila.avaluaciones[0].nota === 7, String(fila.avaluaciones[0].nota))
    comprobar(
      'nota final = 7 y apto',
      fila.notaFinal === 7 && fila.aprobado,
      JSON.stringify({ nota: fila.notaFinal, aprobado: fila.aprobado })
    )

    const evaluacionSemipresencial = await ev(`window.api.evaluacion.resumen(${semipresencial.id})`)
    comprobar(
      'el otro grupo solo ve a su alumnado',
      evaluacionSemipresencial.alumnos.length === 1 &&
        evaluacionSemipresencial.alumnos[0].alumno.apellidos === 'Semipresencial'
    )

    /* --- Informes --------------------------------------------------- */
    const html = await ev(`window.api.informes.html(${presencial.id}, ${alumno.id})`)
    comprobar(
      'informe HTML del grupo y del alumno',
      html.length > 2000 && html.includes('De Prueba') && html.includes('0613')
    )

    /* --- Interfaz --------------------------------------------------- */
    win.webContents.reload()
    await new Promise((r) => setTimeout(r, 800))
    const tituloCurso = await ev('document.querySelector(".vista__cabecera h2")?.textContent')
    comprobar(
      'la aplicación abre el calendario del curso',
      tituloCurso === 'Calendario del curso',
      String(tituloCurso)
    )
    await ev(`location.hash = '#/grupo/${clase.id}'`)
    await new Promise((r) => setTimeout(r, 800))
    const tituloDashboard = await ev(
      'document.querySelector(".dashboard__cabecera h2")?.textContent'
    )
    comprobar(
      'la aplicación abre el dashboard del grupo',
      tituloDashboard === clase.nombre,
      String(tituloDashboard)
    )
    comprobar(
      'el dashboard muestra la cola de trabajo y la agenda',
      await ev(
        'document.body.textContent.includes("Cola de trabajo") && document.body.textContent.includes("Agenda y próximas fechas")'
      )
    )

    const clicTexto = async (texto) =>
      ev(`(() => {
        const boton = [...document.querySelectorAll('button')].find(
          (item) => item.textContent.trim() === ${JSON.stringify(texto)}
        )
        if (!boton) return false
        boton.click()
        return true
      })()`)

    const escribir = async (selector, valor) =>
      ev(`(() => {
        const campo = document.querySelector(${JSON.stringify(selector)})
        if (!campo) return false
        const descriptor = Object.getOwnPropertyDescriptor(
          Object.getPrototypeOf(campo), 'value'
        )
        descriptor.set.call(campo, ${JSON.stringify(valor)})
        campo.dispatchEvent(new Event('input', { bubbles: true }))
        campo.dispatchEvent(new Event('change', { bubbles: true }))
        return true
      })()`)

    /* --- Tabla de la quincena y de «Ver todo» ---------------------- */
    await ev(`location.hash = '#/grupo/${clase.id}/programacion'`)
    await new Promise((r) => setTimeout(r, 700))
    comprobar('abre la tabla de Ver todo', await clicTexto('Tabla'))
    comprobar('selecciona Ver todo', await clicTexto('Ver todo'))
    await new Promise((r) => setTimeout(r, 300))
    comprobar(
      'Ver todo muestra la tabla de programación',
      await ev('document.querySelector("table.programacion__tabla") !== null')
    )

    /* --- Guardado de una unidad con fechas ------------------------- */
    await ev(`location.hash = '#/grupo/${clase.id}/programacion-didactica?tab=unidades'`)
    await new Promise((r) => setTimeout(r, 700))
    comprobar('abre el formulario de unidad', await clicTexto('Nueva unidad'))
    await new Promise((r) => setTimeout(r, 200))
    await escribir('#unidad-nombre', 'Unidad sintética')
    await escribir('#unidad-inicio', '2026-11-10')
    await escribir('#unidad-fin', '2026-11-20')
    comprobar('crea la unidad', await clicTexto('Crear unidad'))
    await new Promise((r) => setTimeout(r, 500))
    comprobar(
      'guarda la unidad con fechas sin error de pesos',
      (await ev('document.body.textContent.includes("Unidad creada.")')) &&
        !(await ev('document.body.textContent.includes("Los pesos de las unidades")'))
    )

    /* --- Nota de convocatoria para pérdida de continua ------------ */
    await ev(`location.hash = '#/grupo/${clase.id}/calificaciones?alumno=${alumnoClase.id}'`)
    await new Promise((r) => setTimeout(r, 700))
    comprobar('abre la nota final', await clicTexto('Final'))
    await new Promise((r) => setTimeout(r, 300))
    comprobar(
      'la nota final del alumno con pérdida de continua usa la convocatoria',
      await ev(
        'document.querySelector(".calificaciones__final-nota strong")?.textContent?.trim() === "6,00" && document.body.textContent.includes("ha perdido la evaluación continua")'
      )
    )

    /* --- Auditoría de todas las rutas ----------------------------- */
    const erroresConsola = []
    win.webContents.on('console-message', (_evento, nivel, mensaje) => {
      if (nivel >= 3) erroresConsola.push(String(mensaje))
    })

    const rutas = [
      ['/calendario', 'Calendario del curso'],
      ['/grupos', 'Grupos'],
      ['/cursos', 'Cursos académicos'],
      ['/plantillas', 'Plantillas'],
      ['/backups', 'Copias de seguridad'],
      ['/configuracion', 'Configuración general'],
      ['/guia', 'Guía'],
      ['/normativa', 'Normativa'],
      ['/faltas', 'Control de faltas'],
      [`/grupo/${clase.id}`, clase.nombre],
      [`/grupo/${clase.id}/programacion`, 'Programación de aula'],
      [`/grupo/${clase.id}/horario`, 'Horario'],
      [`/grupo/${clase.id}/programacion-didactica`, 'Programación didáctica'],
      [`/grupo/${clase.id}/programacion-didactica?tab=fechas`, 'Evaluaciones'],
      [`/grupo/${clase.id}/programacion-didactica?tab=criterios`, 'Criterios'],
      [`/grupo/${clase.id}/programacion-didactica?tab=rae`, 'BOE'],
      [`/grupo/${clase.id}/programacion-didactica?tab=presentacion`, 'Presentación'],
      [`/grupo/${clase.id}/criterios`, 'Criterios de calificación'],
      [`/grupo/${clase.id}/alumnado`, 'Alumnado'],
      [`/grupo/${clase.id}/alumnado/${alumnoClase.id}`, 'García'],
      [`/grupo/${clase.id}/alumnado/${alumnoClase.id}/formacion`, 'formación'],
      [`/grupo/${clase.id}/entregas`, 'Entregas'],
      [`/grupo/${clase.id}/entregas/nueva`, 'Nueva entrega'],
      [`/grupo/${clase.id}/entregas/${entregaClase.id}/editar`, 'Editar entrega'],
      [`/grupo/${clase.id}/entregas/${entregaClase.id}/evidencias`, 'Evidencias'],
      [`/grupo/${clase.id}/entregas/${entregaClase.id}`, 'Entrega'],
      [`/grupo/${clase.id}/boe`, 'RA'],
      [`/grupo/${clase.id}/evaluaciones`, 'Evaluaciones'],
      [`/grupo/${clase.id}/calificaciones`, 'Calificaciones'],
      [`/grupo/${clase.id}/convocatorias`, 'Convocatorias'],
      [`/grupo/${clase.id}/informes`, 'Informes']
    ]

    for (const [ruta, texto] of rutas) {
      const antes = erroresConsola.length
      await ev(`location.hash = '#${ruta}'`)
      await new Promise((r) => setTimeout(r, 900))
      const contenido = await ev('document.body.textContent')
      const titulo = await ev(
        'document.querySelector(".vista__cabecera h2, .dashboard__cabecera h2, .seccion__cabecera h3")?.textContent?.trim() ?? ""'
      )
      const errorVisible = await ev(
        'document.querySelector(".aviso--error")?.textContent?.trim() ?? ""'
      )
      const nuevosErrores = erroresConsola.slice(antes)
      comprobar(
        `ruta ${ruta}`,
        contenido.includes(texto) && !errorVisible && nuevosErrores.length === 0,
        JSON.stringify({
          titulo,
          error: errorVisible,
          consola: nuevosErrores.slice(0, 2)
        })
      )
    }

    /* --- Programación de aula: alta y calendario ----------------- */
    await ev(`location.hash = '#/grupo/${clase.id}/programacion'`)
    await new Promise((r) => setTimeout(r, 900))
    comprobar('abre el formulario de un día', await clicTexto('Añadir día'))
    await escribir('#programacion-fecha', '2026-11-12')
    await escribir('#programacion-contenido', 'Sesión sintética de aula')
    comprobar('añade el día a la programación', await clicTexto('Añadir a la programación'))
    await new Promise((r) => setTimeout(r, 300))
    comprobar(
      'la programación marca cambios pendientes',
      await ev('document.body.textContent.includes("Sin guardar")')
    )
    comprobar('guarda la programación', await clicTexto('Guardar programación'))
    await new Promise((r) => setTimeout(r, 900))
    comprobar(
      'el día de programación persiste',
      await ev(
        `window.api.programacion.listar(${clase.id}).then((filas) => filas.some((fila) => fila.fecha === '2026-11-12' && fila.contenido === 'Sesión sintética de aula'))`
      )
    )

    await clicTexto('Calendario')
    await new Promise((r) => setTimeout(r, 300))
    await ev('document.querySelector(".programacion__celda--hoy")?.click()')
    await new Promise((r) => setTimeout(r, 200))
    await escribir('#programacion-contenido', 'Sesión desde el calendario')
    comprobar('añade un día desde el calendario', await clicTexto('Añadir a la programación'))
    await new Promise((r) => setTimeout(r, 200))
    await clicTexto('Guardar programación')
    await new Promise((r) => setTimeout(r, 700))
    comprobar(
      'el día añadido desde el calendario persiste',
      await ev(
        `window.api.programacion.listar(${clase.id}).then((filas) => filas.some((fila) => fila.contenido === 'Sesión desde el calendario'))`
      )
    )

    /* --- Programación de aula: edición en tabla ------------------ */
    comprobar('abre la tabla de programación', await clicTexto('Tabla'))
    await new Promise((r) => setTimeout(r, 300))
    comprobar('añade una fila en la tabla', await clicTexto('Añadir fila'))
    await new Promise((r) => setTimeout(r, 200))
    const rellenadaTabla = await ev(`(() => {
      const filas = [...document.querySelectorAll('table.programacion__tabla tbody tr')]
      const fila = filas[filas.length - 1]
      const fecha = fila?.querySelector('input[type="date"]')
      const contenido = fila?.querySelector('textarea')
      if (!fecha || !contenido) return false
      const escribir = (campo, valor) => {
        const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(campo), 'value')
        descriptor.set.call(campo, valor)
        campo.dispatchEvent(new Event('input', { bubbles: true }))
      }
      escribir(fecha, '2026-11-13')
      escribir(contenido, 'Sesión desde tabla')
      return true
    })()`)
    comprobar('rellena la fila de la tabla', rellenadaTabla)
    comprobar('guarda la fila de la tabla', await clicTexto('Guardar programación'))
    await new Promise((r) => setTimeout(r, 900))
    comprobar(
      'la fila de la tabla persiste',
      await ev(
        `window.api.programacion.listar(${clase.id}).then((filas) => filas.some((fila) => fila.fecha === '2026-11-13' && fila.contenido === 'Sesión desde tabla'))`
      )
    )

    /* --- Programación de aula: importación ----------------------- */
    comprobar('abre las acciones de programación', await clicTexto('Acciones'))
    comprobar('abre el importador de programación', await clicTexto('Importar programación'))
    await escribir(
      '.programacion__importar textarea',
      JSON.stringify([{ fecha: '2026-11-16', contenido: 'Sesión importada' }])
    )
    comprobar('importa días de programación', await clicTexto('Importar'))
    await new Promise((r) => setTimeout(r, 300))
    comprobar('guarda los días importados', await clicTexto('Guardar programación'))
    await new Promise((r) => setTimeout(r, 900))
    comprobar(
      'el día importado persiste',
      await ev(
        `window.api.programacion.listar(${clase.id}).then((filas) => filas.some((fila) => fila.fecha === '2026-11-16' && fila.contenido === 'Sesión importada'))`
      )
    )

    /* --- Programación de aula: edición de un día ----------------- */
    await clicTexto('Tarjetas')
    await clicTexto('Ver todo')
    await new Promise((r) => setTimeout(r, 300))
    const editadoDia = await ev(`(() => {
      const articulo = [...document.querySelectorAll('.programacion__dia')].find((item) =>
        item.textContent.includes('Sesión sintética de aula')
      )
      const boton = articulo?.querySelector('button[aria-label="Editar día"]')
      if (!boton) return false
      boton.click()
      return true
    })()`)
    comprobar('abre la edición de un día guardado', editadoDia)
    await escribir('#programacion-contenido', 'Sesión sintética corregida')
    comprobar('guarda la edición del día', await clicTexto('Guardar día'))
    await new Promise((r) => setTimeout(r, 200))
    await clicTexto('Guardar programación')
    await new Promise((r) => setTimeout(r, 700))
    comprobar(
      'la edición del día persiste',
      await ev(
        `window.api.programacion.listar(${clase.id}).then((filas) => filas.some((fila) => fila.fecha === '2026-11-12' && fila.contenido === 'Sesión sintética corregida'))`
      )
    )

    /* --- Programación de aula: cambio solo de hora ---------------- */
    const editadoHora = await ev(`(() => {
      const articulo = [...document.querySelectorAll('.programacion__dia')].find((item) =>
        item.textContent.includes('Sesión sintética corregida')
      )
      const boton = articulo?.querySelector('button[aria-label="Editar día"]')
      if (!boton) return false
      boton.click()
      return true
    })()`)
    comprobar('abre la edición para cambiar la hora', editadoHora)
    await escribir('#programacion-hora', '10:30')
    comprobar(
      'permite guardar aunque solo cambie la hora',
      await ev('!document.querySelector(".programacion__formulario button[type=submit]").disabled')
    )
    comprobar('guarda el cambio de hora', await clicTexto('Guardar día'))
    await new Promise((r) => setTimeout(r, 200))
    await clicTexto('Guardar programación')
    await new Promise((r) => setTimeout(r, 700))
    comprobar(
      'el cambio de hora persiste',
      await ev(
        `window.api.programacion.listar(${clase.id}).then((filas) => filas.some((fila) => fila.fecha === '2026-11-12' && fila.hora === '10:30'))`
      )
    )

    /* --- Faltas: guardado de configuración ----------------------- */
    await ev(`location.hash = '#/faltas?grupo=${clase.id}'`)
    await new Promise((r) => setTimeout(r, 900))
    comprobar(
      'la vista de faltas carga la configuración',
      await ev('document.body.textContent.includes("Configuración del control")')
    )
    await escribir('#faltas-limite', '20')
    comprobar('guarda la configuración de faltas', await clicTexto('Guardar cambios'))
    await new Promise((r) => setTimeout(r, 700))
    comprobar(
      'la configuración de faltas se guarda sin error de IPC',
      await ev(
        'document.body.textContent.includes("Configuración de faltas guardada.") && !document.querySelector(".aviso--error")'
      )
    )

    /* --- Convocatorias: ordinaria y extraordinaria ---------------- */
    await ev(`location.hash = '#/grupo/${clase.id}/convocatorias'`)
    await new Promise((r) => setTimeout(r, 900))
    comprobar(
      'la ruta de convocatorias muestra la ordinaria existente',
      await ev('document.body.textContent.includes("Ordinaria sintética")')
    )
    comprobar('abre el formulario de convocatoria', await clicTexto('Nueva convocatoria'))
    await new Promise((r) => setTimeout(r, 200))
    await escribir('#convocatoria-nombre', 'Extraordinaria sintética')
    await ev(`(() => {
      const select = document.querySelector('#convocatoria-tipo')
      if (!select) return false
      select.value = 'extraordinaria'
      select.dispatchEvent(new Event('change', { bubbles: true }))
      return true
    })()`)
    comprobar('crea la convocatoria extraordinaria', await clicTexto('Crear convocatoria'))
    await new Promise((r) => setTimeout(r, 900))
    comprobar(
      'la convocatoria extraordinaria aparece en la ruta',
      (await ev('document.body.textContent.includes("Extraordinaria sintética")')) &&
        !(await ev('document.querySelector(".aviso--error")'))
    )

    /* --- Currículo accesible desde Cursos ------------------------- */
    await ev(`location.hash = '#/cursos'`)
    await new Promise((r) => setTimeout(r, 900))
    comprobar(
      'el importador de currículos está accesible desde Cursos',
      await ev('document.body.textContent.includes("Currículo: módulos, RA y CE")')
    )

    /* --- Calendario: definir un día no lectivo -------------------- */
    await ev(`location.hash = '#/calendario'`)
    await new Promise((r) => setTimeout(r, 900))
    comprobar('abre el menú de acciones del calendario', await clicTexto('Acciones'))
    comprobar('abre el formulario de día no lectivo', await clicTexto('Definir día no lectivo'))
    await escribir('#calendario-fecha', '2026-12-07')
    await escribir('#calendario-descripcion', 'Festivo sintético')
    comprobar('guarda el día no lectivo', await clicTexto('Añadir día'))
    await new Promise((r) => setTimeout(r, 700))
    comprobar(
      'el día no lectivo queda en el calendario',
      await ev(
        `window.api.calendarioEscolar.listar(${cursoActual.id}).then((dias) => dias.some((dia) => dia.fecha === '2026-12-07' && dia.descripcion === 'Festivo sintético'))`
      )
    )

    /* --- Calendario: meses anteriores ----------------------------- */
    const fechaPasada = new Date()
    fechaPasada.setMonth(fechaPasada.getMonth() - 1)
    fechaPasada.setDate(15)
    const isoPasado = `${fechaPasada.getFullYear()}-${String(fechaPasada.getMonth() + 1).padStart(2, '0')}-${String(fechaPasada.getDate()).padStart(2, '0')}`
    await ev(
      `window.api.eventosEvaluacion.crear(${clase.id}, { tipo: 'otro', titulo: 'Evento del mes pasado', fecha: '${isoPasado}' })`
    )
    await ev(`location.hash = '#/grupos'`)
    await new Promise((r) => setTimeout(r, 200))
    await ev(`location.hash = '#/calendario'`)
    await new Promise((r) => setTimeout(r, 900))
    await ev('document.querySelector(\'[aria-label="Mes anterior"]\')?.click()')
    await new Promise((r) => setTimeout(r, 500))
    comprobar(
      'el calendario muestra hitos de meses anteriores',
      await ev('document.body.textContent.includes("Evento del mes pasado")')
    )

    /* --- Guardado de criterios desde la interfaz ------------------ */
    await ev(`location.hash = '#/grupo/${clase.id}/criterios'`)
    await new Promise((r) => setTimeout(r, 900))
    comprobar('guarda los criterios desde la interfaz', await clicTexto('Guardar criterios'))
    await new Promise((r) => setTimeout(r, 600))
    comprobar(
      'los criterios se guardan sin error',
      await ev(
        'document.body.textContent.includes("Criterios guardados.") && !document.querySelector(".aviso--error")'
      )
    )

    /* --- Alta de una entrega desde el formulario ------------------ */
    const unidadCreada = (await ev(`window.api.unidadesProgramacion.listar(${clase.id})`)).find(
      (unidad) => unidad.nombre === 'Unidad sintética'
    )
    await ev(`location.hash = '#/grupo/${clase.id}/entregas/nueva'`)
    await new Promise((r) => setTimeout(r, 900))
    await escribir('#entrega-titulo', 'Entrega sintética')
    await escribir('#entrega-rubrica', 'Criterios de la entrega sintética')
    await ev(`(() => {
      const select = document.querySelector('#entrega-unidad')
      if (!select) return false
      select.value = ${JSON.stringify(String(unidadCreada?.id ?? ''))}
      select.dispatchEvent(new Event('change', { bubbles: true }))
      return true
    })()`)
    comprobar('crea una entrega desde el formulario', await clicTexto('Crear entrega'))
    await new Promise((r) => setTimeout(r, 900))
    comprobar(
      'la entrega creada aparece en el listado',
      (await ev('document.body.textContent.includes("Entrega sintética")')) &&
        !(await ev('document.querySelector(".aviso--error")'))
    )

    /* --- Calificaciones por unidades ------------------------------ */
    const entregaSintetica = (await ev(`window.api.entregasClase.listar(${clase.id})`)).find(
      (entrega) => entrega.titulo === 'Entrega sintética'
    )
    if (unidadCreada && entregaSintetica) {
      await ev(
        `window.api.unidadesProgramacion.actualizar(${unidadCreada.id}, { nombre: 'Unidad sintética', avaluacion_id: 'AV1', peso: 100 })`
      )
      await ev(
        `window.api.notasClase.guardar(${clase.id}, ${alumnoClase.id}, [{ entregaId: ${entregaSintetica.id}, nota: 8, observaciones: null }])`
      )
      await ev(`location.hash = '#/grupo/${clase.id}/calificaciones?alumno=${alumnoClase.id}'`)
      await new Promise((r) => setTimeout(r, 900))
      comprobar(
        'las unidades ponderadas aparecen en calificaciones',
        (await ev('document.body.textContent.includes("Unidad sintética")')) &&
          !(await ev('document.querySelector(".aviso--error")'))
      )
    }

    /* --- Campos de evaluación de las unidades --------------------- */
    await ev(`location.hash = '#/grupo/${clase.id}/programacion-didactica?tab=unidades'`)
    await new Promise((r) => setTimeout(r, 900))
    await clicTexto('Nueva unidad')
    await new Promise((r) => setTimeout(r, 200))
    comprobar(
      'los campos de evaluación y peso de la unidad son visibles',
      await ev(
        'Boolean(document.querySelector("#unidad-avaluacion")?.offsetParent && document.querySelector("#unidad-peso")?.offsetParent)'
      )
    )

    /* --- Fines de semana fuera del dashboard ---------------------- */
    await ev(
      `window.api.calendarioEscolar.importar(${cursoActual.id}, ${JSON.stringify(
        JSON.stringify([
          { fecha: '2026-11-07', tipo: 'no_lectivo', descripcion: 'Sábado' },
          { fecha: '2026-11-08', tipo: 'no_lectivo', descripcion: 'Domingo' },
          { fecha: '2026-11-09', tipo: 'no_lectivo', descripcion: 'Lunes no lectivo' }
        ])
      )})`
    )
    await ev(`location.hash = '#/grupo/${clase.id}'`)
    await new Promise((r) => setTimeout(r, 700))
    const noLectivosDashboard = await ev(
      'document.querySelector(".dashboard__no-lectivos")?.textContent ?? ""'
    )
    comprobar(
      'el dashboard oculta los fines de semana no lectivos',
      noLectivosDashboard.includes('09/11/2026') &&
        !noLectivosDashboard.includes('07/11/2026') &&
        !noLectivosDashboard.includes('08/11/2026'),
      String(noLectivosDashboard)
    )

    clearTimeout(rescate)
    console.log(fallos === 0 ? '[smoke-app] OK' : `[smoke-app] ${fallos} FALLOS`)
    rmSync(dirDatos, { recursive: true, force: true })
    app.exit(fallos === 0 ? 0 : 1)
  } catch (error) {
    console.error('[smoke-app] ERROR:', error)
    clearTimeout(rescate)
    rmSync(dirDatos, { recursive: true, force: true })
    app.exit(1)
  }
}

principal()
