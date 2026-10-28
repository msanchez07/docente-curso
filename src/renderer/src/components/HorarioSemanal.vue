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
  if (tipo === 'sesion') return 'S'
  if (tipo === 'colectiva') return 'C'
  if (tipo === 'individual') return 'I'
  return ''
}
</script>

<template>
  <div class="horario-semanal-scroll">
    <div
      class="horario-semanal horario-semanal--lectura"
      :class="{ 'horario-semanal--compacto': compacto }"
    >
      <div class="horario-semanal__hora horario-semanal__cabecera">Hora</div>
      <div
        v-for="dia in DIAS_SEMANA"
        :key="`cabecera-${dia.valor}`"
        class="horario-semanal__dia horario-semanal__cabecera"
        :class="{ 'horario-semanal__cabecera--hoy': dia.valor === hoy }"
      >
        {{ dia.corto }}
      </div>

      <template v-for="(fila, indice) in filas" :key="`fila-${indice}`">
        <div v-if="fila.tipo === 'recreo'" class="horario-semanal__recreo">
          {{ fila.texto }}
        </div>
        <template v-else>
          <div class="horario-semanal__hora">{{ fila.inicio }}–{{ fila.fin }}</div>
          <div
            v-for="dia in DIAS_SEMANA"
            :key="`${fila.inicio}-${dia.valor}`"
            class="horario-semanal__celda horario-semanal__celda--lectura"
            :class="{
              'horario-semanal__celda--sesion': tipoBloque(dia.valor, fila.inicio) === 'sesion',
              'horario-semanal__celda--colectiva':
                tipoBloque(dia.valor, fila.inicio) === 'colectiva',
              'horario-semanal__celda--individual':
                tipoBloque(dia.valor, fila.inicio) === 'individual',
              'horario-semanal__celda--hoy': dia.valor === hoy
            }"
            :title="`${dia.etiqueta} ${fila.inicio}–${fila.fin}: ${
              tipoBloque(dia.valor, fila.inicio) === 'sesion'
                ? 'sesión'
                : tipoBloque(dia.valor, fila.inicio) === 'colectiva'
                  ? 'tutoría colectiva'
                  : tipoBloque(dia.valor, fila.inicio) === 'individual'
                    ? 'tutoría individual'
                    : 'libre'
            }`"
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
