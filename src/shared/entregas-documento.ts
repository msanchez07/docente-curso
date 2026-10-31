/**
 * Hoja de estilo y HTML del dossier de entregas.
 *
 * El mismo HTML se usa para generar el PDF y para incluirlo en el ZIP cuando
 * la entrega tiene archivos adjuntos.
 */
import type {
  AmbitoExportacionEntregas,
  CriterioDisponible,
  EntregaClase,
  EvidenciaClase,
  GrupoClase
} from './tipos'

export interface DatosExportacionEntregas {
  grupo: GrupoClase
  entregas: EntregaClase[]
  evidencias: Map<number, EvidenciaClase[]>
  criterios: CriterioDisponible[]
  avaluaciones: { id: string; nombre: string }[]
  categorias: { id: string; nombre: string }[]
  ambito: AmbitoExportacionEntregas
  tituloAmbito: string
  fecha: Date
  /** Cabecera institucional ya generada, opcional. */
  cabeceraHtml?: string
  /** Pie institucional ya generado, opcional. */
  pieHtml?: string
}

const TIPOS: Record<string, string> = {
  tarea: 'Tarea',
  practica: 'Práctica',
  examen: 'Examen',
  proyecto: 'Proyecto'
}

function escapar(texto: string | null | undefined): string {
  return String(texto ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function fechaCorta(fecha: string | null): string {
  if (!fecha) return 'Sin fecha'
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio}`
}

function parrafos(texto: string | null): string {
  if (!texto?.trim()) return '<p class="vacio">Sin contenido.</p>'
  return texto
    .trim()
    .split(/\n{2,}/)
    .map((bloque) => `<p>${escapar(bloque).replaceAll('\n', '<br>')}</p>`)
    .join('')
}

function nombreAvaluacion(datos: DatosExportacionEntregas, id: string): string {
  return datos.avaluaciones.find((avaluacion) => avaluacion.id === id)?.nombre ?? id
}

function nombreCategoria(datos: DatosExportacionEntregas, id: string): string {
  return datos.categorias.find((categoria) => categoria.id === id)?.nombre ?? id
}

function criteriosDe(datos: DatosExportacionEntregas, entrega: EntregaClase): CriterioDisponible[] {
  return entrega.ce_ids
    .map((id) => datos.criterios.find((criterio) => criterio.ceId === id))
    .filter((criterio): criterio is CriterioDisponible => Boolean(criterio))
}

function archivosDe(datos: DatosExportacionEntregas, entrega: EntregaClase): string[] {
  const nombres: string[] = []
  if (entrega.rubrica_archivo) nombres.push(entrega.rubrica_archivo.nombre)
  for (const evidencia of datos.evidencias.get(entrega.id) ?? []) {
    nombres.push(evidencia.nombre)
  }
  return nombres
}

export function generarHtmlEntregas(datos: DatosExportacionEntregas): string {
  const conArchivos = datos.entregas.filter(
    (entrega) => archivosDe(datos, entrega).length > 0
  ).length
  const conRubrica = datos.entregas.filter((entrega) =>
    Boolean(entrega.rubrica?.trim() || entrega.rubrica_archivo)
  ).length

  const indice = datos.entregas
    .map(
      (entrega, indice) => `<tr>
        <td class="num">${indice + 1}</td>
        <td><strong>${escapar(entrega.titulo)}</strong></td>
        <td>${escapar(TIPOS[entrega.tipo] ?? entrega.tipo)}</td>
        <td>${escapar(nombreAvaluacion(datos, entrega.avaluacion_id))}</td>
        <td>${escapar(fechaCorta(entrega.fecha_limite))}</td>
        <td>${archivosDe(datos, entrega).length}</td>
      </tr>`
    )
    .join('')

  const secciones = datos.entregas
    .map((entrega) => {
      const criterios = criteriosDe(datos, entrega)
      const archivos = archivosDe(datos, entrega)
      return `<section class="entrega">
        <header class="entrega__cabecera">
          <div>
            <p class="entrega__eyebrow">Entrega ${escapar(nombreAvaluacion(datos, entrega.avaluacion_id))}</p>
            <h2>${escapar(entrega.titulo)}</h2>
          </div>
          <span class="etiqueta">${escapar(TIPOS[entrega.tipo] ?? entrega.tipo)}</span>
        </header>

        <div class="meta">
          <span><strong>Categoría</strong> ${escapar(nombreCategoria(datos, entrega.categoria_id))}</span>
          <span><strong>Fecha límite</strong> ${escapar(fechaCorta(entrega.fecha_limite))}</span>
          <span><strong>Archivos</strong> ${archivos.length}</span>
        </div>

        <h3>Descripción</h3>
        <div class="texto">${parrafos(entrega.descripcion)}</div>

        ${
          entrega.rubrica?.trim()
            ? `<h3>Rúbrica</h3><div class="texto rubrica">${parrafos(entrega.rubrica)}</div>`
            : ''
        }

        ${
          criterios.length > 0
            ? `<h3>Criterios de evaluación</h3>
               <ul class="criterios">
                 ${criterios
                   .map(
                     (criterio) =>
                       `<li><span class="codigo">${escapar(criterio.raCodigo)} · ${escapar(criterio.ceCodigo)}</span> ${escapar(criterio.descripcion)}</li>`
                   )
                   .join('')}
               </ul>`
            : ''
        }

        ${
          archivos.length > 0
            ? `<h3>Archivos incluidos</h3><ul class="archivos">${archivos
                .map((nombre) => `<li>${escapar(nombre)}</li>`)
                .join('')}</ul>`
            : ''
        }
      </section>`
    })
    .join('')

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Entregas · ${escapar(datos.grupo.nombre)}</title>
  <style>
    @page { size: A4 portrait; margin: 18mm 16mm 18mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      color: #1c2a38;
      font: 11.5px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    h1, h2, h3, p { margin: 0; }
    h1 { color: #102a43; font-size: 30px; line-height: 1.12; letter-spacing: -0.03em; }
    h2 { color: #0d5c8c; font-size: 22px; line-height: 1.25; letter-spacing: -0.02em; }
    h3 { margin: 20px 0 8px; color: #0d5c8c; font-size: 9.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
    h3::before { content: ""; display: inline-block; width: 4px; height: 11px; margin-right: 7px; border-radius: 2px; background: #d98a2b; vertical-align: -1px; }
    .portada {
      padding: 30px 28px 26px;
      border: 1px solid #dbe5ee;
      border-left: 7px solid #0d5c8c;
      border-radius: 12px;
      background: linear-gradient(135deg, #f7fafc 0%, #ffffff 72%);
      page-break-after: always;
    }
    .portada__eyebrow { margin-bottom: 8px; color: #0d5c8c; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
    .portada h1 { margin-top: 2px; }
    .portada__grupo { margin-top: 10px; color: #102a43; font-size: 18px; font-weight: 600; line-height: 1.35; }
    .portada__ambito { margin-top: 4px; color: #5a6b7b; font-size: 13px; }
    .portada__meta { margin-top: 28px; padding-top: 16px; color: #5a6b7b; font-size: 10.5px; line-height: 1.75; border-top: 1px solid #dbe5ee; }
    .datos { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 22px 0 0; }
    .dato { position: relative; overflow: hidden; padding: 12px 14px; border: 1px solid #e3e7ee; border-radius: 9px; background: #fff; }
    .dato::before { content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 3px; background: #0d5c8c; }
    .dato:nth-child(2)::before { background: #1e7a4b; }
    .dato:nth-child(3)::before { background: #d98a2b; }
    .dato:nth-child(4)::before { background: #6b7a90; }
    .dato span { display: block; color: #667085; font-size: 8.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
    .dato strong { display: block; margin-top: 4px; color: #102a43; font-size: 18px; line-height: 1.1; }
    .indice { page-break-after: always; }
    .indice h2 { margin-bottom: 12px; font-size: 16px; }
    table { width: 100%; border-collapse: collapse; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
    th { padding: 8px 9px; border-bottom: 2px solid #cfdae5; background: #eef4f8; color: #36536b; text-align: left; font-size: 8.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
    th:first-child { border-radius: 6px 0 0 0; }
    th:last-child { border-radius: 0 6px 0 0; }
    td { padding: 8px 9px; border-bottom: 1px solid #e7edf3; vertical-align: top; }
    td.num { width: 28px; color: #667085; }
    tbody tr:nth-child(even) td { background: #fbfcfd; }
    .entrega {
      page-break-before: always;
      padding: 22px;
      border: 1px solid #dbe5ee;
      border-radius: 12px;
      background: linear-gradient(180deg, #ffffff 0%, #fbfcfd 100%);
    }
    .entrega__cabecera { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; padding-bottom: 14px; border-bottom: 2px solid #0d5c8c; }
    .entrega__eyebrow { margin-bottom: 5px; color: #0d5c8c; font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
    .etiqueta { flex: 0 0 auto; padding: 5px 11px; color: #0d5c8c; border: 1px solid #b9d3e4; border-radius: 999px; background: #eef6fb; font-size: 8px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; }
    .meta { display: flex; flex-wrap: wrap; gap: 8px 26px; margin: 14px 0 2px; color: #5a6b7b; font-size: 10px; }
    .meta strong { color: #102a43; font-weight: 600; }
    .texto p { margin: 0 0 10px; white-space: normal; }
    .texto p:last-child { margin-bottom: 0; }
    .rubrica { padding: 14px 16px; background: #f8fafc; border-left: 4px solid #d98a2b; border-radius: 0 7px 7px 0; }
    .criterios, .archivos { margin: 0; padding-left: 18px; }
    .criterios li { margin-bottom: 8px; line-height: 1.6; }
    .criterios li::marker { color: #d98a2b; }
    .archivos li { margin-bottom: 5px; }
    .codigo { color: #0d5c8c; font-weight: 600; }
    .vacio { color: #667085; }
    .pie { margin-top: 24px; padding-top: 11px; border-top: 1px solid #dbe5ee; color: #7a8898; font-size: 8.5px; }
    .doc-cabecera { margin: 0 0 22px; padding: 0 0 12px; border-bottom: 1px solid #dbe5ee; }
    .doc-cabecera__tabla { width: 100%; border-collapse: collapse; }
    .doc-cabecera__tabla td { vertical-align: middle; padding: 0; }
    .doc-cabecera__institucional { width: 25%; }
    .doc-cabecera__institucional img { display: block; max-width: 150px; max-height: 48px; margin-bottom: 5px; object-fit: contain; }
    .doc-cabecera__institucional .doc-cabecera__ue { max-height: 34px; }
    .doc-cabecera__centro { text-align: center; color: #475467; font-size: 9px; line-height: 1.35; }
    .doc-cabecera__centro span { display: block; }
    .doc-cabecera__centro span:first-child { color: #1f2937; font-size: 11px; font-weight: 700; }
    .doc-cabecera__propio { width: 25%; text-align: right; }
    .doc-cabecera__logo-centro { display: inline-block; max-width: 150px; max-height: 65px; object-fit: contain; }
  </style>
</head>
<body>
  ${datos.cabeceraHtml ?? ''}
  <section class="portada">
    <p class="portada__eyebrow">Gestión de entregas</p>
    <h1>Entregas</h1>
    <p class="portada__grupo">${escapar(datos.grupo.nombre)}</p>
    <p class="portada__ambito">${escapar(datos.tituloAmbito)}</p>

    <section class="datos">
      <div class="dato"><span>Entregas</span><strong>${datos.entregas.length}</strong></div>
      <div class="dato"><span>Con rúbrica</span><strong>${conRubrica}</strong></div>
      <div class="dato"><span>Con archivos</span><strong>${conArchivos}</strong></div>
      <div class="dato"><span>Generado</span><strong>${fechaCorta(datos.fecha.toISOString().slice(0, 10))}</strong></div>
    </section>

    <p class="portada__meta">
      Curso académico ${escapar(datos.grupo.curso_academico_nombre)} · ${escapar(datos.grupo.modulo_codigo)} ${escapar(datos.grupo.modulo_nombre)}<br />
      ${escapar(datos.grupo.ciclo_nombre)} · ${escapar(datos.grupo.curso)}º · ${escapar(datos.grupo.modalidad)}
    </p>
  </section>

  ${
    datos.entregas.length > 1
      ? `<section class="indice">
          <h2>Índice de entregas</h2>
          <table>
            <thead><tr><th>#</th><th>Entrega</th><th>Tipo</th><th>Avaluación</th><th>Fecha límite</th><th>Archivos</th></tr></thead>
            <tbody>${indice}</tbody>
          </table>
        </section>`
      : ''
  }

  ${secciones}

  <footer class="pie">${escapar(datos.grupo.modulo_codigo)} · ${escapar(datos.grupo.nombre)} · Documento generado desde Gestión de entregas</footer>
  ${datos.pieHtml ?? ''}
</body>
</html>`
}
