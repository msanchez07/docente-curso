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

  return `<article style="width:100%;max-width:100%;box-sizing:border-box;margin:0;background:#fff;color:#1f2937;font-family:Georgia,'Times New Roman',serif;line-height:1.65;">
    <section style="border:1px solid #cfd9e5;border-radius:10px;overflow:hidden;margin:0 0 22px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
      <div style="height:5px;background:#1e3a5f;"></div>
      <div style="padding:18px 22px 16px;background:#f8fafc;">
        <div style="color:#6b7c93;font-size:9px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;">
          ${escapar(grupo.modulo_codigo)} · ${escapar(tipoEtiqueta(entrega.tipo))}
        </div>
        <h1 style="font-family:Georgia,'Times New Roman',serif;color:#102a43;font-size:25px;line-height:1.2;margin:5px 0 5px;font-weight:700;">
          ${escapar(entrega.titulo)}
        </h1>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;color:#52657a;font-size:10.5px;line-height:1.4;">
          <span>${escapar(grupo.modulo_nombre)}</span>
          <span style="color:#b7791f;">•</span>
          <span>${escapar(grupo.curso_academico_nombre)}</span>
          <span style="color:#b7791f;">•</span>
          <span>${escapar(unidadTexto)}</span>
        </div>
        <div style="width:46px;height:2px;background:#b7791f;margin:11px 0 0;"></div>
      </div>

      <div style="border-top:1px solid #dbe3ec;padding:12px 22px 15px;background:#fff;">
        <table style="width:100%;border-collapse:collapse;font-size:10.5px;color:#374151;">
          <tr>
            <td style="width:37%;padding:0 18px 0 0;vertical-align:bottom;">
              <div style="font-size:8px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#6b7c93;margin-bottom:5px;">Nombre y apellidos</div>
              <div style="height:19px;border-bottom:1px solid #9aa7b8;"></div>
            </td>
            <td style="width:17%;padding:0 18px 0 0;vertical-align:bottom;">
              <div style="font-size:8px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#6b7c93;margin-bottom:5px;">DNI</div>
              <div style="height:19px;border-bottom:1px solid #9aa7b8;"></div>
            </td>
            <td style="width:26%;padding:0 18px 0 0;vertical-align:bottom;">
              <div style="font-size:8px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#6b7c93;margin-bottom:5px;">Grupo</div>
              <div style="min-height:19px;font-size:10px;font-weight:600;color:#102a43;border-bottom:1px solid #dbe3ec;padding-bottom:3px;">${escapar(grupo.nombre.replace(/\s*·\s*(Presencial|Semipresencial)$/i, ''))}</div>
            </td>
            <td style="width:20%;padding:0;vertical-align:bottom;">
              <div style="font-size:8px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#6b7c93;margin-bottom:5px;">Fecha</div>
              <div style="min-height:19px;font-size:10.5px;font-weight:600;color:#102a43;border-bottom:1px solid #dbe3ec;padding-bottom:3px;">${escapar(fechaCorta(entrega.fecha_limite))}</div>
            </td>
          </tr>
        </table>
      </div>
    </section>

    <div style="border:1px solid #111827;background:#f8fafc;padding:11px 14px;margin:0 0 20px;">
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:9.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#111827;margin:0 0 6px;">
        Instrucciones y restricciones
      </div>
      <div style="font-size:11.5px;line-height:1.6;color:#1f2937;">
        ${parrafos(entrega.restricciones, 'Sin restricciones específicas.')}
      </div>
    </div>

    <div style="font-size:12px;line-height:1.7;color:#1f2937;">
      ${parrafos(entrega.enunciado, 'Sin enunciado definido.')}
    </div>

    <div style="font-size:12px;line-height:1.7;color:#1f2937;margin-top:12px;">
      ${parrafos(entrega.problema, 'Sin descripción del problema.')}
    </div>

  </article>`
}
