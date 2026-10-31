import type { EntregaClase, GrupoClase, UnidadProgramacion } from './tipos'

export interface DatosImpresionEntrega {
  grupo: GrupoClase
  entrega: EntregaClase
  unidad: UnidadProgramacion | null
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

function parrafos(texto: string | null, vacio = 'Sin contenido.'): string {
  if (!texto?.trim()) {
    return `<p style="margin:0;color:#6b7280;">${escapar(vacio)}</p>`
  }
  return texto
    .trim()
    .split(/\n{2,}/)
    .map(
      (bloque) =>
        `<p style="margin:0 0 10px;line-height:1.65;">${escapar(bloque).replaceAll('\n', '<br>')}</p>`
    )
    .join('')
}

function tipoEtiqueta(tipo: string): string {
  const etiquetas: Record<string, string> = {
    tarea: 'Tarea',
    practica: 'Práctica',
    examen: 'Examen',
    proyecto: 'Proyecto'
  }
  return etiquetas[tipo] ?? tipo
}

function tituloSeccion(numero: number, titulo: string): string {
  return `<h2 style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#111827;border-bottom:1px solid #d1d5db;padding-bottom:4px;margin:22px 0 9px;">${numero}. ${titulo}</h2>`
}

/**
 * Documento limpio para imprimir un examen o una entrega.
 *
 * No usa el formato de tarjetas de la ficha HTML: es un texto de examen con
 * secciones separadas, pensado para papel y para convivir con la cabecera y el
 * pie institucionales.
 */
export function generarHtmlImpresionEntrega(datos: DatosImpresionEntrega): string {
  const { entrega, grupo, unidad } = datos
  const unidadTexto = unidad
    ? `${unidad.codigo ?? 'UD'}${unidad.nombre ? ` · ${unidad.nombre}` : ''}`
    : 'Sin unidad asignada'

  return `<article style="width:100%;max-width:100%;box-sizing:border-box;margin:0;background:#fff;color:#1f2937;font-family:Georgia,'Times New Roman',serif;line-height:1.6;">
    <header style="text-align:center;border-bottom:2px solid #111827;padding:0 0 12px;margin:0 0 14px;">
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#6b7280;font-size:9.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;">
        ${escapar(grupo.modulo_codigo)} · ${escapar(tipoEtiqueta(entrega.tipo))}
      </div>
      <h1 style="color:#111827;font-size:24px;line-height:1.2;margin:8px 0 5px;font-weight:700;">
        ${escapar(entrega.titulo)}
      </h1>
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#4b5563;font-size:10.5px;">
        ${escapar(grupo.modulo_nombre)} · ${escapar(grupo.curso_academico_nombre)} · ${escapar(unidadTexto)} · ${escapar(fechaCorta(entrega.fecha_limite))}
      </div>
    </header>

    <table style="width:100%;border-collapse:collapse;margin:0 0 18px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:10.5px;color:#374151;">
      <tr>
        <td style="width:50%;padding:0 12px 0 0;border-bottom:1px solid #d1d5db;">Nombre y apellidos:</td>
        <td style="width:25%;padding:0 12px 0 0;border-bottom:1px solid #d1d5db;">Grupo:</td>
        <td style="width:25%;padding:0;border-bottom:1px solid #d1d5db;">Fecha:</td>
      </tr>
      <tr><td style="height:22px;"></td><td></td><td></td></tr>
    </table>

    <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#6b7280;font-size:10.5px;line-height:1.55;margin:0 0 14px;">
      ${escapar(entrega.descripcion || 'Lee atentamente el enunciado y justifica tus decisiones.')}
    </p>

    ${tituloSeccion(1, 'Enunciado')}
    <div style="font-size:12px;line-height:1.65;color:#1f2937;margin:0 0 20px;">${parrafos(entrega.enunciado, 'Sin enunciado definido.')}</div>

    ${tituloSeccion(2, 'Descripción del problema')}
    <div style="font-size:12px;line-height:1.65;color:#1f2937;margin:0 0 20px;">${parrafos(entrega.problema, 'Sin descripción del problema.')}</div>

    ${tituloSeccion(3, 'Restricciones y condiciones')}
    <div style="font-size:12px;line-height:1.65;color:#1f2937;margin:0 0 8px;">${parrafos(entrega.restricciones, 'Sin restricciones específicas.')}</div>


    <footer style="margin-top:28px;padding-top:8px;border-top:1px solid #d1d5db;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#6b7280;font-size:9px;text-align:center;">
      ${escapar(grupo.nombre)} · ${escapar(grupo.modulo_codigo)} · Documento de trabajo
    </footer>
  </article>`
}
