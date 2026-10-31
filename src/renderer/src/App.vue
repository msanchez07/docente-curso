<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import Confirmacion from '@renderer/components/Confirmacion.vue'
import NotificacionesGlobales from '@renderer/components/NotificacionesGlobales.vue'
import NavegacionGrupo from '@renderer/components/NavegacionGrupo.vue'
import { EVENTO_NORMATIVA_ACTUALIZADA } from '@shared/normativa'
import { useGruposClaseStore } from '@renderer/stores/grupos-clase'
import { useCursosAcademicosStore } from '@renderer/stores/cursos-academicos'

const route = useRoute()
const router = useRouter()
const grupos = useGruposClaseStore()
const cursos = useCursosAcademicosStore()
const confirmarDemo = ref(false)
const confirmarEliminarDemo = ref(false)
const restaurando = ref(false)
const eliminandoDemo = ref(false)
const puedeDemo = Boolean(window.api.demo)
const esNormativa = computed(() => route.name === 'normativa')
const ficheroNormativa = ref<HTMLInputElement | null>(null)
const menuGlobal = ref<HTMLDetailsElement | null>(null)
const avisoBackup = ref<string | null>(null)
const importandoNormativa = ref(false)
const mensajeNormativa = ref<string | null>(null)
let temporizadorNormativa = 0

async function comprobarBackup(): Promise<void> {
  if (!window.api.backup) return
  try {
    const estado = await window.api.backup.estado()
    avisoBackup.value = estado.grupos > 0 ? (estado.mensaje ?? null) : null
  } catch {
    avisoBackup.value = null
  }
}

onMounted(async () => {
  await Promise.all([grupos.cargar(), cursos.cargar()])
  await comprobarBackup()
  window.addEventListener('backup-configurado', comprobarBackup)
  window.addEventListener('focus', comprobarBackup)
})

const gruposVisibles = computed(() =>
  grupos.grupos.filter((grupo) => grupo.curso_academico_id === cursos.activoId)
)

const grupoIdContexto = computed(() => {
  const valor = route.params.grupoId ?? route.params.id ?? route.query.grupo
  const id = Number(valor)
  return Number.isInteger(id) && id > 0 ? id : null
})

const mostrarNavegacionGrupo = computed(() => {
  const nombre = String(route.name ?? '')
  if (!nombre) return false
  return ![
    'grupos',
    'cursos',
    'plantillas',
    'plantilla-editar',
    'backups',
    'normativa',
    'guia',
    'calendario-curso'
  ].includes(nombre)
})

function grupoActivo(grupoId: number): boolean {
  return Number(route.params.grupoId ?? route.params.id) === grupoId
}

function cambiarCurso(evento: Event): void {
  const id = Number((evento.target as HTMLSelectElement).value)
  if (!id) return
  cursos.activar(id)
  if (route.path.startsWith('/grupo/')) router.push('/grupos')
}

watch(
  () => [route.params.id, route.params.grupoId, grupos.grupos.length, cursos.cursos.length],
  () => {
    const grupoId = Number(route.params.grupoId ?? route.params.id)
    if (!grupoId) return
    const grupo = grupos.grupos.find((item) => item.id === grupoId)
    if (grupo && grupo.curso_academico_id !== cursos.activoId) {
      cursos.activar(grupo.curso_academico_id)
    }
  }
)

async function restaurarDemo(): Promise<void> {
  if (!window.api.demo) return
  restaurando.value = true
  try {
    await window.api.demo.cargar()
    window.location.hash = '#/grupo/1'
    window.location.reload()
  } finally {
    restaurando.value = false
  }
}

async function eliminarDemo(): Promise<void> {
  if (!window.api.demo) return
  eliminandoDemo.value = true
  try {
    await window.api.demo.eliminar()
    window.location.hash = '#/grupos'
    window.location.reload()
  } finally {
    eliminandoDemo.value = false
  }
}

function cerrarMenuGlobal(): void {
  if (menuGlobal.value) menuGlobal.value.open = false
}

function importarNormativaDesdeMenu(): void {
  cerrarMenuGlobal()
  ficheroNormativa.value?.click()
}

function abrirDemoDesdeMenu(tipo: 'restaurar' | 'eliminar'): void {
  cerrarMenuGlobal()
  if (tipo === 'restaurar') confirmarDemo.value = true
  else confirmarEliminarDemo.value = true
}

async function importarNormativa(evento: Event): Promise<void> {
  const entrada = evento.target as HTMLInputElement
  const archivo = entrada.files?.[0]
  if (!archivo) return
  importandoNormativa.value = true
  mensajeNormativa.value = null
  try {
    if (archivo.size > 20 * 1024 * 1024) {
      throw new Error('El archivo supera los 20 MB.')
    }
    await window.api.normativaFpt.importar(await archivo.text())
    mensajeNormativa.value = 'Normativa actualizada.'
    window.dispatchEvent(new CustomEvent(EVENTO_NORMATIVA_ACTUALIZADA))
    if (route.name !== 'normativa') await router.push('/normativa')
    window.clearTimeout(temporizadorNormativa)
    temporizadorNormativa = window.setTimeout(() => {
      mensajeNormativa.value = null
    }, 4000)
  } catch (e) {
    mensajeNormativa.value = (e as Error).message ?? String(e)
  } finally {
    importandoNormativa.value = false
    entrada.value = ''
  }
}
</script>

<template>
  <div class="app">
    <aside class="lateral">
      <h1 class="marca">Curso DAW</h1>

      <div class="menu__curso">
        <label for="curso-academico">Curso académico</label>
        <div class="menu__curso-select">
          <select
            id="curso-academico"
            :value="cursos.activoId ?? ''"
            :disabled="cursos.cargando"
            @change="cambiarCurso"
          >
            <option v-if="cursos.cursos.length === 0" value="">Sin cursos</option>
            <option v-for="curso in cursos.cursos" :key="curso.id" :value="curso.id">
              {{ curso.nombre }}
            </option>
          </select>
          <svg
            class="menu__curso-flecha"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
        <RouterLink to="/cursos" class="menu__curso-enlace">Gestionar cursos</RouterLink>
      </div>

      <nav class="menu" aria-label="Grupos">
        <RouterLink to="/calendario" class="menu__enlace menu__enlace--general">
          Calendario del curso
        </RouterLink>
        <div class="menu__titulo">Grupos</div>

        <p v-if="grupos.cargando && grupos.grupos.length === 0" class="menu__vacio">Cargando…</p>
        <p v-else-if="gruposVisibles.length === 0" class="menu__vacio">
          No hay grupos en este curso.
        </p>

        <RouterLink
          v-for="grupo in gruposVisibles"
          :key="grupo.id"
          :to="{ name: 'grupo', params: { id: grupo.id } }"
          class="menu__grupo"
          :class="{ 'menu__grupo--activo': grupoActivo(grupo.id) }"
        >
          <span class="menu__grupo-nombre">{{ grupo.nombre }}</span>
          <span class="menu__grupo-meta">
            <span>{{ grupo.alumnos }} alumnos</span>
            <span
              class="punto"
              :class="grupo.criterios ? 'punto--ok' : 'punto--falta'"
              :title="grupo.criterios ? 'Criterios definidos' : 'Sin criterios'"
            ></span>
          </span>
        </RouterLink>

        <RouterLink to="/grupos?nuevo=1" class="menu__enlace menu__enlace--accion">
          + Nuevo grupo
        </RouterLink>
      </nav>

      <details ref="menuGlobal" class="menu menu--pie menu-global">
        <summary class="menu__enlace menu-global__boton">
          <span>Opciones globales</span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </summary>
        <div class="menu-global__panel">
          <RouterLink to="/grupos" class="menu__enlace" @click="cerrarMenuGlobal">
            Gestionar grupos
          </RouterLink>
          <RouterLink to="/cursos" class="menu__enlace" @click="cerrarMenuGlobal">
            Cursos académicos
          </RouterLink>
          <RouterLink to="/plantillas" class="menu__enlace" @click="cerrarMenuGlobal">
            Plantillas
          </RouterLink>
          <RouterLink to="/faltas" class="menu__enlace" @click="cerrarMenuGlobal">
            Control de faltas
          </RouterLink>
          <RouterLink to="/backups" class="menu__enlace" @click="cerrarMenuGlobal">
            Copias de seguridad
          </RouterLink>
          <RouterLink to="/guia" class="menu__enlace" @click="cerrarMenuGlobal">
            Guía de uso
          </RouterLink>
          <RouterLink to="/normativa" class="menu__enlace" @click="cerrarMenuGlobal">
            Normativa FP
          </RouterLink>
          <button
            class="menu__enlace menu__enlace--boton"
            type="button"
            :disabled="importandoNormativa"
            @click="importarNormativaDesdeMenu"
          >
            {{ importandoNormativa ? 'Importando normativa…' : 'Importar normativa' }}
          </button>
          <template v-if="puedeDemo">
            <button
              class="menu__enlace menu__enlace--boton"
              type="button"
              @click="abrirDemoDesdeMenu('restaurar')"
            >
              Restaurar datos de prueba
            </button>
            <button
              class="menu__enlace menu__enlace--boton menu__enlace--peligro"
              type="button"
              @click="abrirDemoDesdeMenu('eliminar')"
            >
              Eliminar datos de prueba
            </button>
          </template>
          <p v-if="mensajeNormativa" class="menu__aviso">{{ mensajeNormativa }}</p>
        </div>
      </details>
      <input
        ref="ficheroNormativa"
        hidden
        type="file"
        accept=".html,text/html"
        @change="importarNormativa"
      />

      <footer class="pie">
        <div>Gestión del curso</div>
        <div>Datos: BOE · v0.1.0</div>
      </footer>
    </aside>

    <main class="contenido" :class="{ 'contenido--normativa': esNormativa }">
      <div v-if="avisoBackup && !esNormativa" class="aviso aviso--aviso backup-aviso" role="status">
        <span>{{ avisoBackup }}</span>
        <RouterLink to="/backups" class="backup-aviso__enlace">Revisar copias</RouterLink>
      </div>
      <NavegacionGrupo v-if="mostrarNavegacionGrupo" :grupo-id="grupoIdContexto" />
      <RouterView />
    </main>

    <Confirmacion
      v-if="confirmarDemo"
      titulo="¿Restaurar datos de prueba?"
      etiqueta-confirmar="Sí, restaurar"
      :ocupado="restaurando"
      @cancelar="confirmarDemo = false"
      @confirmar="restaurarDemo"
    >
      <p>
        Se sustituirán los datos de este navegador por el grupo de ejemplo con alumnado, criterios y
        programación.
      </p>
      <p class="tenue">Es solo para la previsualización; no afecta a la aplicación real.</p>
    </Confirmacion>

    <Confirmacion
      v-if="confirmarEliminarDemo"
      titulo="¿Eliminar datos de prueba?"
      etiqueta-confirmar="Sí, eliminar"
      peligro
      :ocupado="eliminandoDemo"
      @cancelar="confirmarEliminarDemo = false"
      @confirmar="eliminarDemo"
    >
      <p>
        Se borrarán los datos de la previsualización: grupos, alumnado, criterios, entregas y
        programación. La aplicación quedará vacía.
      </p>
      <p class="tenue">
        Esta acción no afecta a la aplicación real de escritorio. Podrás volver a cargar los datos
        de prueba con «Restaurar datos de prueba».
      </p>
    </Confirmacion>
    <NotificacionesGlobales />
  </div>
</template>
