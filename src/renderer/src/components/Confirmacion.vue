<script setup lang="ts">
import Modal from '@renderer/components/Modal.vue'

withDefaults(
  defineProps<{
    titulo: string
    etiquetaConfirmar?: string
    etiquetaCancelar?: string
    peligro?: boolean
    ocupado?: boolean
  }>(),
  {
    etiquetaConfirmar: 'Confirmar',
    etiquetaCancelar: 'Cancelar',
    peligro: false,
    ocupado: false
  }
)

const emit = defineEmits<{ confirmar: []; cancelar: [] }>()
</script>

<template>
  <Modal :titulo="titulo" @cerrar="emit('cancelar')">
    <slot />
    <template #pie>
      <button class="boton" type="button" :disabled="ocupado" @click="emit('cancelar')">
        {{ etiquetaCancelar }}
      </button>
      <button
        class="boton"
        :class="peligro ? 'boton--peligro' : 'boton--principal'"
        type="button"
        :disabled="ocupado"
        @click="emit('confirmar')"
      >
        {{ ocupado ? 'Un momento…' : etiquetaConfirmar }}
      </button>
    </template>
  </Modal>
</template>
