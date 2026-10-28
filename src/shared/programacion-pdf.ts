/**
 * HTML autocontenido de la programación de aula.
 *
 * Se usa tanto en Electron (para imprimirlo a PDF) como en la previsualización
 * web (para abrir el diálogo de impresión del navegador). Incluye todas las
 * sesiones recibidas, no solo la quincena visible, y deja los márgenes de
 * página al motor de impresión para que el PDF no salga pegado al borde.
 */
import { DIAS_SEMANA, resumenDiasSemana } from './grupos'
import type { GrupoClase, ProgramacionAula, UnidadProgramacion } from './tipos'

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

function escapar(texto: string | null | undefined): string {
  return String(texto ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function fechaCorta(iso: string): string {
  const [anio, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${anio}`
}

function fechaLarga(iso: string): string {
  const [anio, mes, dia] = iso.split('-').map(Number)
  const fecha = new Date(anio, mes - 1, dia)
  return `${DIAS[fecha.getDay()]}, ${fechaCorta(iso)}`
}

export function generarHtmlProgramacion(
  grupo: GrupoClase,
  filas: ProgramacionAula[],
  unidades: UnidadProgramacion[],
  fechaGeneracion = new Date()
): string {
  const unidadPorId = new Map(unidades.map((unidad) => [unidad.id, unidad]))
  const ordenadas = filas
    .slice()
    .sort(
      (a, b) =>
        a.fecha.localeCompare(b.fecha) ||
        a.orden - b.orden ||
        (a.hora ?? '99:99').localeCompare(b.hora ?? '99:99') ||
        a.id - b.id
    )
  const primera = ordenadas[0]?.fecha
  const ultima = ordenadas[ordenadas.length - 1]?.fecha
  const resumenHorario = resumenDiasSemana(grupo.dias_semana)

  const filasHtml =
    ordenadas.length === 0
      ? `<tr><td colspan="6" class="vacio">No hay sesiones registradas.</td></tr>`
      : ordenadas
          .map((fila) => {
            const unidad = fila.unidad_id ? unidadPorId.get(fila.unidad_id) : null
            const hora = fila.hora?.trim()
            const etiquetaHora = hora || `Sesión ${fila.orden + 1}`
            return `<tr>
              <td class="fecha">${escapar(fechaLarga(fila.fecha))}</td>
              <td class="hora">${escapar(etiquetaHora)}</td>
              <td>${unidad ? escapar(`${unidad.codigo ? `${unidad.codigo} · ` : ''}${unidad.nombre}`) : '—'}</td>
              <td class="contenido">${escapar(fila.contenido || 'Sin contenido')}</td>
              <td>${escapar(fila.desviacion || '—')}</td>
              <td>${escapar(fila.observaciones || '—')}</td>
            </tr>`
          })
          .join('')

  const tutorias = grupo.tutorias_semana ?? {}
  const diasTutorias = DIAS_SEMANA.filter((dia) => tutorias[dia.valor])
  const tutoriasHtml =
    grupo.modalidad === 'semipresencial'
      ? `<section class="bloque">
          <div class="bloque__cabecera">
            <div>
              <h2>Tutorías semanales</h2>
              <p>Horario de atención del grupo semipresencial.</p>
            </div>
            <span class="etiqueta">Semipresencial</span>
          </div>
          ${
            diasTutorias.length === 0
              ? '<p class="aviso">No hay tutorías configuradas en el grupo.</p>'
              : `<table class="tabla-tutorias">
                  <thead>
                    <tr>
                      <th>Día</th>
                      <th>Tutoría presencial</th>
                      <th>Tutoría individual</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${diasTutorias
                      .map((dia) => {
                        const datos = tutorias[dia.valor]!
                        return `<tr>
                          <td class="dia">${escapar(dia.etiqueta)}</td>
                          <td>${datos.presencial.length > 0 ? datos.presencial.map(escapar).join('<br>') : '—'}</td>
                          <td>${datos.individual.length > 0 ? datos.individual.map(escapar).join('<br>') : '—'}</td>
                        </tr>`
                      })
                      .join('')}
                  </tbody>
                </table>`
          }
        </section>`
      : ''

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Programación de aula · ${escapar(grupo.nombre)}</title>
  <style>
    @page { size: A4 landscape; margin: 14mm 12mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      color: #1d2939;
      font: 9.5px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    h1, h2, p { margin: 0; }
    h1 { font-size: 22px; line-height: 1.15; letter-spacing: -0.03em; }
    h2 { font-size: 12px; letter-spacing: -0.01em; }
    .cabecera {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      align-items: flex-start;
      padding: 0 0 14px;
      border-bottom: 3px solid #1d2939;
    }
    .cabecera__titulo { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
    .cabecera__subtitulo { color: #475467; font-size: 11px; }
    .cabecera__meta { flex: 0 1 54%; text-align: right; color: #667085; font-size: 9.5px; line-height: 1.55; overflow-wrap: anywhere; }
    .cabecera__meta strong { color: #1d2939; font-weight: 600; }
    .datos {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin: 14px 0 12px;
    }
    .dato {
      display: flex;
      flex-direction: column;
      gap: 3px;
      padding: 9px 11px;
      border: 1px solid #e4e7ec;
      border-radius: 7px;
      background: #f8fafc;
    }
    .dato span { color: #667085; font-size: 8px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; }
    .dato strong { color: #1d2939; font-size: 12px; }
    .horario {
      margin: 0 0 16px;
      padding: 8px 11px;
      color: #475467;
      border-left: 3px solid #98a2b3;
      background: #fcfcfd;
    }
    .horario strong { color: #1d2939; font-weight: 600; }
    .bloque { margin-top: 18px; }
    .bloque__cabecera { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-bottom: 7px; }
    .bloque__cabecera p { color: #667085; font-size: 9px; margin-top: 2px; }
    .etiqueta {
      display: inline-block;
      padding: 3px 8px;
      color: #475467;
      border: 1px solid #d0d5dd;
      border-radius: 99px;
      font-size: 8px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    table { width: 100%; border-collapse: collapse; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
    th {
      padding: 7px 7px;
      color: #fff;
      background: #1d2939;
      text-align: left;
      font-size: 8px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    th:first-child { border-radius: 5px 0 0 0; }
    th:last-child { border-radius: 0 5px 0 0; }
    td { padding: 7px; border-bottom: 1px solid #e4e7ec; vertical-align: top; }
    tbody tr:nth-child(even) td { background: #f9fafb; }
    .tabla-sesiones td.fecha { width: 15%; white-space: nowrap; font-weight: 600; }
    .tabla-sesiones td.hora { width: 9%; white-space: nowrap; }
    .tabla-sesiones td:nth-child(3) { width: 17%; }
    .tabla-sesiones td.contenido { width: 30%; }
    .tabla-sesiones td:nth-child(5) { width: 14%; }
    .tabla-sesiones td:nth-child(6) { width: 15%; }
    .tabla-tutorias td.dia { width: 24%; font-weight: 600; }
    .tabla-tutorias th:first-child { border-radius: 5px 0 0 0; }
    .tabla-tutorias th:last-child { border-radius: 0 5px 0 0; }
    .vacio { padding: 26px; text-align: center; color: #667085; }
    .aviso { padding: 12px 14px; color: #667085; border: 1px dashed #d0d5dd; border-radius: 6px; }
    .pie {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      margin-top: 18px;
      padding-top: 8px;
      color: #667085;
      border-top: 1px solid #e4e7ec;
      font-size: 8px;
    }
  </style>
</head>
<body>
  <header class="cabecera">
    <div class="cabecera__titulo">
      <h1>Programación de aula</h1>
      <p class="cabecera__subtitulo">${escapar(grupo.nombre)}</p>
    </div>
    <div class="cabecera__meta">
      <p><strong>Curso académico</strong> ${escapar(grupo.curso_academico_nombre)}</p>
      <p><strong>Módulo</strong> ${escapar(grupo.modulo_codigo)} · ${escapar(grupo.modulo_nombre)}</p>
      <p><strong>Ciclo</strong> ${escapar(grupo.ciclo_nombre)} · ${escapar(grupo.curso)}º</p>
      <p><strong>Modalidad</strong> ${escapar(grupo.modalidad)}</p>
    </div>
  </header>

  <section class="datos">
    <div class="dato"><span>Sesiones</span><strong>${ordenadas.length}</strong></div>
    <div class="dato"><span>Unidades</span><strong>${unidades.length}</strong></div>
    <div class="dato"><span>Primera fecha</span><strong>${primera ? fechaCorta(primera) : '—'}</strong></div>
    <div class="dato"><span>Última fecha</span><strong>${ultima ? fechaCorta(ultima) : '—'}</strong></div>
  </section>

  <p class="horario"><strong>Horario semanal:</strong> ${resumenHorario ? escapar(resumenHorario) : 'sin definir en el grupo'}.</p>

  ${tutoriasHtml}

  <section class="bloque">
    <div class="bloque__cabecera">
      <div>
        <h2>Sesiones programadas</h2>
        <p>Todas las fechas registradas en la programación de aula.</p>
      </div>
      <span class="etiqueta">${ordenadas.length} ${ordenadas.length === 1 ? 'sesión' : 'sesiones'}</span>
    </div>
    <table class="tabla-sesiones">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Hora</th>
          <th>Unidad</th>
          <th>Contenido</th>
          <th>Desviación</th>
          <th>Observaciones</th>
        </tr>
      </thead>
      <tbody>${filasHtml}</tbody>
    </table>
  </section>

  <footer class="pie">
    <span>${escapar(grupo.modulo_codigo)} · ${escapar(grupo.nombre)}</span>
    <span>Generado el ${fechaCorta(fechaGeneracion.toISOString().slice(0, 10))}</span>
  </footer>
</body>
</html>`
}
