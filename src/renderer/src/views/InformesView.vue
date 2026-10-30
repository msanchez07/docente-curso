<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { calcularResumenClase } from '@shared/calcular-calificaciones'
import { etiquetaModalidad } from '@shared/grupos'
import BotonVolver from '@renderer/components/BotonVolver.vue'
import Modal from '@renderer/components/Modal.vue'
import type {
  AlumnoClase,
  EntregaClase,
  FilaCalificacionClase,
  GrupoClase,
  NotaGuardadaClase,
  PeriodoFormacionEmpresa,
  ResumenCalificacionesClase
} from '@shared/tipos'
import { useGruposClaseStore } from '@renderer/stores/grupos-clase'
import SelectButton from '@renderer/components/SelectButton.vue'

const route = useRoute()
const store = useGruposClaseStore()
const grupo = ref<GrupoClase | null>(null)
const resumen = ref<ResumenCalificacionesClase | null>(null)
const entregasClase = ref<EntregaClase[]>([])
const notasClase = ref<NotaGuardadaClase[]>([])
const alumnado = ref<AlumnoClase[]>([])
const formacion = ref<PeriodoFormacionEmpresa[]>([])
const visor = ref<HTMLIFrameElement | null>(null)
type AccionInforme = 'imprimir' | 'html' | 'csv'
type SeccionInforme =
  'detalle' | 'avaluaciones' | 'categorias' | 'formacion' | 'alumnado' | 'graficas'
const accionPendiente = ref<AccionInforme | null>(null)
const seleccion = ref<Record<SeccionInforme, boolean>>({
  detalle: true,
  avaluaciones: true,
  categorias: true,
  formacion: true,
  alumnado: true,
  graficas: true
})
const cargando = ref(true)
const error = ref<string | null>(null)
const alumnoId = ref<number | ''>('')
const tipoInforme = ref('resumen')
const opcionesInforme = [
  { value: 'resumen', label: 'Resumen' },
  { value: 'calificaciones', label: 'Calificaciones' },
  { value: 'ras', label: 'RA superados' }
]

const id = computed(() => Number(route.params.grupoId))

function escapar(texto: string): string {
  return texto
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function formato(nota: number | null): string {
  return nota === null ? '—' : nota.toFixed(2).replace('.', ',')
}

function estado(fila: FilaCalificacionClase): string {
  return fila.aprobado ? 'Apto' : fila.vaAConvocatoria ? 'A convocatoria' : 'No apto'
}

function claseEstado(fila: FilaCalificacionClase): string {
  return fila.aprobado ? 'apto' : fila.vaAConvocatoria ? 'convocatoria' : 'no-apto'
}

function badge(fila: FilaCalificacionClase): string {
  return `<span class="estado estado--${claseEstado(fila)}">${escapar(estado(fila))}</span>`
}

const filas = computed(() => {
  if (!resumen.value) return []
  return alumnoId.value === ''
    ? resumen.value.alumnos
    : resumen.value.alumnos.filter((fila) => fila.alumno.id === alumnoId.value)
})

const resumenGrupo = computed(() => {
  const alumnos = resumen.value?.alumnos ?? []
  const conNota = alumnos.filter((fila) => fila.notaFinal !== null)
  const media =
    conNota.length === 0
      ? null
      : Math.round(
          (conNota.reduce((total, fila) => total + (fila.notaFinal ?? 0), 0) / conNota.length) * 100
        ) / 100
  return {
    total: alumnos.length,
    aprobados: alumnos.filter((fila) => fila.aprobado).length,
    media,
    incompletos: alumnos.filter((fila) => fila.incompleta).length
  }
})

function etiquetaTipo(tipo: string): string {
  const etiquetas: Record<string, string> = {
    tarea: 'Tarea',
    practica: 'Práctica',
    examen: 'Examen',
    proyecto: 'Proyecto'
  }
  return etiquetas[tipo] ?? tipo
}

function fechaCorta(fecha: string | null): string {
  if (!fecha) return '—'
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio}`
}

function nombreAvaluacion(id: string): string {
  return resumen.value?.modelo.avaluaciones.find((avaluacion) => avaluacion.id === id)?.nombre ?? id
}

function notaClase(nota: number | null): string {
  if (nota === null) return 'nota-sin'
  return nota >= 5 ? 'nota-ok' : 'nota-no'
}

const filasEntregas = computed(() => {
  const total = alumnado.value.length
  return entregasClase.value.map((entrega) => {
    const registros = notasClase.value.filter(
      (nota) => nota.entrega_id === entrega.id && nota.nota !== null
    )
    const suma = registros.reduce((totalNotas, nota) => totalNotas + (nota.nota ?? 0), 0)
    const media = registros.length === 0 ? null : Math.round((suma / registros.length) * 100) / 100
    const aprobadas = registros.filter((nota) => (nota.nota ?? 0) >= 5).length
    return {
      entrega,
      conNota: registros.length,
      pendientes: Math.max(0, total - registros.length),
      media,
      aprobadas,
      porcentajeAprobado:
        registros.length === 0 ? null : Math.round((aprobadas / registros.length) * 100)
    }
  })
})

const resumenEntregas = computed(() => {
  const filas = filasEntregas.value
  return {
    total: filas.length,
    examenes: filas.filter((fila) => fila.entrega.tipo === 'examen').length,
    pendientes: filas.reduce((total, fila) => total + fila.pendientes, 0),
    completas: filas.filter((fila) => fila.pendientes === 0).length,
    sinNotas: filas.filter((fila) => fila.conNota === 0).length
  }
})

const resumenAvaluaciones = computed(() => {
  if (!resumen.value) return []
  return resumen.value.modelo.avaluaciones.map((avaluacion) => {
    const notas = resumen
      .value!.alumnos.map(
        (fila) =>
          fila.avaluaciones.find((item) => item.avaluacionId === avaluacion.id)?.nota ?? null
      )
      .filter((nota): nota is number => nota !== null)
    const media =
      notas.length === 0
        ? null
        : Math.round((notas.reduce((total, nota) => total + nota, 0) / notas.length) * 100) / 100
    return {
      ...avaluacion,
      media,
      aprobados: notas.filter((nota) => nota >= 5).length,
      evaluados: notas.length,
      entregas: entregasClase.value.filter((entrega) => entrega.avaluacion_id === avaluacion.id)
        .length
    }
  })
})

const resumenCategorias = computed(() => {
  if (!resumen.value) return []
  return resumen.value.modelo.categorias.map((categoria) => {
    const medias = resumen
      .value!.alumnos.flatMap((fila) =>
        fila.avaluaciones.flatMap((avaluacion) =>
          avaluacion.categorias
            .filter((item) => item.categoriaId === categoria.id)
            .map((item) => item.media)
        )
      )
      .filter((nota): nota is number => nota !== null)
    const media =
      medias.length === 0
        ? null
        : Math.round((medias.reduce((total, nota) => total + nota, 0) / medias.length) * 100) / 100
    return {
      ...categoria,
      media,
      entregas: entregasClase.value.filter((entrega) => entrega.categoria_id === categoria.id)
        .length
    }
  })
})

const alumnoFila = computed(() => filas.value[0] ?? null)

function estadoEntrega(fila: (typeof filasEntregas.value)[number]): {
  texto: string
  clase: string
} {
  if (fila.conNota === 0) return { texto: 'Sin corregir', clase: 'no-apto' }
  if (fila.pendientes > 0) return { texto: `${fila.pendientes} pendientes`, clase: 'convocatoria' }
  return { texto: 'Completa', clase: 'apto' }
}

function colorNota(valor: number | null, umbral = 5): string {
  if (valor === null) return '#cbd5e1'
  return valor >= umbral ? '#0d5c8c' : '#d98a2b'
}

function svgBarras(
  datos: { etiqueta: string; valor: number | null }[],
  maximo = 10,
  umbral = 5,
  sufijo = ''
): string {
  const ancho = 520
  const alto = 180
  const izquierda = 34
  const derecha = 8
  const superior = 14
  const inferior = 34
  const base = alto - inferior
  const util = ancho - izquierda - derecha
  const paso = util / Math.max(datos.length, 1)
  const anchoBarra = Math.min(54, paso * 0.5)

  const pasoEscala = maximo <= 10 ? 2 : 20
  const marcas: number[] = []
  for (let valor = 0; valor <= maximo; valor += pasoEscala) marcas.push(valor)
  const lineas = marcas
    .map((valor) => {
      const y = base - (valor / maximo) * (base - superior)
      return `<line x1="${izquierda}" y1="${y}" x2="${ancho - derecha}" y2="${y}" stroke="#e8eef4" stroke-width="1"/><text x="${izquierda - 6}" y="${y + 3}" text-anchor="end" fill="#8a98a8" font-size="8">${valor}</text>`
    })
    .join('')

  const barras = datos
    .map((dato, indice) => {
      const x = izquierda + paso * indice + (paso - anchoBarra) / 2
      const valor = dato.valor === null ? 0 : Math.max(0, Math.min(maximo, dato.valor))
      const altura = (valor / maximo) * (base - superior)
      const y = base - altura
      return `<rect x="${x}" y="${y}" width="${anchoBarra}" height="${altura}" rx="3" fill="${colorNota(dato.valor, umbral)}"/><text x="${x + anchoBarra / 2}" y="${y - 4}" text-anchor="middle" fill="#36536b" font-size="8.5" font-weight="700">${dato.valor === null ? '—' : `${formato(dato.valor)}${sufijo}`}</text><text x="${x + anchoBarra / 2}" y="${base + 14}" text-anchor="middle" fill="#5a6b7b" font-size="8.5">${escapar(dato.etiqueta)}</text>`
    })
    .join('')

  return `<svg viewBox="0 0 ${ancho} ${alto}" role="img" aria-label="Gráfica de medias">${lineas}${barras}<line x1="${izquierda}" y1="${base}" x2="${ancho - derecha}" y2="${base}" stroke="#cfdae5"/></svg>`
}

function colorOscuro(hex: string, factor = 0.72): string {
  const valor = hex.replace('#', '')
  const completo =
    valor.length === 3
      ? valor
          .split('')
          .map((caracter) => caracter + caracter)
          .join('')
      : valor
  const numero = Number.parseInt(completo, 16)
  const r = Math.round(((numero >> 16) & 255) * factor)
  const g = Math.round(((numero >> 8) & 255) * factor)
  const b = Math.round((numero & 255) * factor)
  return `rgb(${r}, ${g}, ${b})`
}

function svgTarta(
  segmentos: { etiqueta: string; valor: number; color: string }[],
  centro = 'alumnos'
): string {
  const total = segmentos.reduce((suma, segmento) => suma + segmento.valor, 0)
  const cx = 64
  const cy = 54
  const rx = 48
  const ry = 29
  const profundidad = 12
  let angulo = -Math.PI / 2
  const lados: string[] = []
  const superficies: string[] = []

  for (const segmento of segmentos) {
    if (segmento.valor <= 0) continue
    const proporcion = total === 0 ? 0 : segmento.valor / total
    const inicio = angulo
    const fin = angulo + proporcion * Math.PI * 2
    angulo = fin
    if (proporcion >= 0.9999) {
      lados.push(
        `<ellipse cx="${cx}" cy="${cy + profundidad}" rx="${rx}" ry="${ry}" fill="${colorOscuro(segmento.color)}"/>`
      )
      superficies.push(
        `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${segmento.color}" stroke="#ffffff" stroke-width="1.5"/>`
      )
      continue
    }
    const x1 = cx + rx * Math.cos(inicio)
    const y1 = cy + ry * Math.sin(inicio)
    const x2 = cx + rx * Math.cos(fin)
    const y2 = cy + ry * Math.sin(fin)
    const grande = proporcion > 0.5 ? 1 : 0

    lados.push(
      `<path d="M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${rx} ${ry} 0 ${grande} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${x2.toFixed(2)} ${(y2 + profundidad).toFixed(2)} A ${rx} ${ry} 0 ${grande} 0 ${x1.toFixed(2)} ${(y1 + profundidad).toFixed(2)} Z" fill="${colorOscuro(segmento.color)}"/>`
    )
    superficies.push(
      `<path d="M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${rx} ${ry} 0 ${grande} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z" fill="${segmento.color}" stroke="#ffffff" stroke-width="1.5"/>`
    )

    if (proporcion >= 0.08) {
      const medio = (inicio + fin) / 2
      const etiquetaX = cx + rx * 0.58 * Math.cos(medio)
      const etiquetaY = cy + ry * 0.58 * Math.sin(medio)
      superficies.push(
        `<text x="${etiquetaX.toFixed(2)}" y="${etiquetaY.toFixed(2)}" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" font-size="8" font-weight="700">${Math.round(proporcion * 100)}%</text>`
      )
    }
  }

  return `<svg viewBox="0 0 128 116" role="img" aria-label="Distribución"><ellipse cx="${cx}" cy="${cy + profundidad + 5}" rx="${rx + 4}" ry="${ry}" fill="#dbe4ee" opacity="0.55"/>${lados.join('')}${superficies.join('')}<text x="${cx}" y="111" text-anchor="middle" fill="#36536b" font-size="8.5" font-weight="700">${total} ${escapar(centro)}</text></svg>`
}
function leyenda(segmentos: { etiqueta: string; valor: number; color: string }[]): string {
  return segmentos
    .map(
      (segmento) =>
        `<span><i style="background:${segmento.color}"></i>${escapar(segmento.etiqueta)} <strong>${segmento.valor}</strong></span>`
    )
    .join('')
}

const distribucion = computed(() => {
  const filasAlumnado = filas.value
  return [
    {
      etiqueta: 'Aprobados',
      valor: filasAlumnado.filter((fila) => fila.aprobado).length,
      color: '#1e7a4b'
    },
    {
      etiqueta: 'A convocatoria',
      valor: filasAlumnado.filter(
        (fila) => fila.notaFinal !== null && !fila.aprobado && fila.vaAConvocatoria
      ).length,
      color: '#d98a2b'
    },
    {
      etiqueta: 'No aptos',
      valor: filasAlumnado.filter(
        (fila) => fila.notaFinal !== null && !fila.aprobado && !fila.vaAConvocatoria
      ).length,
      color: '#b42318'
    },
    {
      etiqueta: 'Sin datos',
      valor: filasAlumnado.filter((fila) => fila.notaFinal === null).length,
      color: '#9aa7b5'
    }
  ]
})

function hoyLocal(): string {
  const ahora = new Date()
  const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function estadoFormacion(periodo: PeriodoFormacionEmpresa): string {
  const hoy = hoyLocal()
  if (hoy < periodo.fecha_inicio) return 'Próximo'
  if (hoy > periodo.fecha_fin) return 'Finalizado'
  return 'En empresa'
}

function nombreAlumno(alumnoIdFormacion: number): string {
  const alumno = alumnado.value.find((item) => item.id === alumnoIdFormacion)
  return alumno ? `${alumno.apellidos}, ${alumno.nombre}` : `Alumno ${alumnoIdFormacion}`
}

const formacionVisible = computed(() => {
  if (alumnoId.value === '') return formacion.value
  return formacion.value.filter((periodo) => periodo.alumno_id === Number(alumnoId.value))
})

function filasFormacionHtml(incluirAlumno: boolean): string {
  return formacionVisible.value
    .map((periodo) => {
      const estadoPeriodo = estadoFormacion(periodo)
      const clase =
        estadoPeriodo === 'En empresa'
          ? 'apto'
          : estadoPeriodo === 'Finalizado'
            ? 'apto'
            : 'convocatoria'
      return `<tr>${incluirAlumno ? `<td>${escapar(nombreAlumno(periodo.alumno_id))}</td>` : ''}<td><strong>${escapar(periodo.empresa)}</strong></td><td>${fechaCorta(periodo.fecha_inicio)} – ${fechaCorta(periodo.fecha_fin)}</td><td><span class="estado estado--${clase}">${estadoPeriodo}</span></td><td>${escapar(periodo.observaciones ?? '—')}</td></tr>`
    })
    .join('')
}

function seccionFormacionHtml(incluirAlumno: boolean): string {
  const cabecera = `<h2>Formación en empresa</h2>`
  if (formacionVisible.value.length === 0) {
    return `${cabecera}<p class="sin-datos">No hay periodos de formación en empresa registrados.</p>`
  }
  return `${cabecera}<table><thead><tr>${incluirAlumno ? '<th>Alumno/a</th>' : ''}<th>Empresa</th><th>Periodo</th><th>Estado</th><th>Observaciones</th></tr></thead><tbody>${filasFormacionHtml(incluirAlumno)}</tbody></table>`
}

function criteriosPorRa(fila: FilaCalificacionClase): { etiqueta: string; valor: number }[] {
  return fila.ras.map((ra) => {
    const total = ra.criterios.length
    const superados = ra.criterios.filter((criterio) => criterio.superado).length
    return {
      etiqueta: ra.codigo,
      valor: total === 0 ? 0 : Math.round((superados / total) * 100)
    }
  })
}

function criteriosGrupoPorRa(): { etiqueta: string; valor: number }[] {
  const ras = filas.value[0]?.ras ?? []
  return ras.map((ra) => {
    let total = 0
    let superados = 0
    for (const fila of filas.value) {
      const criterios = fila.ras.find((item) => item.codigo === ra.codigo)?.criterios ?? []
      total += criterios.length
      superados += criterios.filter((criterio) => criterio.superado).length
    }
    return {
      etiqueta: ra.codigo,
      valor: total === 0 ? 0 : Math.round((superados / total) * 100)
    }
  })
}

function notasEntregaAlumno(
  fila: FilaCalificacionClase
): { etiqueta: string; valor: number | null }[] {
  return filasEntregas.value.map((resumenEntrega, indice) => {
    const registro = notasClase.value.find(
      (nota) => nota.alumno_id === fila.alumno.id && nota.entrega_id === resumenEntrega.entrega.id
    )
    return { etiqueta: `E${indice + 1}`, valor: registro?.nota ?? null }
  })
}

const fechaGeneracion = new Date().toLocaleDateString('es-ES', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
})

const opcionesSeccion = computed(() => {
  const detalle =
    tipoInforme.value === 'ras'
      ? 'Matriz de RA'
      : tipoInforme.value === 'calificaciones'
        ? 'Tabla de calificaciones'
        : 'Entregas y exámenes'
  if (accionPendiente.value === 'csv') {
    return [{ id: 'detalle', etiqueta: detalle }]
  }
  const opciones: { id: SeccionInforme; etiqueta: string }[] = []
  if (tipoInforme.value === 'resumen') {
    opciones.push({ id: 'detalle', etiqueta: detalle })
  }
  if (tipoInforme.value === 'resumen' && alumnoId.value === '') {
    opciones.push(
      { id: 'avaluaciones', etiqueta: 'Resumen por avaluación' },
      { id: 'categorias', etiqueta: 'Resumen por categoría' },
      { id: 'alumnado', etiqueta: 'Alumnado' }
    )
  }
  if (tipoInforme.value === 'resumen' && alumnoId.value !== '') {
    opciones.push({ id: 'avaluaciones', etiqueta: 'Avaluaciones' })
  }
  if (tipoInforme.value === 'ras' || tipoInforme.value === 'resumen') {
    opciones.push({ id: 'graficas', etiqueta: 'Gráficas' })
  }
  opciones.push({ id: 'formacion', etiqueta: 'Formación en empresa' })
  return opciones
})

const tituloAccion = computed(() => {
  if (accionPendiente.value === 'imprimir') return 'Opciones de impresión'
  if (accionPendiente.value === 'html') return 'Opciones de exportación HTML'
  return 'Opciones de descarga CSV'
})

const etiquetaAccion = computed(() => {
  if (accionPendiente.value === 'imprimir') return 'Imprimir / PDF'
  if (accionPendiente.value === 'html') return 'Descargar HTML'
  return 'Descargar CSV'
})

const haySeleccion = computed(() =>
  opcionesSeccion.value.some((opcion) => seleccion.value[opcion.id])
)

const todasSeleccionadas = computed(() =>
  opcionesSeccion.value.every((opcion) => seleccion.value[opcion.id])
)

function abrirOpciones(accion: AccionInforme): void {
  accionPendiente.value = accion
}

function alternarTodas(): void {
  const activar = !opcionesSeccion.value.every((opcion) => seleccion.value[opcion.id])
  for (const opcion of opcionesSeccion.value) seleccion.value[opcion.id] = activar
}

function ejecutarAccion(): void {
  const accion = accionPendiente.value
  if (!accion || !haySeleccion.value) return
  accionPendiente.value = null
  if (accion === 'imprimir') {
    window.setTimeout(() => imprimir(), 80)
  } else if (accion === 'html') {
    descargar('informe.html', htmlActivo.value, 'text/html')
  } else {
    descargarCsv()
  }
}

function filtrarSecciones(html: string): string {
  let resultado = html
  const secciones: SeccionInforme[] = [
    'detalle',
    'avaluaciones',
    'categorias',
    'formacion',
    'alumnado',
    'graficas'
  ]
  for (const seccion of secciones) {
    if (seleccion.value[seccion]) continue
    resultado = resultado.replace(
      new RegExp(`<!-- ${seccion}:inicio -->[\\s\\S]*?<!-- ${seccion}:fin -->`, 'g'),
      ''
    )
  }
  return resultado
}

const estilos = `
  @page { size: A4; margin: 13mm 14mm 16mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 26px;
    color: #1c2a38;
    background: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 11.5px;
    line-height: 1.45;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .informe { width: 100%; max-width: none; margin: 0; }
  .informe-cabecera {
    position: relative;
    display: flex;
    justify-content: space-between;
    gap: 24px;
    padding: 18px 20px;
    border: 1px solid #dbe5ee;
    border-left: 6px solid #0d5c8c;
    border-radius: 10px;
    background: linear-gradient(135deg, #f7fafc 0%, #ffffff 72%);
    break-inside: avoid;
  }
  .eyebrow {
    margin: 0 0 5px;
    color: #0d5c8c;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: 0.11em;
    text-transform: uppercase;
  }
  h1 { margin: 0 0 4px; color: #102a43; font-size: 24px; letter-spacing: -0.025em; }
  h2 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 26px 0 10px;
    padding-bottom: 6px;
    border-bottom: 1px solid #e3e7ee;
    color: #0d5c8c;
    font-size: 14.5px;
    break-after: avoid;
  }
  h2::before {
    content: "";
    width: 4px;
    height: 15px;
    border-radius: 3px;
    background: #d98a2b;
  }
  h3 { margin: 0; font-size: 13px; }
  .subtitulo { margin: 0; color: #5a6b7b; }
  .informe-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 5px;
    color: #5a6b7b;
    font-size: 10px;
    text-align: right;
    white-space: nowrap;
  }
  .informe-meta span {
    padding: 3px 9px;
    border: 1px solid #dfe7ef;
    border-radius: 999px;
    background: #ffffff;
  }
  .criterios {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    margin: 18px 0 4px;
  }
  .criterios > div {
    position: relative;
    padding: 10px 12px;
    border: 1px solid #e3e7ee;
    border-radius: 8px;
    background: #fbfcfd;
    break-inside: avoid;
  }
  .criterios > div::before {
    content: "";
    position: absolute;
    top: 0;
    left: 12px;
    width: 32px;
    height: 3px;
    border-radius: 0 0 3px 3px;
    background: #d98a2b;
  }
  .criterios span {
    display: block;
    margin-bottom: 3px;
    color: #667085;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }
  .criterios strong { color: #1c2a38; font-size: 11px; font-weight: 600; }
  .resumen {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    margin: 18px 0;
  }
  .resumen > div {
    position: relative;
    overflow: hidden;
    padding: 11px 12px;
    border: 1px solid #e3e7ee;
    border-radius: 8px;
    background: #ffffff;
    break-inside: avoid;
  }
  .resumen > div::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 3px;
    background: #0d5c8c;
  }
  .resumen > div:nth-child(2)::before { background: #1e7a4b; }
  .resumen > div:nth-child(3)::before { background: #d98a2b; }
  .resumen > div:nth-child(4)::before { background: #6b7a90; }
  .resumen span { display: block; color: #667085; font-size: 9.5px; }
  .resumen strong {
    display: block;
    margin-top: 3px;
    color: #102a43;
    font-size: 22px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    line-height: 1.1;
  }
  .resumen strong.estado--apto,
  .resumen strong.estado--convocatoria,
  .resumen strong.estado--no-apto { font-size: 13px; line-height: 1.4; }
  .resumen strong.estado--apto { color: #067647; }
  .resumen strong.estado--convocatoria { color: #b54708; }
  .resumen strong.estado--no-apto { color: #b42318; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 4px;
    break-inside: auto;
  }
  th {
    padding: 7px 8px;
    border-bottom: 2px solid #cfdae5;
    background: #eef4f8;
    color: #36536b;
    font-size: 8.8px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-align: left;
    text-transform: uppercase;
  }
  td {
    padding: 7px 8px;
    border-bottom: 1px solid #e7edf3;
    vertical-align: middle;
  }
  tbody tr:nth-child(even) { background: #fbfcfd; }
  tbody tr:last-child td { border-bottom: 0; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .estado {
    display: inline-block;
    padding: 2px 8px;
    border: 1px solid transparent;
    border-radius: 999px;
    font-size: 9px;
    font-weight: 700;
    white-space: nowrap;
  }
  .estado--apto { border-color: #b7e4c7; background: #ecfdf3; color: #067647; }
  .estado--convocatoria { border-color: #f2d9a4; background: #fffaeb; color: #b54708; }
  .estado--no-apto { border-color: #fecdca; background: #fef3f2; color: #b42318; }
  .detalle-categorias {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    margin-top: 5px;
    color: #667085;
    font-size: 10px;
  }
  .detalle-categorias span { white-space: nowrap; }
  .aviso {
    margin-top: 16px;
    padding: 10px 12px;
    border: 1px solid #f2d9a4;
    border-radius: 8px;
    background: #fffaeb;
    color: #b54708;
    font-size: 10.5px;
    break-inside: avoid;
  }
  .sin-datos { padding: 14px 0; color: #667085; }
  .pie {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    margin-top: 30px;
    padding-top: 10px;
    border-top: 1px solid #dbe5ee;
    color: #7a8898;
    font-size: 9px;
    break-inside: avoid;
  }
  .ra-matriz th,
  .ra-matriz td { text-align: center; }
  .ra-matriz th.ra-col { padding: 6px 4px; font-size: 8.5px; }
  .ra-matriz td.ra-col { padding: 6px 4px; }
  .ra-matriz td.alumno { text-align: left; }
  .ra-celda {
    display: inline-block;
    padding: 2px 5px;
    border-radius: 4px;
    font-size: 9px;
    font-weight: 700;
    white-space: nowrap;
  }
  .ra-celda--ok { background: #ecfdf3; color: #067647; }
  .ra-celda--no { background: #fef3f2; color: #b42318; }
  .ra-celda--sin { background: #f2f4f7; color: #667085; }
  .ra-resumen { display: flex; gap: 8px; flex-wrap: wrap; margin: 10px 0; }
  .ra-resumen .chip { font-size: 10px; }
  .nota-ok { color: #067647; font-weight: 700; }
  .nota-no { color: #b42318; font-weight: 700; }
  .nota-sin { color: #7a8898; }
  .tabla-entregas td { font-size: 9.6px; }
  .tabla-entregas th { font-size: 8.4px; }
  .tabla-entregas .entrega-titulo { font-weight: 600; color: #1c2a38; }
  .graficas {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin: 14px 0 4px;
    break-inside: avoid;
  }
  .graficas--tres { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .graficas--una { grid-template-columns: 1fr; }
  .grafica {
    padding: 12px 14px;
    border: 1px solid #e3e7ee;
    border-radius: 10px;
    background: #fbfcfd;
    break-inside: avoid;
  }
  .grafica h3 {
    margin: 0 0 6px;
    color: #102a43;
    font-size: 11.5px;
  }
  .grafica svg { display: block; width: 100%; height: auto; }
  .grafica > svg { height: 190px; }
  .donut-wrap { display: flex; align-items: center; gap: 14px; }
  .donut-wrap svg { width: 150px; height: 150px; flex: 0 0 150px; }
  .leyenda { display: flex; flex-direction: column; gap: 6px; color: #5a6b7b; font-size: 9.5px; }
  .leyenda span { display: flex; align-items: center; gap: 6px; }
  .leyenda i { display: inline-block; width: 9px; height: 9px; border-radius: 3px; }
  .leyenda strong { margin-left: auto; color: #1c2a38; }
  .grafica__nota { margin: 4px 0 0; color: #7a8898; font-size: 8px; line-height: 1.35; }
  .formacion-total { margin: 2px 0 6px; color: #5a6b7b; font-size: 10.5px; }
  .formacion-total strong { color: #102a43; font-size: 13px; }
  @media print {
    body { padding: 0; }
    .informe { max-width: none; }
    thead { display: table-header-group; }
    tr, .criterios > div, .resumen > div, .informe-cabecera, .graficas { break-inside: avoid; }
    h2 { break-after: avoid; }
    a { color: inherit; text-decoration: none; }
  }
`

const html = computed(() => {
  if (!resumen.value || !grupo.value) return ''
  const modelo = resumen.value.modelo
  const categorias = modelo.categorias.map((c) => `${c.nombre} ${c.peso} %`).join(' + ')
  const avaluaciones = modelo.avaluaciones.map((a) => `${a.peso} % ${a.nombre}`).join(' + ')
  const minimos = [
    `Entrega ${modelo.requisitos.find((r) => r.id === 'notaMinimaEntrega')?.valor ?? 4}`,
    `Categoría ${modelo.requisitos.find((r) => r.id === 'notaMinimaCategoria')?.valor ?? 5}`,
    `Avaluación ${modelo.requisitos.find((r) => r.id === 'notaMinimaAvaluacion')?.valor ?? 5}`
  ].join(' · ')

  const cabecera = `
    <header class="informe-cabecera">
      <div>
        <p class="eyebrow">Informe de calificaciones</p>
        <h1>${escapar(grupo.value.nombre)}</h1>
        <p class="subtitulo">
          ${escapar(grupo.value.modulo_nombre)} · Curso
          ${escapar(grupo.value.curso_academico_nombre)} ·
          ${escapar(etiquetaModalidad(grupo.value.modalidad))}
        </p>
      </div>
      <div class="informe-meta">
        <span>${alumnoId.value === '' ? 'Informe de grupo' : 'Informe individual'}</span>
        <span>Generado el ${fechaGeneracion}</span>
      </div>
    </header>

    <section class="criterios">
      <div>
        <span>Categorías</span>
        <strong>${escapar(categorias)}</strong>
      </div>
      <div>
        <span>Fórmula final</span>
        <strong>${escapar(avaluaciones)}</strong>
      </div>
      <div>
        <span>Mínimos</span>
        <strong>${escapar(minimos)}</strong>
      </div>
    </section>
  `

  if (alumnoId.value !== '') {
    const fila = filas.value[0]
    if (!fila) return ''
    const filasAvaluaciones = fila.avaluaciones
      .map((avaluacion) => {
        const detalle = avaluacion.categorias
          .map(
            (categoria) =>
              `<span>${escapar(categoria.nombre)} ${categoria.peso} %: ${formato(categoria.media)}</span>`
          )
          .join('')
        return `
          <tr>
            <td>${escapar(avaluacion.nombre)}</td>
            <td class="num">${formato(avaluacion.nota)}</td>
            <td>
              <span class="estado ${
                avaluacion.suspensa
                  ? 'estado--convocatoria'
                  : avaluacion.nota === null
                    ? 'estado--no-apto'
                    : 'estado--apto'
              }">
                ${avaluacion.nota === null ? 'Sin datos' : avaluacion.suspensa ? 'Suspensa' : 'Correcta'}
              </span>
            </td>
            <td>
              ${escapar(avaluacion.motivos.join(' · ') || 'Sin incidencias')}
              ${detalle ? `<div class="detalle-categorias">${detalle}</div>` : ''}
            </td>
          </tr>
        `
      })
      .join('')

    const evaluacionesConNota = fila.avaluaciones.filter((a) => a.nota !== null).length

    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${estilos}</style></head><body>
      <div class="informe">
        ${cabecera}
        <h2>${escapar(fila.alumno.apellidos)}, ${escapar(fila.alumno.nombre)}</h2>
        <div class="resumen">
          <div><span>Nota final</span><strong>${formato(fila.notaFinal)}</strong></div>
          <div><span>Estado</span><strong class="estado--${claseEstado(fila)}">${estado(fila)}</strong></div>
          <div><span>Avaluaciones con nota</span><strong>${evaluacionesConNota}/${fila.avaluaciones.length}</strong></div>
          <div><span>Entregas sin corregir</span><strong>${fila.incompleta ? 'Sí' : 'No'}</strong></div>
        </div>
        <table>
          <thead><tr><th>Avaluación</th><th class="num">Nota</th><th>Estado</th><th>Detalle</th></tr></thead>
          <tbody>${filasAvaluaciones}</tbody>
        </table>
        <!-- formacion:inicio -->${seccionFormacionHtml(false)}<!-- formacion:fin -->
        ${fila.incompleta ? '<p class="aviso">Hay entregas sin corregir; cuentan como 0 en el cálculo.</p>' : ''}
        <!-- graficas:fin --><div class="pie">
          <span>${escapar(grupo.value.ciclo_nombre)} · ${escapar(grupo.value.modulo_siglas)}</span>
          <span>Gestión del curso · ${fechaGeneracion}</span>
        </div>
      </div>
    </body></html>`
  }

  const cuerpo = filas.value
    .map((fila) => {
      const celdas = fila.avaluaciones
        .map((avaluacion) => `<td class="num">${formato(avaluacion.nota)}</td>`)
        .join('')
      return `
        <tr>
          <td>${escapar(fila.alumno.apellidos)}, ${escapar(fila.alumno.nombre)}</td>
          ${celdas}
          <td class="num"><strong>${formato(fila.notaFinal)}</strong></td>
          <td>${badge(fila)}</td>
        </tr>
      `
    })
    .join('')

  const cabecerasAvaluaciones = modelo.avaluaciones
    .map((avaluacion) => `<th class="num">${escapar(avaluacion.nombre)}</th>`)
    .join('')

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${estilos}</style></head><body>
    <div class="informe">
      ${cabecera}
      <div class="resumen">
        <div><span>Alumnado</span><strong>${resumenGrupo.value.total}</strong></div>
        <div><span>Aprobados</span><strong>${resumenGrupo.value.aprobados}</strong></div>
        <div><span>Media del grupo</span><strong>${formato(resumenGrupo.value.media)}</strong></div>
        <div><span>Incompletos</span><strong>${resumenGrupo.value.incompletos}</strong></div>
      </div>
      ${
        filas.value.length === 0
          ? '<p class="sin-datos">No hay alumnado que mostrar.</p>'
          : `<table>
              <thead><tr><th>Alumno/a</th>${cabecerasAvaluaciones}<th class="num">Final</th><th>Estado</th></tr></thead>
              <tbody>${cuerpo}</tbody>
            </table>`
      }
      <!-- graficas:fin --><div class="pie">
        <span>${escapar(grupo.value.ciclo_nombre)} · ${escapar(grupo.value.modulo_siglas)}</span>
        <span>Gestión del curso · ${fechaGeneracion}</span>
      </div>
    </div>
  </body></html>`
})

const htmlRas = computed(() => {
  if (!resumen.value || !grupo.value) return ''
  const modelo = resumen.value.modelo
  const ras = resumen.value.alumnos[0]?.ras ?? []
  const totalRas = ras.length
  const minAprobado = Number(
    modelo.requisitos.find((requisito) => requisito.id === 'aprobado')?.valor ?? 5
  )
  const conTodos = resumen.value.alumnos.filter((fila) => fila.todosRasSuperados).length
  const conPendientes = resumen.value.alumnos.filter(
    (fila) => fila.rasNoSuperados.length > 0
  ).length
  const cabecera = `
    <header class="informe-cabecera">
      <div>
        <p class="eyebrow">Informe de RA superados</p>
        <h1>${escapar(grupo.value.nombre)}</h1>
        <p class="subtitulo">
          ${escapar(grupo.value.modulo_nombre)} · Curso
          ${escapar(grupo.value.curso_academico_nombre)} ·
          ${escapar(etiquetaModalidad(grupo.value.modalidad))}
        </p>
      </div>
      <div class="informe-meta">
        <span>${alumnoId.value === '' ? 'Informe de grupo' : 'Informe individual'}</span>
        <span>Generado el ${fechaGeneracion}</span>
      </div>
    </header>
    <section class="criterios">
      <div>
        <span>RA del módulo</span>
        <strong>${totalRas}</strong>
      </div>
      <div>
        <span>Mínimo para superar</span>
        <strong>${formato(minAprobado)}</strong>
      </div>
      <div>
        <span>Fuente</span>
        <strong>Entregas mapeadas a RA</strong>
      </div>
    </section>
  `

  if (alumnoId.value !== '') {
    const fila = filas.value[0]
    if (!fila) return ''
    const filasRa = fila.ras
      .map(
        (ra) => `
        <tr>
          <td>${escapar(ra.codigo)}</td>
          <td>${escapar(ra.descripcion)}</td>
          <td class="num">${formato(ra.nota)}</td>
          <td>
            <span class="estado ${
              ra.superado
                ? 'estado--apto'
                : ra.nota === null
                  ? 'estado--no-apto'
                  : 'estado--convocatoria'
            }">
              ${ra.superado ? 'Superado' : ra.nota === null ? 'Sin evaluar' : 'No superado'}
            </span>
          </td>
          <td class="num">${ra.entregas.length}</td>
        </tr>`
      )
      .join('')

    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${estilos}</style></head><body>
      <div class="informe">
        ${cabecera}
        <h2>${escapar(fila.alumno.apellidos)}, ${escapar(fila.alumno.nombre)}</h2>
        <div class="resumen">
          <div><span>RA superados</span><strong>${fila.ras.length - fila.rasNoSuperados.length}/${fila.ras.length}</strong></div>
          <div><span>RA pendientes</span><strong>${fila.rasNoSuperados.length}</strong></div>
          <div><span>Nota final</span><strong>${formato(fila.notaFinal)}</strong></div>
          <div><span>Estado</span><strong class="estado--${claseEstado(fila)}">${estado(fila)}</strong></div>
        </div>
        ${
          fila.rasNoSuperados.length > 0
            ? `<p class="aviso">RA no superados: <strong>${escapar(fila.rasNoSuperados.join(', '))}</strong></p>`
            : ''
        }
        <table>
          <thead><tr><th>RA</th><th>Descripción</th><th class="num">Nota</th><th>Estado</th><th class="num">Entregas</th></tr></thead>
          <tbody>${filasRa}</tbody>
        </table>
        <h2>Formación en empresa</h2>
        ${
          formacionVisible.value.length > 0
            ? `<table>
                <thead><tr><th>Empresa</th><th>Periodo</th><th>Estado</th><th>Observaciones</th></tr></thead>
                <tbody>${filasFormacionHtml(false)}</tbody>
              </table>`
            : '<p class="sin-datos">No hay periodos de formación en empresa registrados.</p>'
        }
        <!-- graficas:inicio --><h2>Gráficas</h2>
      <div class="graficas">
          <div class="grafica">
            <h3>Criterios superados por RA</h3>
            ${svgBarras(criteriosPorRa(fila), 100, 50, ' %')}
          </div>
          <div class="grafica">
            <h3>Resultados de aprendizaje</h3>
            <div class="donut-wrap">
              ${svgTarta(
                [
                  {
                    etiqueta: 'Superados',
                    valor: fila.ras.length - fila.rasNoSuperados.length,
                    color: '#1e7a4b'
                  },
                  { etiqueta: 'Pendientes', valor: fila.rasNoSuperados.length, color: '#b42318' }
                ],
                'RA'
              )}
              <div class="leyenda">
                ${leyenda([
                  {
                    etiqueta: 'Superados',
                    valor: fila.ras.length - fila.rasNoSuperados.length,
                    color: '#1e7a4b'
                  },
                  { etiqueta: 'Pendientes', valor: fila.rasNoSuperados.length, color: '#b42318' }
                ])}
              </div>
            </div>
          </div>
        </div>
        ${
          fila.rasNoSuperados.length > 0
            ? `<p class="aviso">RA no superados: <strong>${escapar(fila.rasNoSuperados.join(', '))}</strong></p>`
            : ''
        }
        <!-- graficas:fin --><div class="pie">
          <span>${escapar(grupo.value.ciclo_nombre)} · ${escapar(grupo.value.modulo_siglas)}</span>
          <span>Gestión del curso · ${fechaGeneracion}</span>
        </div>
      </div>
    </body></html>`
  }

  const cabeceras = ras.map((ra) => `<th class="ra-col">${escapar(ra.codigo)}</th>`).join('')
  const cuerpo = filas.value
    .map((fila) => {
      const celdas = fila.ras
        .map((ra) => {
          const clase = ra.superado ? 'ok' : ra.nota === null ? 'sin' : 'no'
          const texto = ra.superado
            ? `✓ ${formato(ra.nota)}`
            : ra.nota === null
              ? 'Sin evaluar'
              : `✗ ${formato(ra.nota)}`
          return `<td class="ra-col"><span class="ra-celda ra-celda--${clase}">${texto}</span></td>`
        })
        .join('')
      return `
        <tr>
          <td class="alumno">${escapar(fila.alumno.apellidos)}, ${escapar(fila.alumno.nombre)}</td>
          ${celdas}
          <td class="num"><strong>${fila.ras.length - fila.rasNoSuperados.length}/${fila.ras.length}</strong></td>
          <td>${fila.rasNoSuperados.length > 0 ? escapar(fila.rasNoSuperados.join(', ')) : '—'}</td>
        </tr>
      `
    })
    .join('')

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${estilos}</style></head><body>
    <div class="informe">
      ${cabecera}
      <div class="resumen">
        <div><span>Alumnado</span><strong>${resumen.value.alumnos.length}</strong></div>
        <div><span>Con todos los RA</span><strong>${conTodos}</strong></div>
        <div><span>Con RA pendientes</span><strong>${conPendientes}</strong></div>
        <div><span>RA del módulo</span><strong>${totalRas}</strong></div>
      </div>
      ${
        filas.value.length === 0
          ? '<p class="sin-datos">No hay alumnado que mostrar.</p>'
          : `<table class="ra-matriz">
              <thead><tr><th>Alumno/a</th>${cabeceras}<th class="num">Superados</th><th>Pendientes</th></tr></thead>
              <tbody>${cuerpo}</tbody>
            </table>`
      }
      <!-- graficas:inicio --><h2>Gráficas</h2>
      <div class="graficas">
        <div class="grafica">
          <h3>Criterios superados por RA</h3>
          ${svgBarras(criteriosGrupoPorRa(), 100, 50, ' %')}
        </div>
        <div class="grafica">
          <h3>RA superados</h3>
          <div class="donut-wrap">
            ${svgTarta(
              [
                { etiqueta: 'Con todos los RA', valor: conTodos, color: '#1e7a4b' },
                { etiqueta: 'Con RA pendientes', valor: conPendientes, color: '#d98a2b' }
              ],
              'alumnos'
            )}
            <div class="leyenda">
              ${leyenda([
                { etiqueta: 'Con todos los RA', valor: conTodos, color: '#1e7a4b' },
                { etiqueta: 'Con RA pendientes', valor: conPendientes, color: '#d98a2b' }
              ])}
            </div>
          </div>
        </div>
      </div>
      <!-- graficas:fin --><div class="pie">
        <span>${escapar(grupo.value.ciclo_nombre)} · ${escapar(grupo.value.modulo_siglas)}</span>
        <span>Gestión del curso · ${fechaGeneracion}</span>
      </div>
    </div>
  </body></html>`
})

const htmlResumen = computed(() => {
  if (!resumen.value || !grupo.value) return ''
  const modelo = resumen.value.modelo
  const categorias = modelo.categorias.map((c) => `${c.nombre} ${c.peso} %`).join(' + ')
  const avaluaciones = modelo.avaluaciones.map((a) => `${a.peso} % ${a.nombre}`).join(' + ')
  const minimos = [
    `Entrega ${modelo.requisitos.find((r) => r.id === 'notaMinimaEntrega')?.valor ?? 4}`,
    `Categoría ${modelo.requisitos.find((r) => r.id === 'notaMinimaCategoria')?.valor ?? 5}`,
    `Avaluación ${modelo.requisitos.find((r) => r.id === 'notaMinimaAvaluacion')?.valor ?? 5}`
  ].join(' · ')
  const fila = alumnoId.value === '' ? null : alumnoFila.value
  const cabecera = `
    <header class="informe-cabecera">
      <div>
        <p class="eyebrow">${fila ? 'Resumen del alumno' : 'Resumen del grupo'}</p>
        <h1>${escapar(grupo.value.nombre)}</h1>
        <p class="subtitulo">
          ${escapar(grupo.value.modulo_nombre)} · Curso
          ${escapar(grupo.value.curso_academico_nombre)} ·
          ${escapar(etiquetaModalidad(grupo.value.modalidad))}
        </p>
      </div>
      <div class="informe-meta">
        <span>${fila ? `${fila.alumno.apellidos}, ${fila.alumno.nombre}` : 'Informe de grupo'}</span>
        <span>Generado el ${fechaGeneracion}</span>
      </div>
    </header>
    <section class="criterios">
      <div><span>Categorías</span><strong>${escapar(categorias)}</strong></div>
      <div><span>Fórmula final</span><strong>${escapar(avaluaciones)}</strong></div>
      <div><span>Mínimos</span><strong>${escapar(minimos)}</strong></div>
    </section>
  `

  if (fila) {
    const registros = notasClase.value.filter((nota) => nota.alumno_id === fila.alumno.id)
    const conNota = registros.filter((nota) => nota.nota !== null).length
    const entregasHtml = filasEntregas.value
      .map((resumenEntrega) => {
        const registro = registros.find((nota) => nota.entrega_id === resumenEntrega.entrega.id)
        const nota = registro?.nota ?? null
        const estadoNota =
          nota === null
            ? '<span class="estado estado--no-apto">Sin nota</span>'
            : nota >= 5
              ? '<span class="estado estado--apto">Aprobada</span>'
              : '<span class="estado estado--no-apto">Suspensa</span>'
        return `
          <tr>
            <td class="entrega-titulo">${escapar(resumenEntrega.entrega.titulo)}</td>
            <td>${escapar(etiquetaTipo(resumenEntrega.entrega.tipo))}</td>
            <td>${escapar(nombreAvaluacion(resumenEntrega.entrega.avaluacion_id))}</td>
            <td>${escapar(fechaCorta(resumenEntrega.entrega.fecha_limite))}</td>
            <td class="num"><span class="${notaClase(nota)}">${formato(nota)}</span></td>
            <td>${escapar(registro?.observaciones ?? '—')}</td>
            <td>${estadoNota}</td>
          </tr>`
      })
      .join('')

    const avaluacionesHtml = fila.avaluaciones
      .map(
        (avaluacion) => `
        <tr>
          <td>${escapar(avaluacion.nombre)}</td>
          <td class="num">${formato(avaluacion.nota)}</td>
          <td>
            <span class="estado ${
              avaluacion.suspensa
                ? 'estado--convocatoria'
                : avaluacion.nota === null
                  ? 'estado--no-apto'
                  : 'estado--apto'
            }">
              ${avaluacion.nota === null ? 'Sin datos' : avaluacion.suspensa ? 'Suspensa' : 'Correcta'}
            </span>
          </td>
          <td>${escapar(avaluacion.motivos.join(' · ') || 'Sin incidencias')}</td>
        </tr>`
      )
      .join('')

    const raSuperados = fila.ras.length - fila.rasNoSuperados.length
    const segmentosRa = [
      { etiqueta: 'Superados', valor: raSuperados, color: '#1e7a4b' },
      { etiqueta: 'Pendientes', valor: fila.rasNoSuperados.length, color: '#b42318' }
    ]

    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${estilos}</style></head><body>
      <div class="informe">
        ${cabecera}
        <h2>${escapar(fila.alumno.apellidos)}, ${escapar(fila.alumno.nombre)}</h2>
        <div class="resumen">
          <div><span>Nota final</span><strong>${formato(fila.notaFinal)}</strong></div>
          <div><span>Estado</span><strong class="estado--${claseEstado(fila)}">${estado(fila)}</strong></div>
          <div><span>Entregas con nota</span><strong>${conNota}/${filasEntregas.value.length}</strong></div>
          <div><span>RA pendientes</span><strong>${fila.rasNoSuperados.length}</strong></div>
        </div>
        <!-- detalle:inicio --><h2>Entregas y exámenes</h2>
        <table class="tabla-entregas">
          <thead><tr><th>Entrega</th><th>Tipo</th><th>Avaluación</th><th>Fecha</th><th class="num">Nota</th><th>Observaciones</th><th>Estado</th></tr></thead>
          <tbody>${entregasHtml}</tbody>
        </table><!-- detalle:fin -->
        <!-- avaluaciones:inicio --><h2>Avaluaciones</h2>
        <table>
          <thead><tr><th>Avaluación</th><th class="num">Nota</th><th>Estado</th><th>Detalle</th></tr></thead>
          <tbody>${avaluacionesHtml}</tbody>
        </table><!-- avaluaciones:fin -->
        <!-- formacion:inicio -->${seccionFormacionHtml(false)}<!-- formacion:fin -->
        ${fila.incompleta ? '<p class="aviso">Hay entregas sin corregir; cuentan como 0 en el cálculo.</p>' : ''}
        <!-- graficas:inicio --><h2>Gráficas</h2>
      <div class="graficas graficas--tres">
          <div class="grafica">
            <h3>Notas por avaluación</h3>
            ${svgBarras(fila.avaluaciones.map((avaluacion) => ({ etiqueta: avaluacion.nombre, valor: avaluacion.nota })))}
          </div>
          <div class="grafica">
            <h3>Resultados de aprendizaje</h3>
            <div class="donut-wrap">
              ${svgTarta(segmentosRa, 'RA')}
              <div class="leyenda">${leyenda(segmentosRa)}</div>
            </div>
          </div>
          <div class="grafica">
            <h3>Criterios superados por RA</h3>
            ${svgBarras(criteriosPorRa(fila), 100, 50, ' %')}
          </div>
          <div class="grafica">
            <h3>Notas por entrega</h3>
            ${svgBarras(notasEntregaAlumno(fila))}
            <p class="grafica__nota">
              ${filasEntregas.value.map((resumenEntrega, indice) => `E${indice + 1}: ${escapar(resumenEntrega.entrega.titulo)}`).join(' · ')}
            </p>
          </div>
        </div>
        <!-- graficas:fin --><div class="pie">
          <span>${escapar(grupo.value.ciclo_nombre)} · ${escapar(grupo.value.modulo_siglas)}</span>
          <span>Gestión del curso · ${fechaGeneracion}</span>
        </div>
      </div>
    </body></html>`
  }

  const entregasHtml = filasEntregas.value
    .map((resumenEntrega) => {
      const entrega = resumenEntrega.entrega
      const estadoResumen = estadoEntrega(resumenEntrega)
      return `
        <tr>
          <td class="entrega-titulo">${escapar(entrega.titulo)}</td>
          <td>${escapar(etiquetaTipo(entrega.tipo))}</td>
          <td>${escapar(nombreAvaluacion(entrega.avaluacion_id))}</td>
          <td>${escapar(fechaCorta(entrega.fecha_limite))}</td>
          <td class="num"><span class="${notaClase(resumenEntrega.media)}">${formato(resumenEntrega.media)}</span></td>
          <td class="num">${resumenEntrega.conNota}/${alumnado.value.length}</td>
          <td class="num">${resumenEntrega.aprobadas}${resumenEntrega.porcentajeAprobado === null ? '' : ` (${resumenEntrega.porcentajeAprobado} %)`}</td>
          <td><span class="estado estado--${estadoResumen.clase}">${escapar(estadoResumen.texto)}</span></td>
        </tr>`
    })
    .join('')

  const avaluacionesHtml = resumenAvaluaciones.value
    .map(
      (avaluacion) => `
      <tr>
        <td>${escapar(avaluacion.nombre)}</td>
        <td class="num">${avaluacion.peso} %</td>
        <td class="num"><span class="${notaClase(avaluacion.media)}">${formato(avaluacion.media)}</span></td>
        <td class="num">${avaluacion.aprobados}/${avaluacion.evaluados}</td>
        <td class="num">${avaluacion.entregas}</td>
      </tr>`
    )
    .join('')

  const categoriasHtml = resumenCategorias.value
    .map(
      (categoria) => `
      <tr>
        <td>${escapar(categoria.nombre)}</td>
        <td class="num">${categoria.peso} %</td>
        <td class="num"><span class="${notaClase(categoria.media)}">${formato(categoria.media)}</span></td>
        <td class="num">${categoria.entregas}</td>
      </tr>`
    )
    .join('')

  const cabecerasAvaluaciones = modelo.avaluaciones
    .map((avaluacion) => `<th class="num">${escapar(avaluacion.nombre)}</th>`)
    .join('')

  const alumnadoHtml = filas.value
    .map((filaAlumno) => {
      const celdas = filaAlumno.avaluaciones
        .map(
          (avaluacion) =>
            `<td class="num"><span class="${notaClase(avaluacion.nota)}">${formato(avaluacion.nota)}</span></td>`
        )
        .join('')
      return `
        <tr>
          <td>${escapar(filaAlumno.alumno.apellidos)}, ${escapar(filaAlumno.alumno.nombre)}</td>
          ${celdas}
          <td class="num"><strong>${formato(filaAlumno.notaFinal)}</strong></td>
          <td>${badge(filaAlumno)}</td>
          <td class="num">${filaAlumno.rasNoSuperados.length}</td>
        </tr>`
    })
    .join('')

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${estilos}</style></head><body>
    <div class="informe">
      ${cabecera}
      <div class="resumen">
        <div><span>Alumnado</span><strong>${resumenGrupo.value.total}</strong></div>
        <div><span>Aprobados</span><strong>${resumenGrupo.value.aprobados}</strong></div>
        <div><span>Media del grupo</span><strong>${formato(resumenGrupo.value.media)}</strong></div>
        <div><span>Sin corregir</span><strong>${resumenEntregas.value.pendientes}</strong></div>
      </div>
      <!-- detalle:inicio --><h2>Entregas y exámenes</h2>
      <table class="tabla-entregas">
        <thead><tr><th>Entrega</th><th>Tipo</th><th>Avaluación</th><th>Fecha</th><th class="num">Media</th><th class="num">Corregidas</th><th class="num">Aprobadas</th><th>Estado</th></tr></thead>
        <tbody>${entregasHtml || '<tr><td colspan="8" class="sin-datos">No hay entregas.</td></tr>'}</tbody>
      </table><!-- detalle:fin -->
      <!-- avaluaciones:inicio --><h2>Resumen por avaluación</h2>
      <table>
        <thead><tr><th>Avaluación</th><th class="num">Peso</th><th class="num">Media</th><th class="num">Aprobados</th><th class="num">Entregas</th></tr></thead>
        <tbody>${avaluacionesHtml}</tbody>
      </table><!-- avaluaciones:fin -->
      <!-- categorias:inicio --><h2>Resumen por categoría</h2>
      <table>
        <thead><tr><th>Categoría</th><th class="num">Peso</th><th class="num">Media</th><th class="num">Entregas</th></tr></thead>
        <tbody>${categoriasHtml}</tbody>
      </table><!-- categorias:fin -->
      <!-- formacion:inicio -->${seccionFormacionHtml(true)}<!-- formacion:fin -->
      <!-- alumnado:inicio --><h2>Alumnado</h2>
      ${
        filas.value.length === 0
          ? '<p class="sin-datos">No hay alumnado que mostrar.</p>'
          : `<table>
              <thead><tr><th>Alumno/a</th>${cabecerasAvaluaciones}<th class="num">Final</th><th>Estado</th><th class="num">RA pend.</th></tr></thead>
              <tbody>${alumnadoHtml}</tbody>
            </table>`
      }<!-- alumnado:fin -->
      <!-- graficas:inicio --><h2>Gráficas</h2>
      <div class="graficas graficas--tres">
        <div class="grafica">
          <h3>Media por avaluación</h3>
          ${svgBarras(resumenAvaluaciones.value.map((avaluacion) => ({ etiqueta: avaluacion.nombre, valor: avaluacion.media })))}
        </div>
        <div class="grafica">
          <h3>Estado del alumnado</h3>
          <div class="donut-wrap">
            ${svgTarta(distribucion.value, 'alumnos')}
            <div class="leyenda">${leyenda(distribucion.value)}</div>
          </div>
        </div>
        <div class="grafica">
          <h3>Criterios superados por RA</h3>
          ${svgBarras(criteriosGrupoPorRa(), 100, 50, ' %')}
        </div>
        <div class="grafica">
          <h3>Media por categoría</h3>
          ${svgBarras(resumenCategorias.value.map((categoria) => ({ etiqueta: categoria.nombre, valor: categoria.media })))}
        </div>
      </div>
      <!-- graficas:fin --><div class="pie">
        <span>${escapar(grupo.value.ciclo_nombre)} · ${escapar(grupo.value.modulo_siglas)}</span>
        <span>Gestión del curso · ${fechaGeneracion}</span>
      </div>
    </div>
  </body></html>`
})

const htmlBase = computed(() =>
  tipoInforme.value === 'ras'
    ? htmlRas.value
    : tipoInforme.value === 'calificaciones'
      ? html.value
      : htmlResumen.value
)

const htmlActivo = computed(() => filtrarSecciones(htmlBase.value))

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = null
  try {
    await store.cargar()
    grupo.value = store.grupo(id.value)
    if (!grupo.value) {
      error.value = 'No se ha encontrado el grupo.'
      return
    }
    const modelo = await window.api.criterios.obtener(grupo.value.id)
    if (!modelo) {
      resumen.value = null
      return
    }
    const [entregas, alumnos, notas, criteriosDisponibles, periodosFormacion, unidades] =
      await Promise.all([
        window.api.entregasClase.listar(grupo.value.id),
        window.api.alumnosClase.listar(grupo.value.id),
        window.api.notasClase.listar(grupo.value.id),
        window.api.entregasClase.criterios(grupo.value.id),
        window.api.formacionEmpresa.listar(grupo.value.id),
        window.api.unidadesProgramacion.listar(grupo.value.id)
      ])
    resumen.value = calcularResumenClase(
      grupo.value,
      modelo,
      entregas,
      alumnos,
      notas,
      criteriosDisponibles,
      unidades
    )
    entregasClase.value = entregas
    notasClase.value = notas
    alumnado.value = alumnos
    formacion.value = periodosFormacion
    const alumnoSolicitado = Number(route.query.alumno)
    if (
      Number.isFinite(alumnoSolicitado) &&
      alumnos.some((alumno) => alumno.id === alumnoSolicitado)
    ) {
      alumnoId.value = alumnoSolicitado
    }
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)
watch(id, cargar)

function descargar(nombre: string, contenido: string, tipo: string): void {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }))
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  enlace.click()
  URL.revokeObjectURL(url)
}

function descargarCsv(): void {
  if (!resumen.value) return

  let lineas: string[][] = []
  let nombre = 'calificaciones.csv'

  if (tipoInforme.value === 'ras') {
    const ras = resumen.value.alumnos[0]?.ras ?? []
    lineas = [
      ['Alumno', ...ras.map((ra) => ra.codigo), 'RA superados', 'RA pendientes'],
      ...filas.value.map((fila) => [
        `${fila.alumno.apellidos}, ${fila.alumno.nombre}`,
        ...fila.ras.map((ra) =>
          ra.superado
            ? `Superado (${formato(ra.nota)})`
            : ra.nota === null
              ? 'Sin evaluar'
              : `No superado (${formato(ra.nota)})`
        ),
        `${fila.ras.length - fila.rasNoSuperados.length}/${fila.ras.length}`,
        fila.rasNoSuperados.join(', ') || '—'
      ])
    ]
    nombre = 'ra-superados.csv'
  } else if (tipoInforme.value === 'calificaciones') {
    lineas = [
      [
        'Alumno',
        ...resumen.value.modelo.avaluaciones.map((avaluacion) => avaluacion.nombre),
        'Final',
        'Estado'
      ],
      ...filas.value.map((fila) => [
        `${fila.alumno.apellidos}, ${fila.alumno.nombre}`,
        ...fila.avaluaciones.map((avaluacion) => formato(avaluacion.nota)),
        formato(fila.notaFinal),
        estado(fila)
      ])
    ]
  } else {
    const filaAlumno = alumnoFila.value
    if (filaAlumno) {
      lineas = [
        ['Entrega', 'Tipo', 'Avaluación', 'Fecha', 'Nota', 'Observaciones', 'Estado'],
        ...filasEntregas.value.map((resumenEntrega) => {
          const registro = notasClase.value.find(
            (nota) =>
              nota.alumno_id === filaAlumno.alumno.id &&
              nota.entrega_id === resumenEntrega.entrega.id
          )
          const nota = registro?.nota ?? null
          return [
            resumenEntrega.entrega.titulo,
            etiquetaTipo(resumenEntrega.entrega.tipo),
            nombreAvaluacion(resumenEntrega.entrega.avaluacion_id),
            fechaCorta(resumenEntrega.entrega.fecha_limite),
            formato(nota),
            registro?.observaciones ?? '',
            nota === null ? 'Sin nota' : nota >= 5 ? 'Aprobada' : 'Suspensa'
          ]
        })
      ]
      nombre = 'resumen-alumno.csv'
    } else {
      lineas = [
        [
          'Entrega',
          'Tipo',
          'Avaluación',
          'Fecha',
          'Media',
          'Corregidas',
          'Total',
          'Pendientes',
          'Aprobadas',
          '% aprobadas',
          'Estado'
        ],
        ...filasEntregas.value.map((resumenEntrega) => {
          const estadoResumen = estadoEntrega(resumenEntrega)
          return [
            resumenEntrega.entrega.titulo,
            etiquetaTipo(resumenEntrega.entrega.tipo),
            nombreAvaluacion(resumenEntrega.entrega.avaluacion_id),
            fechaCorta(resumenEntrega.entrega.fecha_limite),
            formato(resumenEntrega.media),
            String(resumenEntrega.conNota),
            String(alumnado.value.length),
            String(resumenEntrega.pendientes),
            String(resumenEntrega.aprobadas),
            resumenEntrega.porcentajeAprobado === null
              ? '—'
              : `${resumenEntrega.porcentajeAprobado} %`,
            estadoResumen.texto
          ]
        })
      ]
      nombre = 'resumen-entregas.csv'
    }
  }

  const csv = lineas
    .map((linea) => linea.map((campo) => `"${campo.replaceAll('"', '""')}"`).join(';'))
    .join('\n')
  descargar(nombre, `\uFEFF${csv}`, 'text/csv;charset=utf-8')
}

function imprimir(): void {
  const marco = visor.value
  if (!marco) return
  const lanzar = (): void => {
    const ventana = marco.contentWindow
    if (!ventana) return
    ventana.focus()
    ventana.print()
  }
  window.setTimeout(lanzar, 60)
}
</script>

<template>
  <section class="vista vista--ancha">
    <BotonVolver :a="grupo ? { name: 'grupo', params: { id: grupo.id } } : '/grupos'" />

    <header class="vista__cabecera">
      <h2>Informes del grupo</h2>
      <p v-if="grupo" class="tenue">
        Curso {{ grupo.curso_academico_nombre }} · {{ grupo.nombre }}
      </p>
    </header>

    <div v-if="cargando && !grupo" class="vacio">Cargando informe…</div>
    <p v-else-if="error" class="aviso aviso--error" role="alert">{{ error }}</p>

    <div v-else-if="grupo && !resumen" class="tarjeta">
      <h3>Faltan datos</h3>
      <p class="tenue">Para generar el informe hacen falta criterios, entregas y alumnado.</p>
      <RouterLink
        class="boton boton--principal"
        :to="{ name: 'criterios', params: { grupoId: grupo.id } }"
      >
        Ir a criterios
      </RouterLink>
    </div>

    <template v-else-if="resumen">
      <div class="informe__controles">
        <div class="selector">
          <span class="tenue">Informe</span>
          <SelectButton
            v-model="tipoInforme"
            :opciones="opcionesInforme"
            aria-label="Tipo de informe"
            compacto
          />
        </div>
        <label class="selector">
          <span class="tenue">Alumno/a</span>
          <select v-model="alumnoId">
            <option value="">Todo el grupo</option>
            <option v-for="fila in resumen.alumnos" :key="fila.alumno.id" :value="fila.alumno.id">
              {{ fila.alumno.apellidos }}, {{ fila.alumno.nombre }}
            </option>
          </select>
        </label>
        <span class="chip">{{ filas.length }} {{ filas.length === 1 ? 'alumno' : 'alumnos' }}</span>
        <span class="barra__espacio"></span>
        <button class="boton" type="button" @click="abrirOpciones('csv')">Descargar CSV</button>
        <button class="boton" type="button" @click="abrirOpciones('html')">Descargar HTML</button>
        <button class="boton boton--principal" type="button" @click="abrirOpciones('imprimir')">
          Imprimir / PDF
        </button>
      </div>

      <div class="informe__preview-cabecera">
        <span class="tenue">Vista previa</span>
        <span class="tenue">A4 · listo para imprimir o guardar en PDF</span>
      </div>
      <iframe
        v-if="htmlActivo"
        ref="visor"
        :srcdoc="htmlActivo"
        title="Previsualización del informe"
        class="informe__preview"
      ></iframe>
    </template>

    <Modal v-if="accionPendiente" :titulo="tituloAccion" @cerrar="accionPendiente = null">
      <p class="tenue">Elige qué secciones quieres incluir antes de continuar.</p>
      <div class="opciones-informe">
        <label v-for="opcion in opcionesSeccion" :key="opcion.id" class="opciones-informe__item">
          <input v-model="seleccion[opcion.id]" type="checkbox" />
          {{ opcion.etiqueta }}
        </label>
      </div>
      <template #pie>
        <button class="boton" type="button" @click="alternarTodas">
          {{ todasSeleccionadas ? 'Quitar todo' : 'Seleccionar todo' }}
        </button>
        <span class="barra__espacio"></span>
        <button class="boton" type="button" @click="accionPendiente = null">Cancelar</button>
        <button
          class="boton boton--principal"
          type="button"
          :disabled="!haySeleccion"
          @click="ejecutarAccion"
        >
          {{ etiquetaAccion }}
        </button>
      </template>
    </Modal>
  </section>
</template>
