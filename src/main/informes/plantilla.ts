/**
 * Plantillas de informe (HTML y CSV) según el modelo de evaluación.
 * Funciones puras, sin acceso a Electron, para poder probarlas aisladas.
 */
import type { EvaluacionAlumno, ResumenEvaluacion } from '@shared/tipos'

export interface DatosInforme {
  titulo: string
  ciclo: { denominacion: string; rd: string; rd_actualizacion?: string; boe_url: string }
  modulo: { codigo: string; nombre: string; ects: number | null; horas_minimas_boe: number | null }
  curso: string
  resumen: ResumenEvaluacion
  alumnos: EvaluacionAlumno[]
}

function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function nota(nota: number | null): string {
  return nota === null ? '—' : nota.toFixed(2).replace('.', ',')
}

function claseNota(suspensa: boolean, vacia: boolean): string {
  if (vacia) return 'nota nota--vacia'
  return suspensa ? 'nota nota--suspensa' : 'nota'
}

function descripcionModelo(resumen: ResumenEvaluacion): string {
  const modelo = resumen.modelo
  const categorias = modelo.categorias.map((c) => `${c.nombre} ${c.peso} %`).join(' + ')
  const avaluaciones = modelo.avaluaciones.map((a) => `${a.peso} % ${a.nombre}`).join(' + ')
  return `${categorias} · Nota final: ${avaluaciones}`
}

/** Informe en HTML (un alumno o el grupo completo). */
export function generarHtml(datos: DatosInforme): string {
  const { ciclo, modulo, curso, resumen, alumnos, titulo } = datos
  const modelo = resumen.modelo

  const cabeceraAvaluaciones = modelo.avaluaciones
    .map((a) => `<th class="num" title="${escapar(a.nombre)}">${escapar(a.id)}</th>`)
    .join('')

  const filas = alumnos
    .map((evaluacion) => {
      const celdas = evaluacion.avaluaciones
        .map(
          (av) =>
            `<td class="${claseNota(av.suspensa, av.nota === null)}">${nota(av.nota)}${av.suspensa ? ' *' : ''}</td>`
        )
        .join('')
      const estado = evaluacion.aprobado
        ? 'Apto'
        : evaluacion.vaAConvocatoria
          ? 'A convocatoria'
          : 'No apto'
      const clase = evaluacion.aprobado ? 'apto' : 'no-apto'
      return `<tr>
        <td class="alumno">${escapar(evaluacion.alumno.apellidos)}, ${escapar(evaluacion.alumno.nombre)}</td>
        ${celdas}
        <td class="nota nota--final">${nota(evaluacion.notaFinal)}</td>
        <td class="${clase}">${estado}</td>
      </tr>`
    })
    .join('\n')

  const detalle =
    alumnos.length === 1
      ? alumnos[0].avaluaciones
          .map(
            (av) => `<section class="detalle">
        <h3>${escapar(av.nombre)} — nota ${nota(av.nota)}${av.suspensa ? ' (suspensa)' : ''}</h3>
        ${av.motivos.length > 0 ? `<p class="motivos">${escapar(av.motivos.join(' '))}</p>` : ''}
        ${av.categorias
          .filter((c) => c.entregas.length > 0)
          .map(
            (cat) => `
          <h4>${escapar(cat.nombre)} (${cat.peso} %) — media ${nota(cat.media)}</h4>
          <table class="tabla">
            <thead><tr><th>Entrega</th><th class="num">Nota</th></tr></thead>
            <tbody>${cat.entregas
              .map(
                (e) =>
                  `<tr><td>${escapar(e.titulo)}</td><td class="${claseNota(false, e.nota === null)}">${nota(e.nota)}</td></tr>`
              )
              .join('')}</tbody>
          </table>`
          )
          .join('')}
      </section>`
          )
          .join('')
      : ''

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${escapar(titulo)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #1f2733; margin: 32px; font-size: 12px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 20px 0 8px; }
  h3 { font-size: 13px; margin: 18px 0 6px; }
  h4 { font-size: 12px; margin: 12px 0 4px; color: #3b4757; }
  .sub { color: #6b7684; margin: 0 0 2px; }
  .marco { border: 1px solid #e2e5ea; border-radius: 8px; padding: 12px 14px; margin-bottom: 14px; }
  .marco dl { display: grid; grid-template-columns: 150px 1fr; gap: 2px 10px; margin: 0; }
  .marco dt { color: #6b7684; }
  .marco dd { margin: 0; }
  table.tabla { border-collapse: collapse; width: 100%; margin-bottom: 6px; }
  table.tabla th, table.tabla td { border: 1px solid #e2e5ea; padding: 4px 6px; text-align: left; }
  table.tabla th { background: #f5f6f8; font-weight: 600; font-size: 11px; }
  td.nota { text-align: right; font-variant-numeric: tabular-nums; }
  td.nota--vacia { color: #a8b0bb; }
  td.nota--suspensa { color: #b3261e; }
  td.nota--final { font-weight: 700; }
  td.alumno { white-space: nowrap; }
  td.apto { color: #1a7f37; font-weight: 600; }
  td.no-apto { color: #b3261e; font-weight: 600; }
  .motivos { color: #b26a00; margin: 2px 0 6px; }
  .detalle { page-break-inside: avoid; }
  .pie { margin-top: 18px; color: #6b7684; font-size: 10.5px; }
</style>
</head>
<body>
  <h1>${escapar(titulo)}</h1>
  <p class="sub">${escapar(ciclo.denominacion)} · Curso ${escapar(curso)}</p>

  <div class="marco">
    <dl>
      <dt>Módulo</dt><dd>${escapar(modulo.codigo)} · ${escapar(modulo.nombre)}</dd>
      <dt>ECTS</dt><dd>${modulo.ects ?? '—'}${modulo.horas_minimas_boe ? ` · ${modulo.horas_minimas_boe} h mínimas (BOE)` : ''}</dd>
      <dt>Norma</dt><dd>${escapar(ciclo.rd)}</dd>
      ${ciclo.rd_actualizacion ? `<dt>Actualización</dt><dd>${escapar(ciclo.rd_actualizacion)}</dd>` : ''}
      <dt>Modalidad</dt><dd>${resumen.grupo.modalidad === 'semipresencial' ? 'Semipresencial' : 'Presencial'}</dd>
      <dt>Fórmula</dt><dd>${escapar(descripcionModelo(resumen))}</dd>
      <dt>Requisitos</dt><dd>${escapar(modelo.requisitos.map((r) => `${r.nombre}: ${r.valor}`).join(' · '))}</dd>
      <dt>Referencia BOE</dt><dd>${escapar(ciclo.boe_url)}</dd>
    </dl>
  </div>

  <h2>Calificaciones</h2>
  <table class="tabla">
    <thead>
      <tr>
        <th>Alumno/a</th>
        ${cabeceraAvaluaciones}
        <th class="num">Final</th>
        <th>Estado</th>
      </tr>
    </thead>
    <tbody>
${filas}
    </tbody>
  </table>

  ${detalle}

  <p class="pie">
    * Avaluación suspensa: hay entregas sin corregir (cuentan como 0), notas por debajo de los
    mínimos o la media no llega al umbral. Informe generado por «Gestión de entregas».
  </p>
</body>
</html>`
}

/** Volcado CSV de las notas (una fila por alumno). */
export function generarCsv(datos: DatosInforme): string {
  const { resumen, alumnos } = datos
  const separador = ';'
  const numero = (n: number | null): string => (n === null ? '' : n.toFixed(2).replace('.', ','))
  const escaparCsv = (valor: string): string =>
    /[;"\n]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor

  const cabeceras = [
    'Alumno',
    ...resumen.modelo.avaluaciones.map((a) => `${a.id} (${a.peso}%)`),
    'Nota final',
    'Aprobado'
  ]

  const lineas = alumnos.map((evaluacion) =>
    [
      `${evaluacion.alumno.apellidos}, ${evaluacion.alumno.nombre}`,
      ...evaluacion.avaluaciones.map((av) => numero(av.nota)),
      numero(evaluacion.notaFinal),
      evaluacion.aprobado ? 'Sí' : 'No'
    ]
      .map((v) => escaparCsv(String(v)))
      .join(separador)
  )

  return [cabeceras.map(escaparCsv).join(separador), ...lineas].join('\n')
}
