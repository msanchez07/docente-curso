<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute, type RouteLocationRaw } from 'vue-router'
import AyudaSeccion from '@renderer/components/AyudaSeccion.vue'

const props = defineProps<{ grupoId?: number | null }>()
const route = useRoute()

interface Enlace {
  id: string
  etiqueta: string
  to: RouteLocationRaw
  icono: string
}

const ICONOS = {
  dashboard: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h5v-6h4v6h5V9.5"/>',
  programacion:
    '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/>',
  horario: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  faltas:
    '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  entregas:
    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h5"/>',
  calificaciones:
    '<path d="M3 3v18h18"/><path d="M7 16v-5"/><path d="M12 16V8"/><path d="M17 16v-3"/>',
  alumnado:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/>',
  didactica:
    '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 3v18"/><path d="M12 8h4"/><path d="M12 12h4"/><path d="M12 16h2"/>',
  informes:
    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 17v-3"/><path d="M12 17v-6"/><path d="M16 17v-4"/>'
} as const

const enlacesDiaADia = computed<Enlace[]>(() => {
  if (!props.grupoId) return []
  return [
    {
      id: 'programacion',
      etiqueta: 'Programación',
      to: { name: 'programacion', params: { grupoId: props.grupoId } },
      icono: ICONOS.programacion
    },
    {
      id: 'horario',
      etiqueta: 'Horario',
      to: { name: 'horario-grupo', params: { grupoId: props.grupoId } },
      icono: ICONOS.horario
    },
    {
      id: 'faltas',
      etiqueta: 'Faltas',
      to: { name: 'faltas', query: { grupo: props.grupoId } },
      icono: ICONOS.faltas
    },
    {
      id: 'entregas',
      etiqueta: 'Entregas',
      to: { name: 'entregas', params: { grupoId: props.grupoId } },
      icono: ICONOS.entregas
    },
    {
      id: 'calificaciones',
      etiqueta: 'Calificaciones',
      to: { name: 'calificaciones', params: { grupoId: props.grupoId } },
      icono: ICONOS.calificaciones
    }
  ]
})

const enlacesConsulta = computed<Enlace[]>(() => {
  if (!props.grupoId) return []
  return [
    {
      id: 'alumnado',
      etiqueta: 'Alumnado',
      to: { name: 'alumnado', params: { grupoId: props.grupoId } },
      icono: ICONOS.alumnado
    },
    {
      id: 'didactica',
      etiqueta: 'Programación didáctica',
      to: { name: 'programacion-didactica', params: { grupoId: props.grupoId } },
      icono: ICONOS.didactica
    },
    {
      id: 'informes',
      etiqueta: 'Informes',
      to: { name: 'informes', params: { grupoId: props.grupoId } },
      icono: ICONOS.informes
    }
  ]
})

const rutasPorSeccion: Record<string, string[]> = {
  programacion: ['programacion'],
  horario: ['horario-grupo'],
  faltas: ['faltas'],
  entregas: ['entregas', 'entrega-nueva', 'entrega-editar', 'entrega-evidencias', 'entrega-notas'],
  calificaciones: ['calificaciones', 'convocatorias'],
  alumnado: ['alumnado', 'alumno', 'alumno-formacion'],
  didactica: ['programacion-didactica', 'criterios', 'evaluaciones', 'boe'],
  informes: ['informes']
}

function activa(id: string): boolean {
  return rutasPorSeccion[id]?.includes(String(route.name)) ?? false
}

const destinoDashboard = computed(() =>
  props.grupoId ? { name: 'grupo', params: { id: props.grupoId } } : { name: 'grupos' }
)
</script>

<template>
  <nav class="dashboard__toolbar navegacion-grupo" aria-label="Navegación del grupo">
    <div class="dashboard__toolbar-grupo">
      <RouterLink
        class="dashboard__tool navegacion-grupo__dashboard"
        :class="{ 'dashboard__tool--activo': route.name === 'grupo' }"
        :to="destinoDashboard"
        :aria-current="route.name === 'grupo' ? 'page' : undefined"
      >
        <span class="dashboard__tool-icono">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            v-html="ICONOS.dashboard"
          ></svg>
        </span>
        Dashboard
      </RouterLink>
    </div>

    <template v-if="grupoId">
      <span class="navegacion-grupo__division" aria-hidden="true"></span>
      <div class="dashboard__toolbar-grupo" aria-label="Día a día">
        <RouterLink
          v-for="enlace in enlacesDiaADia"
          :key="enlace.id"
          class="dashboard__tool"
          :class="{ 'dashboard__tool--activo': activa(enlace.id) }"
          :to="enlace.to"
          :aria-current="activa(enlace.id) ? 'page' : undefined"
        >
          <span class="dashboard__tool-icono">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
              v-html="enlace.icono"
            ></svg>
          </span>
          {{ enlace.etiqueta }}
        </RouterLink>
      </div>

      <span class="navegacion-grupo__division" aria-hidden="true"></span>
      <div class="dashboard__toolbar-grupo" aria-label="Consulta">
        <RouterLink
          v-for="enlace in enlacesConsulta"
          :key="enlace.id"
          class="dashboard__tool"
          :class="{ 'dashboard__tool--activo': activa(enlace.id) }"
          :to="enlace.to"
          :aria-current="activa(enlace.id) ? 'page' : undefined"
        >
          <span class="dashboard__tool-icono">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
              v-html="enlace.icono"
            ></svg>
          </span>
          {{ enlace.etiqueta }}
        </RouterLink>
      </div>
    </template>

    <AyudaSeccion />
  </nav>
</template>
