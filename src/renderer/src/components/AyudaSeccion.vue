<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import Modal from '@renderer/components/Modal.vue'
import { guiaParaRuta } from '@renderer/content/guia'

const route = useRoute()
const abierto = ref(false)
const seccion = computed(() => guiaParaRuta(String(route.name ?? '')))
</script>

<template>
  <button
    v-if="seccion"
    class="dashboard__tool navegacion-grupo__ayuda"
    type="button"
    aria-haspopup="dialog"
    @click="abierto = true"
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
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.7-2.5 2-2.5 4" />
        <path d="M12 17h.01" />
      </svg>
    </span>
    Ayuda
  </button>

  <Modal v-if="abierto && seccion" :titulo="seccion.titulo" ancho="ancho" @cerrar="abierto = false">
    <div class="ayuda-seccion">
      <p class="tenue">{{ seccion.resumen }}</p>
      <div class="ayuda-seccion__explicacion">
        <p v-for="parrafo in seccion.explicacion" :key="parrafo">{{ parrafo }}</p>
      </div>
      <img
        class="ayuda-seccion__captura"
        :src="seccion.imagen"
        :alt="`Captura de ${seccion.titulo}`"
      />
      <ul class="ayuda-seccion__puntos">
        <li v-for="punto in seccion.puntos" :key="punto">{{ punto }}</li>
      </ul>
      <div class="ayuda-seccion__pie">
        <RouterLink class="boton boton--principal" to="/guia" @click="abierto = false">
          Ver guía completa
        </RouterLink>
      </div>
    </div>
  </Modal>
</template>
