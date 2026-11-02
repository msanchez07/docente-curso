<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { descargarJson } from '@renderer/utils/descargar-json'
import { ESQUEMA_CICLO } from '@shared/esquemas-importacion'
import { notificar } from '@renderer/composables/notificaciones'
import type { ResultadoImportacionCurriculo, ResumenCiclo } from '@shared/tipos'

const ciclos = ref<ResumenCiclo[]>([])
const cargando = ref(true)
const error = ref<string | null>(null)
const mensaje = ref<string | null>(null)
const mostrarImportar = ref(false)
const textoImportar = ref('')
const ficheroImportar = ref<HTMLInputElement | null>(null)
const importando = ref(false)
const resultado = ref<ResultadoImportacionCurriculo | null>(null)

const totales = computed(() =>
  ciclos.value.reduce(
    (total, ciclo) => ({
      modulos: total.modulos + ciclo.modulos,
      ra: total.ra + ciclo.ra,
      ce: total.ce + ciclo.ce
    }),
    { modulos: 0, ra: 0, ce: 0 }
  )
)

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = null
  try {
    ciclos.value = await window.api.boe.listarCiclos()
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)

function abrirImportar(): void {
  mostrarImportar.value = true
  textoImportar.value = ''
  resultado.value = null
  error.value = null
  mensaje.value = null
}

function exportarEsquema(): void {
  descargarJson('esquema-curriculo.json', ESQUEMA_CICLO)
}

async function importarTexto(texto: string): Promise<void> {
  if (!texto.trim()) return
  importando.value = true
  error.value = null
  mensaje.value = null
  resultado.value = null
  try {
    const importado = await window.api.curriculos.importar(texto)
    resultado.value = importado
    if (importado.errores.length === 0 && importado.ciclos > 0) {
      const resumen = `Importados ${importado.ciclos} ciclo(s), ${importado.modulos} módulo(s), ${importado.ra} RA y ${importado.ce} CE.`
      mensaje.value = [resumen, ...importado.avisos].join(' ')
      notificar(resumen)
      mostrarImportar.value = false
      await cargar()
    }
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    importando.value = false
  }
}

async function importarPegado(): Promise<void> {
  await importarTexto(textoImportar.value)
}

async function alElegirFichero(evento: Event): Promise<void> {
  const entrada = evento.target as HTMLInputElement
  const archivo = entrada.files?.[0]
  if (!archivo) return
  try {
    await importarTexto(await archivo.text())
  } finally {
    entrada.value = ''
  }
}
</script>

<template>
  <section class="tarjeta curriculo">
    <header class="cabecera-criterios">
      <div class="cabecera-criterios__titulo">
        <h3>Currículo: módulos, RA y CE</h3>
        <span class="tenue">
          Importa un ciclo completo desde JSON o consulta la cobertura actual. Los pesos de RA y CE
          ya configurados se conservan.
        </span>
      </div>
      <div class="cabecera-criterios__acciones">
        <button class="boton" type="button" @click="exportarEsquema">Descargar esquema</button>
        <button class="boton boton--principal" type="button" @click="abrirImportar">
          Importar currículo
        </button>
      </div>
    </header>

    <p v-if="error" class="aviso aviso--error" role="alert">{{ error }}</p>
    <p v-if="mensaje" class="aviso aviso--ok" role="status">{{ mensaje }}</p>

    <div v-if="mostrarImportar" class="programacion__importar">
      <p class="tenue">
        Acepta un ciclo, un array de ciclos o <span class="monospace">{ "ciclos": [...] }</span>.
        Cada módulo incluye <span class="monospace">ra</span> y cada RA sus
        <span class="monospace">ce</span>. Si el <span class="monospace">id</span> coincide con el
        catálogo, los grupos existentes enlazan automáticamente.
      </p>
      <div class="barra">
        <button class="boton" type="button" @click="ficheroImportar?.click()">
          Elegir fichero…
        </button>
        <input
          ref="ficheroImportar"
          hidden
          type="file"
          accept=".json,application/json"
          @change="alElegirFichero"
        />
        <span class="tenue">o pega el JSON abajo</span>
      </div>
      <textarea
        v-model="textoImportar"
        rows="10"
        class="monospace"
        placeholder='{
  "id": "gs-desarrollo-de-aplicaciones-multiplataforma",
  "denominacion": "Desarrollo de Aplicaciones Multiplataforma",
  "modulos": [
    {
      "codigo": "0484",
      "nombre": "Bases de Datos",
      "ra": [
        {
          "codigo": "RA1",
          "descripcion": "Reconoce los elementos de las bases de datos relacionales.",
          "ce": [{ "codigo": "a", "descripcion": "Se han identificado..." }]
        }
      ]
    }
  ]
}'
      ></textarea>
      <div v-if="resultado && resultado.errores.length > 0" class="aviso aviso--error" role="alert">
        <strong>No se ha importado nada:</strong>
        <ul>
          <li v-for="(fallo, indice) in resultado.errores.slice(0, 20)" :key="indice">
            {{ fallo }}
          </li>
        </ul>
        <span v-if="resultado.errores.length > 20" class="tenue">
          …y {{ resultado.errores.length - 20 }} error(es) más.
        </span>
      </div>
      <div v-if="resultado && resultado.avisos.length > 0" class="aviso" role="status">
        <strong>Avisos:</strong>
        <ul>
          <li v-for="(aviso, indice) in resultado.avisos" :key="indice">{{ aviso }}</li>
        </ul>
      </div>
      <div class="criterios__pie-fila">
        <button class="boton" type="button" @click="mostrarImportar = false">Cancelar</button>
        <span class="barra__espacio"></span>
        <button
          class="boton boton--principal"
          type="button"
          :disabled="importando || !textoImportar.trim()"
          @click="importarPegado"
        >
          {{ importando ? 'Importando…' : 'Importar' }}
        </button>
      </div>
    </div>

    <div v-if="cargando" class="vacio">Cargando currículos…</div>
    <template v-else>
      <p v-if="ciclos.length === 0" class="vacio">
        No hay ciclos con RA/CE. Descarga el esquema y comienza por el ciclo que impartes.
      </p>
      <template v-else>
        <p class="tenue">
          {{ ciclos.length }} ciclo(s) · {{ totales.modulos }} módulo(s) · {{ totales.ra }} RA ·
          {{ totales.ce }} CE.
        </p>
        <div class="tabla-scroll">
          <table class="tabla">
            <thead>
              <tr>
                <th>Ciclo</th>
                <th>Nivel</th>
                <th class="num">Módulos</th>
                <th class="num">RA</th>
                <th class="num">CE</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ciclo in ciclos" :key="ciclo.id">
                <td>
                  <strong>{{ ciclo.denominacion }}</strong>
                  <div class="tenue monospace">{{ ciclo.id }}</div>
                </td>
                <td>{{ ciclo.nivel }}</td>
                <td class="num">{{ ciclo.modulos }}</td>
                <td class="num">{{ ciclo.ra }}</td>
                <td class="num">{{ ciclo.ce }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </template>
  </section>
</template>
