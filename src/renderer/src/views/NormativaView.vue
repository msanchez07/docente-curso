<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { EVENTO_NORMATIVA_ACTUALIZADA } from '@shared/normativa'
import type { NormativaFpt } from '@shared/tipos'

const normativa = ref<NormativaFpt | null>(null)
const cargando = ref(true)
const error = ref<string | null>(null)

async function cargar(): Promise<void> {
  try {
    normativa.value = await window.api.normativaFpt.leer()
    error.value = null
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    cargando.value = false
  }
}

function alActualizar(): void {
  void cargar()
}

onMounted(() => {
  void cargar()
  window.addEventListener(EVENTO_NORMATIVA_ACTUALIZADA, alActualizar)
})

onBeforeUnmount(() => {
  window.removeEventListener(EVENTO_NORMATIVA_ACTUALIZADA, alActualizar)
})
</script>

<template>
  <section class="normativa">
    <div v-if="cargando" class="normativa__estado">
      <p class="vacio">Cargando normativa…</p>
    </div>
    <div v-else-if="error" class="normativa__estado">
      <p class="aviso aviso--error" role="alert">{{ error }}</p>
    </div>
    <iframe
      v-else-if="normativa"
      :key="normativa.actualizado_en ?? normativa.origen"
      :src="normativa.url ?? undefined"
      :srcdoc="normativa.html ?? undefined"
      class="normativa__preview normativa__preview--completa"
      title="Normativa de Formación Profesional"
    ></iframe>
  </section>
</template>
