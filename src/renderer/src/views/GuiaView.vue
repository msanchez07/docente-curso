<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { seccionesGuia } from '@renderer/content/guia'

const seleccion = ref(seccionesGuia[0]?.id ?? '')
const seccion = computed(
  () => seccionesGuia.find((item) => item.id === seleccion.value) ?? seccionesGuia[0] ?? null
)
</script>

<template>
  <section class="vista vista--ancha guia">
    <header class="vista__cabecera">
      <div>
        <p class="dashboard__eyebrow">Ayuda integrada</p>
        <h2>Guía de uso</h2>
        <p class="tenue">
          Todo lo que hace la aplicación, sección a sección, con capturas reales de la interfaz.
        </p>
      </div>
    </header>

    <section class="tarjeta guia__portada">
      <div>
        <h3>Empieza por aquí</h3>
        <p class="tenue">
          El grupo es el centro de la aplicación. Elige un grupo en la barra lateral y muévete con
          la barra superior; cada pantalla tiene una ayuda contextual con el botón «Ayuda».
        </p>
      </div>
      <ol class="guia__pasos">
        <li><strong>Elige el grupo</strong> en la barra lateral.</li>
        <li>
          <strong>Revisa el dashboard</strong>: sesiones, entregas, exámenes y alumnado en riesgo.
        </li>
        <li><strong>Configura los criterios</strong> antes de calcular notas.</li>
        <li><strong>Trabaja el día a día</strong> desde programación, entregas y faltas.</li>
        <li><strong>Consulta y exporta</strong> desde calificaciones e informes.</li>
      </ol>
    </section>

    <div class="guia__layout">
      <aside class="tarjeta guia__indice" aria-label="Secciones de la guía">
        <span class="guia__indice-titulo">Secciones</span>
        <button
          v-for="item in seccionesGuia"
          :key="item.id"
          type="button"
          class="guia__indice-boton"
          :class="{ 'guia__indice-boton--activo': item.id === seleccion }"
          @click="seleccion = item.id"
        >
          {{ item.titulo }}
        </button>
      </aside>

      <article v-if="seccion" class="tarjeta guia__detalle">
        <header class="guia__detalle-cabecera">
          <div>
            <p class="dashboard__eyebrow">Guía de la sección</p>
            <h3>{{ seccion.titulo }}</h3>
            <p class="tenue">{{ seccion.resumen }}</p>
          </div>
          <code class="guia__ruta">{{ seccion.ruta }}</code>
        </header>

        <div class="guia__explicacion">
          <p v-for="parrafo in seccion.explicacion" :key="parrafo">{{ parrafo }}</p>
        </div>

        <img class="guia__captura" :src="seccion.imagen" :alt="`Captura de ${seccion.titulo}`" />

        <div class="guia__puntos">
          <h4>Qué puedes hacer aquí</h4>
          <ul>
            <li v-for="punto in seccion.puntos" :key="punto.titulo">
              <strong>{{ punto.titulo }}</strong>
              <span>{{ punto.detalle }}</span>
            </li>
          </ul>
        </div>

        <footer class="guia__pie">
          <span class="tenue"> Esta guía se actualiza con cada cambio de la aplicación. </span>
          <RouterLink class="boton" to="/grupos">Ir a mis grupos</RouterLink>
        </footer>
      </article>
    </div>
  </section>
</template>
