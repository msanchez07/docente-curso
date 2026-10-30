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

const iniciales = computed(() => {
  const alumno = fila.value?.alumno
  if (!alumno) return '·'
  return `${alumno.nombre[0] ?? ''}${alumno.apellidos[0] ?? ''}`.toUpperCase()
})

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
      <header class="tarjeta alumno__cabecera">
        <div class="alumno__identidad">
          <div class="alumno__avatar" aria-hidden="true">{{ iniciales }}</div>
          <div>
            <p class="dashboard__eyebrow">Ficha del alumno</p>
            <h2>{{ fila.alumno.apellidos }}, {{ fila.alumno.nombre }}</h2>
            <p class="tenue">
              {{ grupo.curso_academico_nombre }} · {{ grupo.nombre }} ·
              {{ fila.alumno.dni ?? 'sin DNI' }} · {{ fila.alumno.email ?? 'sin correo' }}
            </p>
          </div>
        </div>
        <div class="alumno__acciones">
          <span class="chip" :class="fila.alumno.activo ? 'chip--ok' : ''">
            {{ fila.alumno.activo ? 'Activo' : 'Inactivo' }}
          </span>
          <span v-if="fila.incompleta" class="chip chip--aviso">incompleta</span>
          <RouterLink
            class="boton boton--sutil"
            :to="{
              name: 'calificaciones',
              params: { grupoId: grupo.id },
              query: { alumno: fila.alumno.id }
            }"
          >
            Calificaciones
          </RouterLink>
          <RouterLink
            class="boton boton--sutil"
            :to="{
              name: 'alumno-formacion',
              params: { grupoId: grupo.id, alumnoId: fila.alumno.id }
            }"
          >
            Formación
          </RouterLink>
          <RouterLink
            class="boton boton--sutil"
            :to="{ name: 'faltas', query: { grupo: grupo.id } }"
          >
            Faltas
          </RouterLink>
        </div>
      </header>

      <section class="alumno__stats">
        <article class="tarjeta alumno__stat alumno__stat--nota">
          <span class="alumno__stat-etiqueta">Nota final</span>
          <strong class="alumno__final">{{ formato(fila.notaFinal) }}</strong>
          <span class="tenue">{{ estado(fila) }}</span>
        </article>
        <article class="tarjeta alumno__stat alumno__stat--estado">
          <span class="alumno__stat-etiqueta">Estado</span>
          <strong :class="fila.aprobado ? 'nota-aprobado' : 'nota-suspendido'">
            {{ estado(fila) }}
          </strong>
          <span class="tenue">{{ fila.rasNoSuperados.length }} RA pendientes</span>
        </article>
        <article class="tarjeta alumno__stat alumno__stat--evaluaciones">
          <span class="alumno__stat-etiqueta">Evaluaciones</span>
          <strong>
            {{ fila.avaluaciones.filter((a) => a.nota !== null).length }} /
            {{ fila.avaluaciones.length }}
          </strong>
          <span class="tenue">con nota registrada</span>
        </article>
        <article class="tarjeta alumno__stat alumno__stat--faltas">
          <span class="alumno__stat-etiqueta">
            Faltas · {{ ultimaFalta?.moduloNombre ?? 'sin datos' }}
            <template v-if="ultimaFalta"> · {{ fechaInformeFaltas() }}</template>
          </span>
          <strong :class="claseFaltas()">
            {{ ultimaFalta ? `${ultimaFalta.porcentaje} %` : '—' }}
          </strong>
          <span class="tenue">
            {{
              ultimaFalta
                ? `${ultimaFalta.faltas} / ${ultimaFalta.horas} h · ${textoFaltas()}`
                : 'Sin informes de faltas'
            }}
          </span>
        </article>
      </section>

      <div v-if="fila.avaluaciones.every((a) => a.nota === null)" class="tarjeta vacio">
        Este alumno todavía no tiene notas registradas.
      </div>

      <section
        v-for="avaluacion in fila.avaluaciones"
        :key="avaluacion.avaluacionId"
        class="tarjeta alumno__evaluacion"
      >
        <header class="alumno__evaluacion-cabecera">
          <div>
            <p class="dashboard__eyebrow">Evaluación</p>
            <h3>{{ avaluacion.nombre }}</h3>
            <p class="tenue">
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
            </p>
          </div>
          <strong class="alumno__avaluacion-nota">{{ formato(avaluacion.nota) }}</strong>
        </header>

        <p v-if="avaluacion.categorias.length === 0" class="tenue">
          Sin entregas en esta avaluación.
        </p>

        <div v-else class="alumno__categorias">
          <article
            v-for="categoria in avaluacion.categorias"
            :key="categoria.categoriaId"
            class="alumno__categoria"
          >
            <header class="alumno__categoria-cabecera">
              <div>
                <strong>{{ categoria.nombre }}</strong>
                <span class="tenue">{{ categoria.peso }} % de la evaluación</span>
              </div>
              <div class="alumno__categoria-meta">
                <span class="tenue">Media {{ formato(categoria.media) }}</span>
                <span v-if="categoria.suspensa" class="chip chip--aviso">suspensa</span>
              </div>
            </header>

            <div class="alumno__entregas">
              <div
                v-for="entrega in categoria.entregas"
                :key="entrega.entregaId"
                class="alumno__entrega"
              >
                <div>
                  <strong>{{ entrega.titulo }}</strong>
                  <span v-if="entrega.observaciones" class="tenue">{{
                    entrega.observaciones
                  }}</span>
                </div>
                <span class="alumno__entrega-nota">{{ formato(entrega.nota) }}</span>
              </div>
            </div>
          </article>
        </div>
      </section>
    </template>
  </section>
</template>
