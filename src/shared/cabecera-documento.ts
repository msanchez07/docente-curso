import { CONFIGURACION_GENERAL_POR_DEFECTO, type ConfiguracionGeneral } from './tipos'

export interface LogosDocumento {
  conselleria?: string | null
  unionEuropea?: string | null
  centro?: string | null
}

function escapar(texto: string | null | undefined): string {
  return String(texto ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/**
 * Cabecera común de los documentos imprimibles.
 *
 * Reproduce la plantilla del centro: Conselleria a la izquierda, datos del
 * centro en el centro y logo propio a la derecha. El logo de la Unión Europea
 * se coloca en el pie.
 */
export function generarCabeceraDocumento(
  configuracion: ConfiguracionGeneral | null | undefined,
  logos: LogosDocumento = {}
): string {
  const centro = configuracion?.centro?.nombre
    ? configuracion.centro
    : CONFIGURACION_GENERAL_POR_DEFECTO.centro
  const lineas = [
    centro?.nombre,
    centro?.codigoCentro,
    centro?.direccion,
    [centro?.codigoPostal, centro?.localidad, centro?.provincia].filter(Boolean).join(' · '),
    centro?.telefono ? `Tel. ${centro.telefono}` : null,
    centro?.email,
    centro?.web
  ]
    .filter((valor): valor is string => Boolean(valor?.trim()))
    .map(
      (valor, indice) =>
        `<span style="display:block;${indice === 0 ? 'color:#1f2937;font-size:11px;font-weight:700;' : ''}">${escapar(valor.trim())}</span>`
    )
    .join('')

  const logoCentro =
    configuracion?.logo || logos.centro
      ? `<img src="${configuracion?.logo || logos.centro}" alt="Logo del centro" style="display:inline-block;max-width:150px;max-height:65px;object-fit:contain;">`
      : ''

  return `<header class="doc-cabecera" style="margin:0 0 18px;padding:0 0 11px;border-bottom:1px solid #dbe5ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="width:27%;padding:0;text-align:center;vertical-align:middle;">
          ${logos.conselleria ? `<img src="${logos.conselleria}" alt="Generalitat Valenciana" style="display:inline-block;max-width:150px;max-height:55px;object-fit:contain;">` : ''}
        </td>
        <td style="padding:0 12px;text-align:center;vertical-align:middle;color:#475467;font-size:9px;line-height:1.35;">
          ${lineas || '<span style="display:block;color:#1f2937;font-size:11px;font-weight:700;">Centro educativo</span>'}
        </td>
        <td style="width:27%;padding:0;text-align:center;vertical-align:middle;">
          ${logoCentro}
        </td>
      </tr>
    </table>
  </header>`
}

export function generarPieDocumento(logos: LogosDocumento = {}): string {
  if (!logos.unionEuropea) return ''
  return `<footer class="doc-pie" style="margin-top:20px;padding-top:8px;border-top:1px solid #dbe5ee;display:flex;justify-content:flex-end;">
    <img src="${logos.unionEuropea}" alt="Unió Europea" style="display:block;max-width:150px;max-height:34px;object-fit:contain;">
  </footer>`
}
