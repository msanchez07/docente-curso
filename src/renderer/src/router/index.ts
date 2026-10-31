import { createRouter, createWebHashHistory } from 'vue-router'
import AlumnadoView from '@renderer/views/AlumnadoView.vue'
import AlumnoDetalleView from '@renderer/views/AlumnoDetalleView.vue'
import AlumnoFormacionView from '@renderer/views/AlumnoFormacionView.vue'
import BoeView from '@renderer/views/BoeView.vue'
import CalificacionesView from '@renderer/views/CalificacionesView.vue'
import ConvocatoriasView from '@renderer/views/ConvocatoriasView.vue'
import CriteriosView from '@renderer/views/CriteriosView.vue'
import CursosView from '@renderer/views/CursosView.vue'
import EntregaEvidenciasView from '@renderer/views/EntregaEvidenciasView.vue'
import EntregaFormView from '@renderer/views/EntregaFormView.vue'
import EntregaNotasView from '@renderer/views/EntregaNotasView.vue'
import EntregasView from '@renderer/views/EntregasView.vue'
import EventosEvaluacionView from '@renderer/views/EventosEvaluacionView.vue'
import GrupoDashboardView from '@renderer/views/GrupoDashboardView.vue'
import GruposView from '@renderer/views/GruposView.vue'
import InformesView from '@renderer/views/InformesView.vue'
import NormativaView from '@renderer/views/NormativaView.vue'
import ProgramacionView from '@renderer/views/ProgramacionView.vue'
import HorarioGrupoView from '@renderer/views/HorarioGrupoView.vue'
import FaltasView from '@renderer/views/FaltasView.vue'
import ProgramacionDidacticaView from '@renderer/views/ProgramacionDidacticaView.vue'
import PlantillasView from '@renderer/views/PlantillasView.vue'
import PlantillaFormView from '@renderer/views/PlantillaFormView.vue'
import BackupsView from '@renderer/views/BackupsView.vue'
import GuiaView from '@renderer/views/GuiaView.vue'
import CalendarioCursoView from '@renderer/views/CalendarioCursoView.vue'
import { registrarNavegacion } from '@renderer/composables/volver'

// Solo Grupos por ahora. Las demás vistas siguen en `views/` y se irán
// incorporando cuando se definan sus fichas de producto.
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: { name: 'calendario-curso' } },
    { path: '/grupos', name: 'grupos', component: GruposView },
    { path: '/calendario', name: 'calendario-curso', component: CalendarioCursoView },
    { path: '/dashboard', redirect: { name: 'calendario-curso' } },
    { path: '/cursos', name: 'cursos', component: CursosView },
    { path: '/plantillas', name: 'plantillas', component: PlantillasView },
    { path: '/backups', name: 'backups', component: BackupsView },
    { path: '/guia', name: 'guia', component: GuiaView },
    {
      path: '/plantillas/:plantillaId',
      name: 'plantilla-editar',
      component: PlantillaFormView
    },
    { path: '/normativa', name: 'normativa', component: NormativaView },
    { path: '/grupo/:id', name: 'grupo', component: GrupoDashboardView },
    {
      path: '/grupo/:grupoId/programacion',
      name: 'programacion',
      component: ProgramacionView
    },
    {
      path: '/grupo/:grupoId/horario',
      name: 'horario-grupo',
      component: HorarioGrupoView
    },
    {
      path: '/faltas',
      name: 'faltas',
      component: FaltasView
    },
    {
      path: '/grupo/:grupoId/programacion-didactica',
      name: 'programacion-didactica',
      component: ProgramacionDidacticaView
    },
    {
      path: '/grupo/:grupoId/criterios',
      name: 'criterios',
      component: CriteriosView
    },
    {
      path: '/grupo/:grupoId/alumnado',
      name: 'alumnado',
      component: AlumnadoView
    },
    {
      path: '/grupo/:grupoId/alumnado/:alumnoId',
      name: 'alumno',
      component: AlumnoDetalleView
    },
    {
      path: '/grupo/:grupoId/alumnado/:alumnoId/formacion',
      name: 'alumno-formacion',
      component: AlumnoFormacionView
    },
    {
      path: '/grupo/:grupoId/entregas',
      name: 'entregas',
      component: EntregasView
    },
    {
      path: '/grupo/:grupoId/entregas/nueva',
      name: 'entrega-nueva',
      component: EntregaFormView
    },
    {
      path: '/grupo/:grupoId/entregas/:entregaId/editar',
      name: 'entrega-editar',
      component: EntregaFormView
    },
    {
      path: '/grupo/:grupoId/entregas/:entregaId/evidencias',
      name: 'entrega-evidencias',
      component: EntregaEvidenciasView
    },
    {
      path: '/grupo/:grupoId/entregas/:entregaId',
      name: 'entrega-notas',
      component: EntregaNotasView
    },
    {
      path: '/grupo/:grupoId/boe',
      name: 'boe',
      component: BoeView
    },
    {
      path: '/grupo/:grupoId/evaluaciones',
      name: 'evaluaciones',
      component: EventosEvaluacionView
    },
    {
      path: '/grupo/:grupoId/calificaciones',
      name: 'calificaciones',
      component: CalificacionesView
    },
    {
      path: '/grupo/:grupoId/convocatorias',
      name: 'convocatorias',
      component: ConvocatoriasView
    },
    {
      path: '/grupo/:grupoId/informes',
      name: 'informes',
      component: InformesView
    },
    {
      path: '/programacion/:grupoId',
      redirect: (to) => `/grupo/${to.params.grupoId}/programacion`
    },
    { path: '/:pathMatch(.*)*', redirect: '/grupos' }
  ]
})

registrarNavegacion(router)

export default router
