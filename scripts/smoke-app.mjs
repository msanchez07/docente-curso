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
}, 40000)

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

    const ciclos = await ev('window.api.boe.listarCiclos()')
    comprobar('ciclo DAW con 13 módulos', ciclos.length === 1 && ciclos[0].modulos === 13)

    const estado = await ev('window.api.bd.estado()')
    comprobar('BD sembrada (86 RA, 665 CE)', estado.ra === 86 && estado.ce === 665)
    comprobar('BD aislada en directorio temporal', estado.ruta.startsWith(dirDatos))

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
