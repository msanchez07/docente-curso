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
    .map(
      (valor, indice) =>
        `<span style="display:block;${indice === 0 ? 'color:#1f2937;font-size:11px;font-weight:700;' : ''}">${escapar(valor.trim())}</span>`
    )
    .join('')

  const logoCentro = configuracion?.logo
    ? `<img class="doc-cabecera__logo-centro" src="${configuracion.logo}" alt="Logo del centro" style="display:inline-block;max-width:150px;max-height:65px;object-fit:contain;">`
    : ''

  return `<header class="doc-cabecera" style="margin:0 0 18px;padding:0 0 11px;border-bottom:1px solid #dbe5ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;text-align:center;">
    <div style="display:flex;align-items:center;justify-content:center;gap:28px;flex-wrap:wrap;margin-bottom:9px;">
      ${logos.conselleria ? `<img src="${logos.conselleria}" alt="Generalitat Valenciana" style="display:block;max-width:150px;max-height:48px;object-fit:contain;">` : ''}
      ${logoCentro}
      ${logos.unionEuropea ? `<img class="doc-cabecera__ue" src="${logos.unionEuropea}" alt="Unió Europea" style="display:block;max-width:150px;max-height:34px;object-fit:contain;">` : ''}
    </div>
    <div class="doc-cabecera__centro" style="color:#475467;font-size:9px;line-height:1.35;">
      ${lineas || '<span style="display:block;color:#1f2937;font-size:11px;font-weight:700;">Centro educativo</span>'}
    </div>
  </header>`
}
