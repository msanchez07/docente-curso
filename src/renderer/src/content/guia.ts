import dashboard from '../assets/guia/dashboard.png'
import programacion from '../assets/guia/programacion.png'
import programacionDidactica from '../assets/guia/programacion-didactica.png'
import criterios from '../assets/guia/criterios.png'
import criteriosTrimestres from '../assets/guia/criterios-trimestres.png'
import calificaciones from '../assets/guia/calificaciones.png'
import entregas from '../assets/guia/entregas.png'
import alumnado from '../assets/guia/alumnado.png'
import faltas from '../assets/guia/faltas.png'
import informes from '../assets/guia/informes.png'
import grupos from '../assets/guia/grupos.png'
import plantillas from '../assets/guia/plantillas.png'
import backups from '../assets/guia/backups.png'
import normativa from '../assets/guia/normativa.png'
import globalMenu from '../assets/guia/global-menu.png'

export interface SeccionGuia {
  id: string
  titulo: string
  resumen: string
  explicacion: string[]
  imagen: string
  ruta: string
  rutas: string[]
  puntos: string[]
}

/**
 * Contenido compartido por la guía completa y la ayuda contextual de cada
 * sección. Al cambiar una pantalla, actualiza aquí su captura y sus textos.
 */
export const seccionesGuia: SeccionGuia[] = [
  {
    id: 'dashboard',
    titulo: 'Dashboard y navegación',
    resumen:
      'El dashboard reúne la información importante del grupo y la barra superior permite saltar a cualquier sección.',
    explicacion: [
      'El dashboard es el punto de partida de un grupo. Arriba tienes la barra de navegación común: Dashboard, Día a día y Consulta. La opción activa aparece resaltada y el botón Ayuda abre la explicación de la pantalla en la que estás.',
      'Las tarjetas superiores resumen lo próximo: sesión, entrega, examen y evaluación. Debajo se muestran las próximas sesiones, el alumnado que necesita atención y la agenda. La agenda mezcla entregas, exámenes, evaluaciones y días no lectivos, y el minicalendario usa colores para que puedas localizar cada tipo de fecha de un vistazo.'
    ],
    imagen: dashboard,
    ruta: '/grupo/:grupoId',
    rutas: ['grupo', 'horario-grupo'],
    puntos: [
      'La barra superior agrupa Dashboard, Día a día y Consulta; la opción activa queda resaltada.',
      'Las tarjetas muestran próxima sesión, próxima entrega, próximo examen y próxima evaluación.',
      'La agenda combina entregas, exámenes, evaluaciones y días no lectivos.',
      'Los días no lectivos tienen prioridad visual roja y las unidades se ven con colores estables.',
      'Desde el dashboard se accede a programación, horario, faltas, entregas, calificaciones, alumnado, programación didáctica e informes.'
    ]
  },
  {
    id: 'programacion',
    titulo: 'Programación de aula',
    resumen:
      'Registra el trabajo diario del grupo: sesiones, contenidos, desviaciones y observaciones.',
    explicacion: [
      'Programación de aula sirve para anotar qué se trabaja cada día. Puedes crear sesiones con fecha y hora, añadir varias sesiones al mismo día y dejar constancia de contenidos, desviaciones y observaciones. Las vistas de Tarjetas y Tabla permiten pasar de una lectura cómoda a una edición rápida.',
      'La pestaña Calendario muestra las sesiones en formato mensual. Calendario escolar es una pestaña independiente, junto a Unidades, y comparte la navegación mensual de la barra superior. Desde Acciones puedes cargar un ejemplo, importar días o descargar el esquema; Exportar PDF genera el informe completo.'
    ],
    imagen: programacion,
    ruta: '/grupo/:grupoId/programacion',
    rutas: ['programacion'],
    puntos: [
      'Vistas de Tarjetas, Tabla, Calendario, Unidades y Calendario escolar.',
      'El calendario escolar está como pestaña junto a Unidades.',
      'La barra superior mantiene la navegación mensual y las acciones de programación.',
      'Puedes importar días y descargar el esquema desde Acciones.',
      'Exportar PDF genera el informe con todas las fechas, horario y tutorías.'
    ]
  },
  {
    id: 'programacion-didactica',
    titulo: 'Programación didáctica',
    resumen:
      'Organiza unidades, fechas, criterios, RA/CE, calendario y la presentación del módulo.',
    explicacion: [
      'Programación didáctica es el espacio de planificación a más largo plazo. Sus pestañas separan las unidades, las fechas de evaluación y exámenes, los criterios, la cobertura de RA/CE y el calendario escolar. Cada unidad puede trabajar CE concretos, todos los CE de un RA o CE de varios RA.',
      'La presentación del módulo es una plantilla HTML editable que se rellena con los datos reales del grupo: unidades, RA/CE, exámenes, pesos y requisitos. Puedes previsualizarla, copiarla como HTML enriquecido para Aules, descargarla o imprimirla en PDF.'
    ],
    imagen: programacionDidactica,
    ruta: '/grupo/:grupoId/programacion-didactica',
    rutas: ['programacion-didactica', 'evaluaciones', 'boe'],
    puntos: [
      'Las pestañas separan Unidades, Fechas, Criterios, RA/CE y Calendario.',
      'Cada unidad puede trabajar CE concretos, todos los CE de un RA o CE de varios RA.',
      'Las fechas de evaluaciones y exámenes se pueden crear a mano o importar.',
      'La presentación del módulo es una plantilla HTML editable con datos reales del grupo.',
      'Puedes copiarla para Aules, descargarla o imprimirla en PDF.'
    ]
  },
  {
    id: 'criterios',
    titulo: 'Criterios de calificación',
    resumen:
      'Define cómo se calcula la nota: categorías, avaluaciones, RA, mínimos y pesos por trimestre.',
    explicacion: [
      'Los criterios son la base de todos los cálculos. Las categorías agrupan instrumentos de evaluación (exámenes, actividades, proyectos, etc.) y tienen un peso. Las avaluaciones o trimestres también tienen su peso en la nota final. Todas las sumas deben ser exactamente 100 %.',
      'La pestaña RA reparte el peso de cada resultado de aprendizaje en la nota final; por defecto se reparte a partes iguales. La pestaña Mínimos permite configurar notas mínimas bloqueantes. La pestaña Trimestres permite que un trimestre use pesos de categorías distintos a los generales, por ejemplo 50 % examen y 50 % proyecto con actividades a 0 %.'
    ],
    imagen: criterios,
    ruta: '/grupo/:grupoId/criterios',
    rutas: ['criterios'],
    puntos: [
      'Categorías: exámenes, actividades, proyectos u otros instrumentos.',
      'Cada trimestre tiene su peso en la nota final y la suma debe ser 100 %.',
      'Cada RA tiene su peso en la nota final; por defecto se reparte a partes iguales.',
      'Los mínimos pueden bloquear una entrega, categoría, avaluación o el módulo.',
      'Los pesos propios por trimestre se configuran en la pestaña Trimestres.'
    ]
  },
  {
    id: 'criterios-trimestres',
    titulo: 'Pesos propios por trimestre',
    resumen:
      'Un trimestre puede usar los pesos generales o un cálculo propio, sin afectar a los demás.',
    explicacion: [
      'Esta pestaña sirve para los trimestres que no siguen el cálculo general. Al activar «Pesos propios» en un trimestre, se copian los pesos generales y puedes cambiarlos solo para ese trimestre. Los demás trimestres siguen usando la configuración de Categorías.',
      'Un ejemplo habitual es un trimestre con 50 % examen y 50 % proyecto, dejando actividades al 0 %. Las categorías con peso 0 no penalizan ese trimestre. La suma de los pesos propios debe ser 100 %; si no, no se puede guardar. En Calificaciones verás el indicador «Cálculo propio».'
    ],
    imagen: criteriosTrimestres,
    ruta: '/grupo/:grupoId/criterios',
    rutas: [],
    puntos: [
      'Activa «Pesos propios» solo en el trimestre que quieras cambiar.',
      'Ejemplo: 50 % examen y 50 % proyecto, dejando actividades al 0 %.',
      'Las categorías con peso 0 no penalizan la nota de ese trimestre.',
      'La suma de los pesos propios debe ser exactamente 100 %.',
      'En Calificaciones, ese trimestre muestra el indicador «Cálculo propio».',
      'La nota final sigue calculándose con los pesos de RA.'
    ]
  },
  {
    id: 'calificaciones',
    titulo: 'Calificaciones y convocatorias',
    resumen:
      'Consulta la nota de cada trimestre, la nota final, los RA y las convocatorias ordinaria y extraordinaria.',
    explicacion: [
      'Calificaciones es una vista de consulta: la nota final no se escribe a mano, se calcula a partir de las entregas, las categorías, los trimestres y los RA. La lista de la izquierda permite buscar alumnado y ver su nota final; a la derecha se muestra el detalle del alumno seleccionado.',
      'Las pestañas superiores permiten entrar en cada trimestre, en Ordinaria, en Extraordinaria y en la nota final. En la pestaña final se muestra la fórmula de RA, los RA superados y pendientes y el acceso al informe. Las convocatorias agrupan bloques de examen y se crean automáticamente al abrirlas; el bloque Examen global, si se marca, vale el 100 % de esa convocatoria.'
    ],
    imagen: calificaciones,
    ruta: '/grupo/:grupoId/calificaciones',
    rutas: ['calificaciones', 'convocatorias'],
    puntos: [
      'Calificaciones es una vista de consulta: no se edita la nota final a mano.',
      'La nota final se calcula con los pesos de RA.',
      'Cada trimestre muestra sus categorías, entregas y pesos efectivos.',
      '«Cálculo propio» indica que ese trimestre tiene pesos distintos a los generales.',
      'Ordinaria y Extraordinaria se crean automáticamente y agrupan bloques de examen.',
      'Si se marca Examen global, sustituye al resto y vale el 100 % de la convocatoria.'
    ]
  },
  {
    id: 'entregas',
    titulo: 'Entregas y evidencias',
    resumen: 'Cada entrega se asocia a una unidad, una avaluación, una categoría y sus RA/CE.',
    explicacion: [
      'Las entregas son las tareas evaluables del grupo. Cada una debe pertenecer a una unidad, una avaluación y una categoría, y puede mapearse a uno o varios RA/CE. La ficha de la entrega contiene el enunciado, la descripción del problema y las restricciones.',
      'Al abrir una entrega se muestra primero la pestaña Ficha y después Notas. La ficha HTML se puede copiar para Aules, descargar o imprimir. También puedes añadir rúbrica, evidencias y bloquear la entrega para que no admita cambios. La exportación genera PDF, ZIP o un ZIP con PDF y archivos según el contenido.'
    ],
    imagen: entregas,
    ruta: '/grupo/:grupoId/entregas',
    rutas: ['entregas', 'entrega-nueva', 'entrega-editar', 'entrega-notas', 'entrega-evidencias'],
    puntos: [
      'La ficha contiene Enunciado, Descripción del problema y Restricciones.',
      'Al abrir una entrega, la Ficha es la pestaña inicial y Notas la segunda.',
      'La ficha HTML se puede copiar para Aules, descargar o imprimir.',
      'Admite rúbrica en texto y/o archivo, evidencias y bloqueo/desbloqueo.',
      'La exportación puede ser PDF, ZIP o ZIP con PDF y archivos.'
    ]
  },
  {
    id: 'alumnado',
    titulo: 'Alumnado y formación',
    resumen: 'Gestiona matrículas, datos del alumnado, ficha individual y formación en empresa.',
    explicacion: [
      'La sección de alumnado permite dar de alta manualmente o importar desde JSON/CSV. La importación evita duplicados por DNI, correo o nombre y apellidos. Puedes editar los datos, desactivar una matrícula o desmatricular sin borrar el historial del alumno.',
      'La ficha individual reúne sus notas, RA, entregas y evolución. La formación en empresa se registra por periodos, con empresa y fechas. Las FCT no se incluyen en el control de faltas porque no generan faltas de asistencia al módulo.'
    ],
    imagen: alumnado,
    ruta: '/grupo/:grupoId/alumnado',
    rutas: ['alumnado', 'alumno', 'alumno-formacion'],
    puntos: [
      'Alta manual e importación JSON/CSV sin duplicar por DNI, correo o nombre.',
      'Se puede desactivar o desmatricular sin borrar el historial.',
      'La ficha del alumno reúne notas, RA, entregas y evolución.',
      'La formación en empresa se registra por periodos, empresa y fechas.',
      'Las FCT no se incluyen en el control de faltas.'
    ]
  },
  {
    id: 'faltas',
    titulo: 'Control de faltas',
    resumen:
      'Importa los PDFs de ITACA, configura los módulos y consulta el porcentaje de faltas por alumno.',
    explicacion: [
      'Control de faltas trabaja por curso/tutoría, no por un único grupo: reúne todos los módulos y el alumnado matriculado en cualquiera de ellos. La configuración permite ajustar el límite de faltas, decidir si cuentan las justificadas y relacionar cada módulo con su columna exacta del PDF de ITACA.',
      'Los PDFs se importan y se guardan las faltas extraídas, no el archivo original. El historial está plegado por defecto y se abre con el botón Historial (n). La tabla muestra el número de faltas en una caja neutra y el porcentaje en una píldora de color; la primera columna queda fija al desplazar horizontalmente. El informe seleccionado se puede imprimir o guardar en PDF.'
    ],
    imagen: faltas,
    ruta: '/faltas?grupo=:grupoId',
    rutas: ['faltas'],
    puntos: [
      'El límite de faltas y las justificadas se ajustan en una barra compacta.',
      'Cada módulo es una tarjeta con su nombre de columna en ITACA y sus horas.',
      'El historial está plegado: se abre con el botón Historial (n).',
      'La tabla muestra faltas en caja neutra y porcentaje en píldora de color.',
      'La primera columna queda fija al desplazar horizontalmente.',
      'El informe seleccionado se puede imprimir o guardar en PDF.'
    ]
  },
  {
    id: 'informes',
    titulo: 'Informes',
    resumen: 'Genera informes de grupo o de un alumno, con notas, RA, gráficas y formación.',
    explicacion: [
      'Informes permite preparar documentación de consulta o entrega. Puedes elegir un resumen, un informe de calificaciones o un informe de RA superados, y limitarlo a todo el grupo o a un alumno concreto.',
      'El informe incluye gráficas, RA/CE, formación en empresa y datos de alumnado. La vista previa respeta el formato A4. Las descargas HTML y CSV están agrupadas en Acciones; Imprimir/PDF es la acción principal y permite guardar el informe como PDF.'
    ],
    imagen: informes,
    ruta: '/grupo/:grupoId/informes',
    rutas: ['informes'],
    puntos: [
      'Tipos: Resumen, Calificaciones y RA superados.',
      'Se puede elegir todo el grupo o un alumno concreto.',
      'Incluye gráficas, RA/CE, formación en empresa y datos de alumnado.',
      'Las descargas HTML/CSV están en Acciones; Imprimir/PDF es la acción principal.',
      'La previsualización respeta el formato A4.'
    ]
  },
  {
    id: 'grupos',
    titulo: 'Grupos y cursos',
    resumen:
      'Crea los grupos de clase, cambia de curso académico y consulta el alumnado y los criterios de cada grupo.',
    explicacion: [
      'El grupo es la unidad de trabajo de toda la aplicación: un módulo, un curso, una modalidad y un curso académico. Los grupos se crean desde Gestionar grupos o desde el botón Nuevo grupo de la barra lateral. El nombre se genera automáticamente con las siglas del módulo.',
      'El curso académico se calcula por fecha y se cambia desde la barra lateral. Al cambiar de curso, la lista de grupos se filtra. Los cursos se pueden renombrar y borrar si no tienen grupos; el curso activo vacío se puede borrar y se volverá a crear al guardar un grupo.'
    ],
    imagen: grupos,
    ruta: '/grupos',
    rutas: ['grupos', 'cursos'],
    puntos: [
      'El curso académico se calcula por fecha y se cambia desde la barra lateral.',
      'Cada grupo combina ciclo, módulo, curso y modalidad.',
      'El nombre se genera automáticamente con las siglas del módulo.',
      'Desde la lista se accede al dashboard, al alumnado y a los criterios.',
      'Los cursos se pueden renombrar y borrar si no tienen grupos.'
    ]
  },
  {
    id: 'plantillas',
    titulo: 'Plantillas de criterios',
    resumen: 'Reutiliza criterios de calificación entre grupos del mismo módulo y modalidad.',
    explicacion: [
      'Una plantilla guarda un modelo de criterios para reutilizarlo. Se crea desde los criterios de un grupo y se aplica automáticamente a los grupos nuevos que tengan el mismo módulo y modalidad.',
      'Las plantillas se editan en una página propia, no en un modal. Si cambias una plantilla, conviene revisar qué grupos nuevos deben crearse o qué grupos existentes quieres actualizar. La copia de criterios a los grupos del mismo módulo se hace desde la propia pantalla de Criterios.'
    ],
    imagen: plantillas,
    ruta: '/plantillas',
    rutas: ['plantillas', 'plantilla-editar'],
    puntos: [
      'Una plantilla se crea desde los criterios de un grupo.',
      'Los grupos nuevos del mismo módulo y modalidad la reciben automáticamente.',
      'Se puede editar en una página propia.',
      'Al cambiar una plantilla se revisa qué grupos deben actualizarse.'
    ]
  },
  {
    id: 'backups',
    titulo: 'Copias de seguridad',
    resumen: 'Guarda cada grupo en un JSON local y restaura solo el grupo que necesites.',
    explicacion: [
      'Las copias de seguridad son locales. Se elige una carpeta raíz y la aplicación crea una subcarpeta por curso académico. Cada grupo se guarda como un JSON autocontenido con alumnado, criterios, entregas, notas, evidencias, programación, unidades, eventos, formación y archivos en base64.',
      'La aplicación avisa si la carpeta no está configurada o desaparece. También puede crear una copia automática al abrirse si detecta cambios en el contenido de un grupo. Al importar una copia se restaura solo ese grupo; si ya existe uno con la misma identidad, se sustituye su contenido.'
    ],
    imagen: backups,
    ruta: '/backups',
    rutas: ['backups'],
    puntos: [
      'La carpeta raíz se configura una vez.',
      'Cada curso académico tiene su subcarpeta.',
      'Cada grupo se guarda como un JSON autocontenido, con archivos en base64.',
      'La copia automática se lanza al abrir la aplicación si cambió el contenido.',
      'Una copia se puede importar para restaurar solo ese grupo.'
    ]
  },
  {
    id: 'normativa',
    titulo: 'Normativa FP',
    resumen: 'Consulta la normativa y actualiza el contenido desde la barra lateral.',
    explicacion: [
      'Normativa FP es una guía de consulta a pantalla completa. Se abre manteniendo la barra lateral para que no pierdas el contexto del grupo y permite buscar y leer la normativa disponible.',
      'La importación de normativa se hace desde Opciones globales. Al importar se sustituye el contenido de consulta; no cambia por sí sola las notas, los criterios ni las programaciones ya guardadas.'
    ],
    imagen: normativa,
    ruta: '/normativa',
    rutas: ['normativa'],
    puntos: [
      'Se abre a pantalla completa manteniendo la barra lateral.',
      'La importación se hace desde Opciones globales.',
      'La normativa actualizada se usa en las referencias de RA/CE.',
      'No modifica por sí sola las notas ni los criterios ya guardados.'
    ]
  },
  {
    id: 'global',
    titulo: 'Opciones globales',
    resumen:
      'El menú inferior de la barra lateral reúne las herramientas que no pertenecen a un único grupo.',
    explicacion: [
      'Opciones globales está al final de la barra lateral. Desde ahí se gestionan los grupos, los cursos académicos, las plantillas, el control de faltas, las copias de seguridad, la guía, la normativa y la importación de normativa.',
      'En la previsualización web aparecen además dos acciones de datos de prueba: restaurar los datos de ejemplo y eliminarlos. Estas acciones no afectan a la aplicación de escritorio. La guía de uso también está en este menú para poder consultarla sin perder la pantalla en la que estás.'
    ],
    imagen: globalMenu,
    ruta: 'barra lateral → Opciones globales',
    rutas: [],
    puntos: [
      'Gestionar grupos: alta, edición, alumnado y criterios de cada grupo.',
      'Cursos académicos: renombrar o borrar cursos sin grupos.',
      'Plantillas: reutilizar criterios entre grupos del mismo módulo y modalidad.',
      'Control de faltas: importar PDFs de ITACA y consultar el historial.',
      'Copias de seguridad: configurar la carpeta y crear/restaurar grupos.',
      'Guía de uso: abrir esta guía completa con capturas.',
      'Normativa FP e Importar normativa: consulta y actualización del contenido.',
      'Datos de prueba: solo en la previsualización web; restaurar o eliminar.'
    ]
  }
]

/** Sección que corresponde a la ruta activa, para la ayuda contextual. */
export function guiaParaRuta(nombreRuta: string | null | undefined): SeccionGuia | null {
  if (!nombreRuta) return null
  return (
    seccionesGuia.find((seccion) => seccion.rutas.includes(nombreRuta)) ??
    seccionesGuia.find((seccion) => seccion.id === 'dashboard') ??
    null
  )
}
