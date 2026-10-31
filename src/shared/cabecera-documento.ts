import type { ConfiguracionGeneral } from './tipos'

export interface LogosDocumento {
  conselleria?: string | null
  unionEuropea?: string | null
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
 * Reproduce la plantilla del centro: logos institucionales, datos del centro y
 * logo propio. El logo del centro llega desde la configuración general.
 */
export function generarCabeceraDocumento(
  configuracion: ConfiguracionGeneral | null | undefined,
  logos: LogosDocumento = {}
): string {
  const centro = configuracion?.centro
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
    .map((valor) => `<span>${escapar(valor.trim())}</span>`)
    .join('')

  const logoCentro = configuracion?.logo
    ? `<img class="doc-cabecera__logo-centro" src="${configuracion.logo}" alt="Logo del centro">`
    : ''

  return `<header class="doc-cabecera">
    <table class="doc-cabecera__tabla">
      <tr>
        <td class="doc-cabecera__institucional">
          ${logos.conselleria ? `<img src="${logos.conselleria}" alt="Generalitat Valenciana">` : ''}
          ${logos.unionEuropea ? `<img class="doc-cabecera__ue" src="${logos.unionEuropea}" alt="Unió Europea">` : ''}
        </td>
        <td class="doc-cabecera__centro">
          ${lineas || '<span>Centro educativo</span>'}
        </td>
        <td class="doc-cabecera__propio">
          ${logoCentro}
        </td>
      </tr>
    </table>
  </header>`
}
