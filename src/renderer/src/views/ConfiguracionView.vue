<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { notificar } from '@renderer/composables/notificaciones'
import { CONFIGURACION_GENERAL_POR_DEFECTO } from '@shared/tipos'
import type { ConfiguracionGeneral } from '@shared/tipos'

const configuracion = ref<ConfiguracionGeneral>({
  ...CONFIGURACION_GENERAL_POR_DEFECTO,
  profesor: { ...CONFIGURACION_GENERAL_POR_DEFECTO.profesor },
  centro: { ...CONFIGURACION_GENERAL_POR_DEFECTO.centro }
})
const cargando = ref(true)
const guardando = ref(false)
const error = ref<string | null>(null)
const ficheroLogo = ref<HTMLInputElement | null>(null)

function copiar(config: ConfiguracionGeneral): ConfiguracionGeneral {
  return {
    profesor: { ...config.profesor },
    centro: { ...config.centro },
    logo: config.logo
  }
}

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = null
  try {
    configuracion.value = copiar(await window.api.configuracion.obtener())
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)

function elegirLogo(): void {
  ficheroLogo.value?.click()
}

function quitarLogo(): void {
  configuracion.value.logo = null
  if (ficheroLogo.value) ficheroLogo.value.value = ''
}

async function alElegirLogo(evento: Event): Promise<void> {
  const entrada = evento.target as HTMLInputElement
  const archivo = entrada.files?.[0]
  if (!archivo) return
  error.value = null
  if (archivo.type !== 'image/png') {
    error.value = 'El logo debe ser un archivo PNG.'
    entrada.value = ''
    return
  }
  if (archivo.size > 2 * 1024 * 1024) {
    error.value = 'El logo es demasiado grande. Usa una imagen inferior a 2 MB.'
    entrada.value = ''
    return
  }
  const lector = new FileReader()
  lector.onload = () => {
    configuracion.value.logo = String(lector.result)
  }
  lector.onerror = () => {
    error.value = 'No se ha podido leer el logo.'
  }
  lector.readAsDataURL(archivo)
  entrada.value = ''
}

async function guardar(): Promise<void> {
  guardando.value = true
  error.value = null
  try {
    configuracion.value = copiar(await window.api.configuracion.guardar(configuracion.value))
    notificar('Configuración general guardada.')
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <section class="vista vista--ancha configuracion">
    <header class="vista__cabecera">
      <div>
        <p class="dashboard__eyebrow">Ajustes de la aplicación</p>
        <h2>Configuración general</h2>
        <p class="tenue">
          Datos del profesorado, del centro y logo. Se guardan en este equipo y se usan como
          identificación de la aplicación.
        </p>
      </div>
    </header>

    <div v-if="cargando" class="vacio">Cargando configuración…</div>
    <p v-if="error" class="aviso aviso--error" role="alert">{{ error }}</p>

    <template v-if="!cargando">
      <section class="tarjeta">
        <header class="cabecera-criterios">
          <div class="cabecera-criterios__titulo">
            <h3>Profesorado</h3>
            <span class="tenue">Datos de la persona que usa la aplicación.</span>
          </div>
        </header>

        <div class="formulario">
          <div class="campo">
            <label for="profesor-nombre">Nombre</label>
            <input id="profesor-nombre" v-model="configuracion.profesor.nombre" type="text" />
          </div>
          <div class="campo">
            <label for="profesor-apellidos">Apellidos</label>
            <input id="profesor-apellidos" v-model="configuracion.profesor.apellidos" type="text" />
          </div>
          <div class="campo">
            <label for="profesor-email">Correo electrónico</label>
            <input id="profesor-email" v-model="configuracion.profesor.email" type="email" />
          </div>
          <div class="campo">
            <label for="profesor-telefono">Teléfono</label>
            <input id="profesor-telefono" v-model="configuracion.profesor.telefono" type="tel" />
          </div>
          <div class="campo campo--ancho">
            <label for="profesor-departamento">Departamento</label>
            <input
              id="profesor-departamento"
              v-model="configuracion.profesor.departamento"
              type="text"
              placeholder="Informática"
            />
          </div>
        </div>
      </section>

      <section class="tarjeta">
        <header class="cabecera-criterios">
          <div class="cabecera-criterios__titulo">
            <h3>Centro educativo</h3>
            <span class="tenue">Datos que identifican al instituto o centro.</span>
          </div>
        </header>

        <div class="formulario">
          <div class="campo campo--ancho">
            <label for="centro-nombre">Nombre del centro</label>
            <input id="centro-nombre" v-model="configuracion.centro.nombre" type="text" />
          </div>
          <div class="campo">
            <label for="centro-codigo">Código de centro</label>
            <input
              id="centro-codigo"
              v-model="configuracion.centro.codigoCentro"
              type="text"
              placeholder="28000000"
            />
          </div>
          <div class="campo campo--ancho">
            <label for="centro-direccion">Dirección</label>
            <input id="centro-direccion" v-model="configuracion.centro.direccion" type="text" />
          </div>
          <div class="campo">
            <label for="centro-localidad">Localidad</label>
            <input id="centro-localidad" v-model="configuracion.centro.localidad" type="text" />
          </div>
          <div class="campo">
            <label for="centro-provincia">Provincia</label>
            <input id="centro-provincia" v-model="configuracion.centro.provincia" type="text" />
          </div>
          <div class="campo">
            <label for="centro-cp">Código postal</label>
            <input id="centro-cp" v-model="configuracion.centro.codigoPostal" type="text" />
          </div>
          <div class="campo">
            <label for="centro-telefono">Teléfono</label>
            <input id="centro-telefono" v-model="configuracion.centro.telefono" type="tel" />
          </div>
          <div class="campo">
            <label for="centro-email">Correo electrónico</label>
            <input id="centro-email" v-model="configuracion.centro.email" type="email" />
          </div>
          <div class="campo">
            <label for="centro-web">Sitio web</label>
            <input id="centro-web" v-model="configuracion.centro.web" type="url" />
          </div>
        </div>
      </section>

      <section class="tarjeta">
        <header class="cabecera-criterios">
          <div class="cabecera-criterios__titulo">
            <h3>Logo del centro</h3>
            <span class="tenue">Imagen PNG. Tamaño máximo: 2 MB.</span>
          </div>
          <div class="cabecera-criterios__acciones">
            <button class="boton" type="button" @click="elegirLogo">Elegir PNG</button>
            <button
              v-if="configuracion.logo"
              class="boton boton--sutil"
              type="button"
              @click="quitarLogo"
            >
              Quitar logo
            </button>
            <input
              ref="ficheroLogo"
              class="visualmente-oculto"
              type="file"
              accept="image/png"
              @change="alElegirLogo"
            />
          </div>
        </header>

        <div class="configuracion__logo">
          <img
            v-if="configuracion.logo"
            :src="configuracion.logo"
            alt="Logo del centro"
            class="configuracion__logo-preview"
          />
          <div v-else class="configuracion__logo-vacio">
            <strong>Sin logo</strong>
            <span class="tenue">Selecciona un PNG para previsualizarlo aquí.</span>
          </div>
        </div>
      </section>

      <div class="configuracion__acciones">
        <button class="boton boton--principal" type="button" :disabled="guardando" @click="guardar">
          {{ guardando ? 'Guardando…' : 'Guardar configuración' }}
        </button>
      </div>
    </template>
  </section>
</template>
