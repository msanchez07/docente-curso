/**
 * Ficha HTML de una entrega, pensada para copiar y pegar en Aules.
 *
 * Las secciones fijas son: enunciado, descripción del problema y restricciones.
 * El estilo es autocontenido (todo con estilos en línea) para que no dependa de
 * la hoja de estilos de la aplicación.
 */
import type { EntregaClase, GrupoClase, UnidadProgramacion } from './tipos'

export interface DatosFichaEntrega {
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
    return `<p style="margin: 0; color: #94a3b8;">${escapar(vacio)}</p>`
  }
  return texto
    .trim()
    .split(/\n{2,}/)
    .map(
      (bloque) => `<p style="margin: 0 0 10px 0;">${escapar(bloque).replaceAll('\n', '<br>')}</p>`
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

export function generarHtmlFichaEntrega(datos: DatosFichaEntrega): string {
  const { entrega, grupo, unidad } = datos
  const unidadTexto = unidad
    ? `${unidad.codigo ?? 'UD'}${unidad.nombre ? ` · ${unidad.nombre}` : ''}`
    : 'Sin unidad asignada'

  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; width: 100%; max-width: 100%; margin: 0; background: #ffffff; color: #334155; line-height: 1.5; box-sizing: border-box;">
  <div style="padding: 20px 24px; border-bottom: 1px solid #f1f5f9; background: #ffffff;">
    <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px;">
      <h2 style="margin: 0; color: #0f172a; font-size: 1.35rem; font-weight: bold; display: flex; align-items: center;">
        <span style="margin-right: 8px;">📋</span> ${escapar(entrega.titulo)}
      </h2>
      <span style="background: #eff6ff; color: #1d4ed8; font-weight: 600; padding: 3px 10px; border-radius: 6px; font-size: 0.8rem; border: 1px solid #bfdbfe;">${escapar(unidadTexto)}</span>
    </div>
    <p style="margin: 0 0 14px 0; font-size: 0.92rem; color: #475569;">${escapar(entrega.descripcion || 'Ficha de la entrega.')}</p>
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; display: flex; flex-direction: column; gap: 10px; font-size: 0.88rem;">
      <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 8px;"><span style="font-size: 1.1rem;">👤</span> <strong>Modalidad:</strong> ${escapar(grupo.modalidad === 'semipresencial' ? 'Semipresencial' : 'Presencial')}</div>
        <div style="display: flex; align-items: center; gap: 8px;"><span style="font-size: 1.1rem;">📄</span> <strong>Tipo:</strong> ${escapar(tipoEtiqueta(entrega.tipo))}</div>
        <div style="display: flex; align-items: center; gap: 8px;"><span style="font-size: 1.1rem;">📅</span> <strong>Fecha límite:</strong> ${escapar(fechaCorta(entrega.fecha_limite))}</div>
      </div>
      <div style="border-top: 1px dashed #cbd5e1; padding-top: 10px; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 8px; color: #475569;"><span style="font-size: 1.1rem;">🎯</span> <strong>Categoría:</strong> ${escapar(entrega.categoria_id)}</div>
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; color: #1d4ed8; font-weight: 600;">${escapar(unidadTexto)}</div>
      </div>
    </div>
  </div>

  <div style="padding: 20px 24px; background: #ffffff; border-bottom: 1px solid #e2e8f0;">
    <p style="margin: 0; font-size: 0.85rem; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">Enunciado</p>
    <div style="margin: 8px 0 0 0; font-size: 0.9rem; color: #475569;">${parrafos(entrega.enunciado, 'Sin enunciado definido.')}</div>
  </div>

  <div style="padding: 20px 24px; background: #fafaf9; border-bottom: 1px solid #e2e8f0;">
    <p style="margin: 0; font-size: 0.85rem; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">Descripción del problema</p>
    <div style="margin: 8px 0 0 0; font-size: 0.9rem; color: #475569;">${parrafos(entrega.problema, 'Sin descripción del problema.')}</div>
  </div>

  <div style="padding: 20px 24px; background: #ffffff; border-bottom: 1px solid #e2e8f0;">
    <p style="margin: 0; font-size: 0.85rem; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">Restricciones</p>
    <div style="margin: 8px 0 0 0; padding: 12px 16px; background: #fffdf5; border: 1px solid #fde68a; border-left: 4px solid #d98a2b; border-radius: 6px; font-size: 0.9rem; color: #475569;">${parrafos(entrega.restricciones, 'Sin restricciones específicas.')}</div>
  </div>

  <div style="padding: 12px 24px; background: #ffffff; text-align: center;">
    <span style="font-weight: 600; color: #1e3a8a; font-size: 0.9rem;">📚 ${escapar(grupo.modulo_nombre)} · ${escapar(grupo.curso_academico_nombre)}</span>
  </div>
</div>`
}
