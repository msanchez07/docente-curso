<script setup lang="ts">
import { computed } from 'vue'
import { BLOQUES_HORARIO, DIAS_SEMANA } from '@shared/grupos'
import type { BloquesSemana, DiaSemana, Modalidad, TipoBloqueHorario } from '@shared/tipos'

const props = withDefaults(
  defineProps<{
    bloques: BloquesSemana
    modalidad?: Modalidad
    compacto?: boolean
  }>(),
  { modalidad: 'presencial', compacto: false }
)

type FilaHorario =
  { tipo: 'bloque'; inicio: string; fin: string } | { tipo: 'recreo'; texto: string }

const hoy = new Date().getDay() as DiaSemana

const diasVisibles = computed(() =>
  DIAS_SEMANA.filter(
    (dia) => (dia.valor !== 0 && dia.valor !== 6) || (props.bloques[dia.valor]?.length ?? 0) > 0
  )
)

const filas = computed<FilaHorario[]>(() => {
  const resultado: FilaHorario[] = []
  for (const bloque of BLOQUES_HORARIO) {
    if (bloque.inicio === '11:15') {
      resultado.push({ tipo: 'recreo', texto: 'Recreo · 10:45–11:15' })
    }
    if (bloque.inicio === '18:20') {
      resultado.push({ tipo: 'recreo', texto: 'Recreo · 18:00–18:20' })
    }
    resultado.push({ tipo: 'bloque', inicio: bloque.inicio, fin: bloque.fin })
  }
  return resultado
})

function tipoBloque(dia: DiaSemana, inicio: string): TipoBloqueHorario | null {
  return props.bloques[dia]?.find((bloque) => bloque.inicio === inicio)?.tipo ?? null
}

function etiqueta(tipo: TipoBloqueHorario | null): string {
  if (!tipo) return ''
  if (props.compacto) {
    if (tipo === 'sesion') return 'S'
    if (tipo === 'colectiva') return 'C'
    return 'I'
  }
  if (tipo === 'sesion') return 'Sesión'
  if (tipo === 'colectiva') return 'Colectiva'
  return 'Individual'
}

function descripcion(tipo: TipoBloqueHorario | null): string {
  if (tipo === 'sesion') return 'sesión'
  if (tipo === 'colectiva') return 'tutoría colectiva'
  if (tipo === 'individual') return 'tutoría individual'
  return 'libre'
}
</script>

<template>
  <div class="horario-semanal-scroll">
    <div
      class="horario-semanal horario-semanal--lectura"
      :class="{ 'horario-semanal--compacto': compacto }"
      :style="{ '--dias': diasVisibles.length }"
    >
      <div class="horario-semanal__hora horario-semanal__cabecera">Hora</div>
      <div
        v-for="dia in diasVisibles"
        :key="`cabecera-${dia.valor}`"
        class="horario-semanal__dia horario-semanal__cabecera"
        :class="{ 'horario-semanal__cabecera--hoy': dia.valor === hoy }"
      >
        <span>{{ dia.etiqueta }}</span>
        <small v-if="dia.valor === hoy">Hoy</small>
      </div>

      <template v-for="(fila, indice) in filas" :key="`fila-${indice}`">
        <div v-if="fila.tipo === 'recreo'" class="horario-semanal__recreo">
          {{ fila.texto }}
        </div>
        <template v-else>
          <div class="horario-semanal__hora">{{ fila.inicio }}–{{ fila.fin }}</div>
          <div
            v-for="dia in diasVisibles"
            :key="`${fila.inicio}-${dia.valor}`"
            class="horario-semanal__celda horario-semanal__celda--lectura"
            :class="{
              'horario-semanal__celda--sesion': tipoBloque(dia.valor, fila.inicio) === 'sesion',
              'horario-semanal__celda--colectiva':
                tipoBloque(dia.valor, fila.inicio) === 'colectiva',
              'horario-semanal__celda--individual':
                tipoBloque(dia.valor, fila.inicio) === 'individual',
              'horario-semanal__celda--libre': tipoBloque(dia.valor, fila.inicio) === null,
              'horario-semanal__celda--hoy': dia.valor === hoy
            }"
            :title="`${dia.etiqueta} ${fila.inicio}–${fila.fin}: ${descripcion(tipoBloque(dia.valor, fila.inicio))}`"
            :aria-label="`${dia.etiqueta} ${fila.inicio}–${fila.fin}: ${descripcion(tipoBloque(dia.valor, fila.inicio))}`"
          >
            {{ etiqueta(tipoBloque(dia.valor, fila.inicio)) }}
          </div>
        </template>
      </template>
    </div>
  </div>

  <div class="horario-semanal__leyenda">
    <span class="horario-semanal__leyenda-item">
      <i class="horario-semanal__muestra horario-semanal__muestra--sesion"></i> Sesión
    </span>
    <span v-if="modalidad === 'semipresencial'" class="horario-semanal__leyenda-item">
      <i class="horario-semanal__muestra horario-semanal__muestra--colectiva"></i> Tutoría colectiva
    </span>
    <span v-if="modalidad === 'semipresencial'" class="horario-semanal__leyenda-item">
      <i class="horario-semanal__muestra horario-semanal__muestra--individual"></i> Tutoría
      individual
    </span>
    <span class="tenue">La columna de hoy aparece resaltada.</span>
  </div>
</template>
