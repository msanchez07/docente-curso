<script setup lang="ts">
import { cerrarNotificacion, notificaciones } from '@renderer/composables/notificaciones'
</script>

<template>
  <Teleport to="body">
    <div class="notificaciones" aria-live="polite" aria-atomic="false">
      <div
        v-for="notificacion in notificaciones"
        :key="notificacion.id"
        class="notificacion"
        :class="`notificacion--${notificacion.tipo}`"
        role="status"
      >
        <span class="notificacion__icono" aria-hidden="true">
          <template v-if="notificacion.tipo === 'ok'">✓</template>
          <template v-else-if="notificacion.tipo === 'error'">!</template>
          <template v-else>i</template>
        </span>
        <span class="notificacion__texto">{{ notificacion.mensaje }}</span>
        <button
          class="notificacion__cerrar"
          type="button"
          aria-label="Cerrar aviso"
          @click="cerrarNotificacion(notificacion.id)"
        >
          ×
        </button>
      </div>
    </div>
  </Teleport>
</template>
