export const PLANTILLA_PRESENTACION_POR_DEFECTO = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; width: 100%; max-width: 1000px; margin: 10px auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); overflow: hidden; color: #334155; line-height: 1.5; box-sizing: border-box;">
  <div style="padding: 20px 24px; border-bottom: 1px solid #f1f5f9; background: #ffffff;">
    <h2 style="margin: 0 0 6px 0; color: #0f172a; font-size: 1.35rem; font-weight: bold; display: flex; align-items: center;">
      <span style="margin-right: 8px;">👋</span> {{{titulo}}}
    </h2>
    <p style="margin: 0 0 14px 0; font-size: 0.92rem; color: #475569;">{{subtitulo}}</p>
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; display: flex; flex-direction: column; gap: 10px; font-size: 0.88rem;">
      <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 8px;"><span style="font-size: 1.2rem;">👨‍🏫</span> <strong>Profesor:</strong> {{profesor}}</div>
        <div style="display: flex; align-items: center; gap: 8px;"><span style="font-size: 1.1rem;">✉️</span> <strong>Contacto:</strong> <a style="color: #2563eb; font-weight: 600; text-decoration: none;" href="mailto:{{contacto}}">{{contacto}}</a></div>
      </div>
      <div style="border-top: 1px dashed #cbd5e1; padding-top: 10px; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 8px; color: #475569;"><span style="font-size: 1.1rem;">👥</span> <strong>Atención a familias / Tutorías:</strong> {{tutorias}}</div>
        {{#webApuntes}}<div><a style="display: inline-flex; align-items: center; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 0.85rem; padding: 6px 14px; border-radius: 6px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2); white-space: nowrap;" href="{{webApuntes}}" target="_blank" rel="noopener noreferrer"> <span style="margin-right: 6px;">📚</span> Acceder a la Web de Apuntes <span style="margin-left: 6px; font-size: 0.75rem; opacity: 0.85;">↗</span></a></div>{{/webApuntes}}
      </div>
    </div>
  </div>

  <div style="padding: 20px 24px; background: #ffffff; border-bottom: 1px solid #e2e8f0;">
    <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 8px; margin-bottom: 12px;">
      <div>
        <p style="margin: 0; font-size: 0.85rem; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">Planificación del curso · {{modulo}}</p>
        <p style="margin: 2px 0 0 0; font-size: 0.8rem; color: #94a3b8;">{{ciclo}} · {{curso}} · {{modalidad}} · Código: {{codigoModulo}}</p>
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 8px; font-size: 0.78rem;">
        <div style="display: inline-flex; align-items: center; gap: 6px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 4px 10px; border-radius: 6px; color: #475569;"><strong>{{totalUnidades}}</strong> unidades</div>
        <div style="display: inline-flex; align-items: center; gap: 6px; background: #eff6ff; border: 1px solid #bfdbfe; padding: 4px 10px; border-radius: 6px; color: #1d4ed8;"><strong>{{totalRas}}</strong> RA</div>
        <div style="display: inline-flex; align-items: center; gap: 6px; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 4px 10px; border-radius: 6px; color: #166534;"><strong>{{totalCes}}</strong> CE</div>
      </div>
    </div>

    {{#trimestres}}
    <div style="margin-bottom: 16px;">
      <span style="font-weight: bold; color: #1e293b; font-size: 0.92rem; display: flex; align-items: center; margin-bottom: 6px;"><span style="margin-right: 6px;">📌</span> {{nombre}}</span>
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.84rem; text-align: left; border: 1px solid #e2e8f0; border-radius: 6px;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569;">
              <th style="padding: 7px 10px; width: 60px;">Unidad</th>
              <th style="padding: 7px 10px;">Contenidos principales</th>
              <th style="padding: 7px 10px; width: 65px; text-align: center;">RA</th>
              <th style="padding: 7px 10px; width: 160px;">Criterios de evaluación (CE)</th>
            </tr>
          </thead>
          <tbody>
            {{#unidades}}
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 7px 10px; font-weight: 600; color: #0f172a;">{{codigo}}</td>
              <td style="padding: 7px 10px; color: #475569;"><strong>{{nombre}}</strong><br><span style="white-space: pre-line;">{{contenidos}}</span><br><span style="font-size: 0.76rem; color: #94a3b8;">{{fechas}} · {{sesiones}} sesiones</span></td>
              <td style="padding: 7px 10px; text-align: center; font-weight: 600; color: #2563eb;">{{ra}}</td>
              <td style="padding: 7px 10px; color: #64748b;">{{ce}}</td>
            </tr>
            {{/unidades}}
          </tbody>
        </table>
      </div>
    </div>
    {{/trimestres}}
    {{^trimestres}}<p style="margin: 0 0 12px; padding: 10px 12px; border: 1px dashed #cbd5e1; border-radius: 6px; color: #64748b; font-size: 0.84rem;">Todavía no hay unidades de programación con fechas para este grupo.</p>{{/trimestres}}

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; font-size: 0.82rem; color: #475569; display: flex; flex-direction: column; gap: 6px;">
      <div><strong style="color: #0f172a;">🎯 Resumen de evaluación</strong></div>
      <div style="display: flex; flex-wrap: wrap; gap: 6px;">Evaluaciones: {{#pesos}}<span style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 999px; padding: 2px 8px;"><strong>{{nombre}}</strong> {{peso}}</span>{{/pesos}}{{^pesos}}<span>sin pesos configurados</span>{{/pesos}}</div>
      <div style="display: flex; flex-wrap: wrap; gap: 6px;">Categorías: {{#categorias}}<span style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 999px; padding: 2px 8px;"><strong>{{nombre}}</strong> {{peso}}</span>{{/categorias}}{{^categorias}}<span>sin categorías configuradas</span>{{/categorias}}</div>
      {{#requisitos}}<div>Requisito: <strong>{{nombre}}</strong> · {{peso}}</div>{{/requisitos}}
    </div>
  </div>

  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 0; background: #fafaf9;">
    <div style="padding: 20px 24px; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 10px;">
      <p style="margin: 0; font-size: 0.82rem; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">Calendario de exámenes y evaluaciones</p>
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; font-size: 0.83rem;">
        {{#examenes}}
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-bottom: 1px solid #f1f5f9;">
          <div><strong style="color: #1e293b;">{{titulo}}</strong><span style="display: block; font-size: 0.75rem; color: #64748b;">{{tipo}}{{#trimestre}} · {{trimestre}}{{/trimestre}}</span></div>
          <div style="text-align: right;"><span style="background: #eff6ff; color: #1d4ed8; font-weight: 600; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; border: 1px solid #bfdbfe;">{{fecha}}</span><div style="color: #64748b; font-size: 0.75rem; margin-top: 2px;">{{hora}}</div></div>
        </div>
        {{/examenes}}
        {{^examenes}}<div style="padding: 10px 12px; color: #64748b;">Sin fechas de examen registradas.</div>{{/examenes}}
      </div>
    </div>
    <div style="padding: 20px 24px; background: #fafaf9; display: flex; flex-direction: column; gap: 10px;">
      <p style="margin: 0; font-size: 0.82rem; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">Conceptos fundamentales</p>
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid #8b5cf6; border-radius: 6px; padding: 10px 12px; font-size: 0.84rem;">
        <div style="font-weight: bold; color: #1e293b; margin-bottom: 4px;">RA y CE</div>
        <div style="color: #475569;">El <strong>Resultado de Aprendizaje (RA)</strong> define las capacidades globales del módulo. El <strong>Criterio de Evaluación (CE)</strong> es el indicador concreto y medible que demuestra su consecución.</div>
      </div>
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid #3b82f6; border-radius: 6px; padding: 10px 12px; font-size: 0.84rem;">
        <div style="font-weight: bold; color: #1e293b; margin-bottom: 2px;">Evaluación y superación</div>
        <div style="color: #475569;">Se considera superado un criterio con una calificación mínima de <strong>5,0 sobre 10</strong>. Para superar un RA deben superarse todos sus CE y, para aprobar el módulo, deben superarse todos los RA.</div>
      </div>
    </div>
  </div>

  <div style="padding: 14px 24px; background: #ffffff; border-top: 1px solid #f1f5f9; text-align: center;">
    <span style="font-weight: 600; color: #1e3a8a; font-size: 0.95rem;"> 🚀 {{cierre}} </span>
  </div>
</div>`
