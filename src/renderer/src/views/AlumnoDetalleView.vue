<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { calcularResumenClase } from '@shared/calcular-calificaciones'
import BotonVolver from '@renderer/components/BotonVolver.vue'
import type {
  FilaCalificacionClase,
  GrupoClase,
  ResumenCalificacionesClase,
  UltimaFaltaAlumno
} from '@shared/tipos'
import { useGruposClaseStore } from '@renderer/stores/grupos-clase'

const route = useRoute()
const store = useGruposClaseStore()
const grupo = ref<GrupoClase | null>(null)
const resumen = ref<ResumenCalificacionesClase | null>(null)
const ultimaFalta = ref<UltimaFaltaAlumno | null>(null)
const cargando = ref(true)
const error = ref<string | null>(null)

const grupoId = computed(() => Number(route.params.grupoId))
const alumnoId = computed(() => Number(route.params.alumnoId))

const fila = computed<FilaCalificacionClase | null>(
  () => resumen.value?.alumnos.find((f) => f.alumno.id === alumnoId.value) ?? null
)

function formato(nota: number | null): string {
  return nota === null ? '—' : nota.toFixed(2).replace('.', ',')
}

function estado(fila: FilaCalificacionClase): string {
  return fila.aprobado ? 'Apto' : fila.vaAConvocatoria ? 'A convocatoria' : 'No apto'
}

function claseFaltas(): string {
  if (!ultimaFalta.value) return ''
  const valor = ultimaFalta.value.porcentaje
  if (valor >= ultimaFalta.value.limite) return 'faltas__estado--peligro'
  if (valor >= ultimaFalta.value.limite * 0.66) return 'faltas__estado--aviso'
  if (valor >= ultimaFalta.value.limite * 0.33) return 'faltas__estado--proximo'
  return 'faltas__estado--ok'
}

function textoFaltas(): string {
  if (!ultimaFalta.value) return ''
  if (claseFaltas() === 'faltas__estado--peligro') return 'Pérdida'
  if (claseFaltas() === 'faltas__estado--aviso') return 'Riesgo'
  if (claseFaltas() === 'faltas__estado--proximo') return 'Aviso'
  return 'Correcto'
}

function fechaInformeFaltas(): string {
  if (!ultimaFalta.value) return ''
  const [fecha] = ultimaFalta.value.subidoEn.split(' ')
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio}`
}

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = null
  try {
    await store.cargar()
    grupo.value = store.grupo(grupoId.value)
    if (!grupo.value) {
      error.value = 'No se ha encontrado el grupo.'
      return
    }
    const modelo = await window.api.criterios.obtener(grupo.value.id)
    if (!modelo) {
      resumen.value = null
      return
    }
    const [entregas, alumnos, notas, criteriosDisponibles, faltas] = await Promise.all([
      window.api.entregasClase.listar(grupo.value.id),
      window.api.alumnosClase.listar(grupo.value.id),
      window.api.notasClase.listar(grupo.value.id),
      window.api.entregasClase.criterios(grupo.value.id),
      window.api.faltas.ultimoAlumno(grupo.value.id, alumnoId.value)
    ])
    ultimaFalta.value = faltas
    resumen.value = calcularResumenClase(
      grupo.value,
      modelo,
      entregas,
      alumnos,
      notas,
      criteriosDisponibles
    )
    if (!fila.value) error.value = 'El alumno no está matriculado en este grupo.'
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)
watch([grupoId, alumnoId], cargar)
</script>

<template>
  <section class="vista vista--ancha">
    <BotonVolver :a="grupo ? { name: 'alumnado', params: { grupoId: grupo.id } } : '/grupos'" />

    <div v-if="cargando && !fila" class="vacio">Cargando alumno…</div>
    <p v-else-if="error" class="aviso aviso--error" role="alert">{{ error }}</p>

    <template v-else-if="fila && grupo">
      <header class="alumno__cabecera">
        <div>
          <h2>{{ fila.alumno.apellidos }}, {{ fila.alumno.nombre }}</h2>
          <p class="tenue">
            Curso {{ grupo.curso_academico_nombre }} · {{ grupo.nombre }} ·
            {{ fila.alumno.dni ?? 'sin DNI' }} ·
            {{ fila.alumno.email ?? 'sin correo' }}
          </p>
        </div>
        <div class="alumno__chips">
          <span class="chip" :class="fila.alumno.activo ? 'chip--ok' : ''">
            {{ fila.alumno.activo ? 'Activo' : 'Inactivo' }}
          </span>
          <span v-if="fila.incompleta" class="chip chip--aviso">incompleta</span>
        </div>
      </header>

      <div class="tarjeta alumno__resumen">
        <div>
          <span class="tenue">Nota final</span>
          <strong class="alumno__final">{{ formato(fila.notaFinal) }}</strong>
        </div>
        <div>
          <span class="tenue">Estado</span>
          <strong :class="fila.aprobado ? 'nota-aprobado' : 'nota-suspendido'">
            {{ estado(fila) }}
          </strong>
        </div>
        <div>
          <span class="tenue">Evaluaciones</span>
          <strong>
            {{ fila.avaluaciones.filter((a) => a.nota !== null).length }} de
            {{ fila.avaluaciones.length }}
          </strong>
        </div>
      </div>

      <section class="tarjeta alumno__faltas">
        <header class="dashboard__tarjeta-cabecera">
          <div>
            <h3>Faltas</h3>
            <p class="tenue">
              {{
                ultimaFalta
                  ? `Último informe: ${ultimaFalta.archivo} · ${fechaInformeFaltas()}`
                  : 'Sin informes de faltas para este módulo.'
              }}
            </p>
          </div>
          <RouterLink
            class="dashboard__enlace"
            :to="{ name: 'faltas', query: { grupo: grupo.id } }"
          >
            Ver control de faltas
          </RouterLink>
        </header>

        <div v-if="ultimaFalta" class="alumno__faltas-resumen">
          <div>
            <span class="tenue">Módulo</span>
            <strong>{{ ultimaFalta.moduloNombre }}</strong>
          </div>
          <div>
            <span class="tenue">Faltas</span>
            <strong>{{ ultimaFalta.faltas }} / {{ ultimaFalta.horas }} h</strong>
          </div>
          <div>
            <span class="tenue">Porcentaje</span>
            <strong :class="claseFaltas()">{{ ultimaFalta.porcentaje }} %</strong>
          </div>
          <span class="chip faltas__estado" :class="claseFaltas()">{{ textoFaltas() }}</span>
        </div>
        <p v-else class="tenue">
          Sube un informe en <strong>Control de faltas</strong> para ver aquí el último valor del
          módulo.
        </p>
      </section>

      <div v-if="fila.avaluaciones.every((a) => a.nota === null)" class="vacio">
        Este alumno todavía no tiene notas registradas.
      </div>

      <div v-for="avaluacion in fila.avaluaciones" :key="avaluacion.avaluacionId" class="tarjeta">
        <div class="alumno__avaluacion-cabecera">
          <div>
            <h3>{{ avaluacion.nombre }}</h3>
            <span class="tenue">
              {{
                avaluacion.suspensa
                  ? 'Suspensa'
                  : avaluacion.nota === null
                    ? 'Sin datos'
                    : 'Correcta'
              }}
              <template v-if="avaluacion.motivos.length > 0">
                · {{ avaluacion.motivos.join(' · ') }}
              </template>
            </span>
          </div>
          <strong class="alumno__avaluacion-nota">{{ formato(avaluacion.nota) }}</strong>
        </div>

        <div v-if="avaluacion.categorias.length === 0" class="tenue">
          Sin entregas en esta avaluación.
        </div>

        <div
          v-for="categoria in avaluacion.categorias"
          :key="categoria.categoriaId"
          class="ra-bloque"
        >
          <div class="ra-bloque__cabecera">
            <span class="codigo">{{ categoria.nombre }} · {{ categoria.peso }} %</span>
            <strong style="flex: 1">Media: {{ formato(categoria.media) }}</strong>
            <span v-if="categoria.suspensa" class="chip chip--aviso">suspensa</span>
          </div>
          <table class="tabla">
            <tbody>
              <tr v-for="entrega in categoria.entregas" :key="entrega.entregaId">
                <td>
                  {{ entrega.titulo }}
                  <span v-if="entrega.observaciones" class="entrega__meta">
                    {{ entrega.observaciones }}
                  </span>
                </td>
                <td class="num">{{ formato(entrega.nota) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <RouterLink
        class="boton alumno__enlace"
        :to="{ name: 'calificaciones', params: { grupoId: grupo.id } }"
      >
        Abrir la tabla de calificaciones
      </RouterLink>
    </template>
  </section>
</template>
