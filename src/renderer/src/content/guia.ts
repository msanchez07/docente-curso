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

export interface PuntoGuia {
  titulo: string
  detalle: string
}

export interface SeccionGuia {
  id: string
  titulo: string
  resumen: string
  explicacion: string[]
  imagen: string
  ruta: string
  rutas: string[]
  puntos: PuntoGuia[]
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
      {
        titulo: 'Navegación superior',
        detalle:
          'La barra cambia de sección sin usar el botón Volver: Dashboard, Día a día y Consulta. La opción activa queda resaltada y el botón Ayuda abre la explicación de la pantalla actual.'
      },
      {
        titulo: 'Tarjetas de resumen',
        detalle:
          'Muestran la próxima sesión, entrega, examen y evaluación, con la fecha y una indicación de urgencia. Sirven para saber qué requiere atención antes de entrar en el detalle.'
      },
      {
        titulo: 'Agenda y minicalendario',
        detalle:
          'La agenda ordena los hitos por fecha y el calendario los colorea por tipo: entregas, exámenes, evaluaciones y días no lectivos. Puedes cambiar de mes y volver al mes actual con el botón Hoy.'
      },
      {
        titulo: 'Alumnado que necesita atención',
        detalle:
          'La tabla muestra la nota final, el estado y los RA pendientes de cada alumno. Se actualiza con las notas, los criterios y las entregas, y permite detectar rápidamente quién va a convocatoria.'
      },
      {
        titulo: 'Accesos rápidos',
        detalle:
          'Desde las tarjetas y los enlaces «Ver programación», «Ver calificaciones» o «Ver planificación» puedes saltar directamente a la sección relacionada sin pasar por el menú.'
      }
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
      {
        titulo: 'Crear y editar sesiones',
        detalle:
          'Cada sesión tiene fecha, hora, contenido, desviación y observaciones. Puedes añadir varias sesiones al mismo día y editar la fila directamente en la vista de Tabla.'
      },
      {
        titulo: 'Elegir la vista de trabajo',
        detalle:
          'Tarjetas es cómoda para leer y revisar; Tabla permite editar muchas filas seguidas; Calendario muestra la distribución mensual de las sesiones.'
      },
      {
        titulo: 'Unidades y calendario escolar',
        detalle:
          'La pestaña Unidades organiza las unidades de programación y sus sesiones. Calendario escolar es una pestaña aparte, con festivos, no lectivos y vacaciones.'
      },
      {
        titulo: 'Importar y exportar',
        detalle:
          'Desde Acciones puedes cargar un ejemplo, importar días desde JSON/CSV o descargar el esquema. Exportar PDF genera el documento completo con fechas, horario y tutorías.'
      },
      {
        titulo: 'Ver cambios pendientes',
        detalle:
          'La barra superior indica si hay cambios sin guardar. Si cambias de pestaña o sales de la pantalla, revisa primero que la programación esté guardada.'
      }
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
      {
        titulo: 'Unidades didácticas',
        detalle:
          'Cada unidad reúne sus sesiones, contenidos, RA/CE y criterios. Puedes crear unidades, ordenarlas y consultar qué parte del módulo cubre cada una.'
      },
      {
        titulo: 'Fechas de evaluación y exámenes',
        detalle:
          'Las fechas se pueden crear a mano o importar. Se usan para la agenda del dashboard y para organizar los bloques de las convocatorias.'
      },
      {
        titulo: 'Criterios y cobertura de RA/CE',
        detalle:
          'La pestaña de criterios muestra el peso de cada instrumento. La pestaña de RA/CE permite comprobar qué resultados y criterios están cubiertos por las unidades y las entregas.'
      },
      {
        titulo: 'Calendario escolar',
        detalle:
          'Se gestiona por curso académico e indica días lectivos, no lectivos, festivos y vacaciones. Los días no lectivos quedan marcados también en la agenda y en la programación.'
      },
      {
        titulo: 'Presentación del módulo',
        detalle:
          'La plantilla HTML se rellena con datos reales del grupo. Puedes ver la vista previa, copiarla como HTML enriquecido para Aules, descargarla o imprimirla en PDF.'
      },
      {
        titulo: 'Coherencia del módulo',
        detalle:
          'Antes de cerrar la programación, revisa que las unidades tengan sus RA/CE, que las fechas de examen encajen con los trimestres y que la presentación muestre la información actualizada.'
      }
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
      {
        titulo: 'Categorías e instrumentos',
        detalle:
          'Cada categoría representa un tipo de instrumento: exámenes, actividades, proyectos, etc. Su peso se aplica a todos los trimestres que no tengan un cálculo propio.'
      },
      {
        titulo: 'Peso de cada trimestre',
        detalle:
          'Los trimestres o avaluaciones también ponderan en la nota final. La suma de todos los pesos debe ser exactamente 100 %; si no, no se puede guardar.'
      },
      {
        titulo: 'Peso de cada RA',
        detalle:
          'La nota final se calcula ponderando los RA. Por defecto se reparte el 100 % a partes iguales, pero puedes dar más peso a un RA concreto desde la pestaña RA.'
      },
      {
        titulo: 'Mínimos bloqueantes',
        detalle:
          'Puedes fijar una nota mínima por entrega, por categoría, por avaluación y para aprobar el módulo. Si no se cumple, la categoría o el trimestre quedan suspensos aunque la media sea alta.'
      },
      {
        titulo: 'Pesos propios por trimestre',
        detalle:
          'En Trimestres puedes activar un cálculo distinto solo para un trimestre. Es útil cuando un trimestre se evalúa con un examen y un proyecto, sin actividades, sin cambiar el resto del curso.'
      },
      {
        titulo: 'Validación y guardado',
        detalle:
          'La pantalla muestra si las sumas son correctas. Los criterios guardados se usan en Calificaciones, en los informes y en los grupos que compartan la misma plantilla.'
      }
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
      {
        titulo: 'Cuándo usarlo',
        detalle:
          'Úsalo cuando un trimestre tenga un sistema de evaluación distinto: por ejemplo, un proyecto final que sustituye a las actividades habituales o un examen que vale la mitad de la nota.'
      },
      {
        titulo: 'Cómo activarlo',
        detalle:
          'Entra en Criterios → Trimestres y marca «Pesos propios» en el trimestre. Se copian los pesos generales como punto de partida y puedes modificarlos sin tocar los demás trimestres.'
      },
      {
        titulo: 'Ejemplo 50/50',
        detalle:
          'Pon exámenes a 50 %, proyectos a 50 % y actividades a 0 %. El trimestre se calculará solo con exámenes y proyectos; las actividades seguirán visibles en el detalle, pero no restarán nota.'
      },
      {
        titulo: 'Categorías a 0 %',
        detalle:
          'Una categoría con peso 0 no cuenta para la media del trimestre y sus suspensos tampoco bloquean ese trimestre. Esto permite excluir instrumentos que no se han usado.'
      },
      {
        titulo: 'Validación',
        detalle:
          'Los pesos propios deben sumar exactamente 100 %. Si la suma no cuadra, la aplicación muestra un aviso y no permite guardar los criterios.'
      },
      {
        titulo: 'Efecto en las notas',
        detalle:
          'El cálculo propio afecta a la nota del trimestre. La nota final sigue calculándose con los pesos de RA, para mantener la trazabilidad del módulo.'
      }
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
      {
        titulo: 'Lista de alumnado',
        detalle:
          'La columna izquierda permite buscar por nombre o DNI y muestra la nota final, el estado y los RA pendientes. Al seleccionar un alumno se carga su detalle completo.'
      },
      {
        titulo: 'Nota de cada trimestre',
        detalle:
          'Cada pestaña de trimestre muestra las categorías, sus pesos efectivos, las entregas y la nota resultante. Si el trimestre tiene un cálculo propio, aparece el indicador correspondiente.'
      },
      {
        titulo: 'Nota final por RA',
        detalle:
          'La pestaña Final muestra la nota final, la fórmula de pesos de RA y el estado de cada resultado de aprendizaje. La nota final no se edita aquí.'
      },
      {
        titulo: 'Convocatorias',
        detalle:
          'Ordinaria y Extraordinaria se crean automáticamente y agrupan los bloques que debe realizar cada alumno. Puedes ajustar los bloques, asignar notas y consultar la nota de la convocatoria.'
      },
      {
        titulo: 'Examen global',
        detalle:
          'Si un alumno tiene marcado el bloque Examen global, su nota sustituye al resto de bloques de esa convocatoria y pasa a valer el 100 %. No se suman los demás bloques.'
      },
      {
        titulo: 'Informe del alumno',
        detalle:
          'Desde la pestaña Final puedes generar el informe PDF del alumno o abrir su informe completo en la sección Informes.'
      }
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
      {
        titulo: 'Asociaciones obligatorias',
        detalle:
          'Cada entrega debe tener unidad, avaluación, categoría y al menos un RA/CE. Estas asociaciones permiten calcular la nota del trimestre y la nota por RA.'
      },
      {
        titulo: 'Ficha de la entrega',
        detalle:
          'La ficha contiene Enunciado, Descripción del problema y Restricciones. Es la primera pestaña al abrir la entrega y se puede copiar para Aules, descargar o imprimir.'
      },
      {
        titulo: 'Rúbrica y evidencias',
        detalle:
          'Puedes añadir una rúbrica en texto y/o archivo y clasificar las evidencias por tipo. Las evidencias acompañan a la entrega en las exportaciones.'
      },
      {
        titulo: 'Notas y bloqueo',
        detalle:
          'La pestaña Notas permite poner nota decimal y anotaciones por alumno. Una entrega bloqueada no admite cambios hasta que la desbloquees desde la propia entrega o desde Calificaciones.'
      },
      {
        titulo: 'Exportación',
        detalle:
          'Puedes exportar una entrega, una avaluación o el curso completo. Si solo hay texto/rúbrica se genera PDF; si hay archivos, ZIP; si hay ambos, ZIP con el PDF y los archivos.'
      }
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
      {
        titulo: 'Altas e importación',
        detalle:
          'Puedes crear alumnos uno a uno o importar una lista JSON/CSV. La importación busca duplicados por DNI, correo o nombre y apellidos antes de matricular.'
      },
      {
        titulo: 'Matrícula y desmatriculación',
        detalle:
          'Desactivar un alumno conserva su historial; desmatricularlo lo quita del grupo sin borrar sus datos globales. Puedes reactivarlo cuando vuelva a estar activo.'
      },
      {
        titulo: 'Ficha del alumno',
        detalle:
          'La ficha reúne sus datos, notas, RA, entregas y evolución. Es el punto de partida para revisar su situación completa antes de una evaluación.'
      },
      {
        titulo: 'Formación en empresa',
        detalle:
          'Se registra por periodos, con empresa y fechas. Sirve para completar el expediente y aparece en los informes del alumno.'
      },
      {
        titulo: 'Relación con notas y faltas',
        detalle:
          'El alumnado matriculado aparece en calificaciones y en el control de faltas del curso. Las FCT no generan faltas en el control de faltas.'
      }
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
      {
        titulo: 'Contexto de curso',
        detalle:
          'La pantalla agrupa todos los módulos de un mismo curso/tutoría. Si hay varias cohortes, puedes cambiar de curso desde el selector compacto.'
      },
      {
        titulo: 'Configuración de módulos',
        detalle:
          'Cada módulo es una tarjeta con su código, el nombre exacto de la columna del PDF de ITACA y las horas. El límite y las faltas justificadas se ajustan en la barra superior.'
      },
      {
        titulo: 'Importar PDFs',
        detalle:
          'El botón Subir PDF lee los informes de ITACA y extrae las faltas por alumno y módulo. Se guardan las faltas, no el PDF original.'
      },
      {
        titulo: 'Historial de informes',
        detalle:
          'El historial está plegado para no ocupar espacio. Se abre con Historial (n), muestra cada importación y se cierra al seleccionar un informe o cambiar de curso.'
      },
      {
        titulo: 'Tabla de faltas',
        detalle:
          'Cada módulo ocupa una columna. El número de faltas va en una caja neutra y el porcentaje en una píldora de color; la primera columna queda fija al desplazar horizontalmente.'
      },
      {
        titulo: 'Impresión/PDF',
        detalle:
          'El informe seleccionado se puede imprimir o guardar en PDF con el límite, los módulos y los colores de estado.'
      }
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
      {
        titulo: 'Tipo de informe',
        detalle:
          'Puedes elegir Resumen, Calificaciones o RA superados. Cada tipo cambia las secciones y las gráficas que se incluyen en la vista previa.'
      },
      {
        titulo: 'Ámbito del informe',
        detalle:
          'El selector de alumnado permite generar el informe de todo el grupo o centrarte en un alumno concreto. El número de alumnos se muestra junto al selector.'
      },
      {
        titulo: 'Contenido',
        detalle:
          'El informe puede incluir notas, RA/CE, formación en empresa, datos de alumnado y gráficas. Antes de exportar, elige qué secciones quieres incluir.'
      },
      {
        titulo: 'Exportación',
        detalle:
          'Imprimir/PDF es la acción principal. HTML y CSV están en el menú Acciones. La vista previa respeta el formato A4 y refleja las secciones seleccionadas.'
      },
      {
        titulo: 'Uso recomendado',
        detalle:
          'Revisa la vista previa antes de imprimir y comprueba que el alumno o el grupo seleccionado son correctos. El informe se genera con los datos guardados en ese momento.'
      }
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
      {
        titulo: 'Curso académico',
        detalle:
          'El curso se calcula por fecha y se cambia desde la barra lateral. La lista de grupos y el dashboard se filtran por el curso activo.'
      },
      {
        titulo: 'Crear un grupo',
        detalle:
          'Se elige ciclo, módulo, curso y modalidad. El nombre se genera con las siglas del módulo, por ejemplo «2º DAW · DWES · Presencial».'
      },
      {
        titulo: 'Editar y borrar',
        detalle:
          'Puedes editar los datos del grupo y borrarlo con confirmación. Antes de borrar, revisa que no necesites conservar sus entregas, notas o programación.'
      },
      {
        titulo: 'Gestionar cursos',
        detalle:
          'Los cursos se pueden renombrar y borrar si no tienen grupos. El curso actual vacío se puede borrar y se recreará al guardar un grupo.'
      },
      {
        titulo: 'Entrar al grupo',
        detalle:
          'Al seleccionar un grupo se abre su dashboard. Desde la barra superior puedes entrar a programación, faltas, entregas, calificaciones, alumnado, programación didáctica e informes.'
      }
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
      {
        titulo: 'Qué guarda una plantilla',
        detalle:
          'Guarda categorías, pesos, avaluaciones, RA, mínimos y pesos propios por trimestre. Es el modelo completo de cálculo, no solo una lista de nombres.'
      },
      {
        titulo: 'Cuándo se aplica',
        detalle:
          'Los grupos nuevos del mismo módulo y modalidad reciben automáticamente la plantilla. Los grupos existentes no se modifican solos al cambiar la plantilla.'
      },
      {
        titulo: 'Editar una plantilla',
        detalle:
          'Se abre en una página propia con el mismo editor de criterios. Puedes ajustar los pesos y guardar los cambios sin entrar en cada grupo.'
      },
      {
        titulo: 'Llevar criterios a grupos existentes',
        detalle:
          'Desde Criterios de un grupo puedes usar «Copiar al mismo módulo» para aplicar sus criterios a otros grupos del mismo módulo. Revisa antes qué grupos se van a actualizar.'
      }
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
      {
        titulo: 'Elegir la carpeta',
        detalle:
          'La carpeta raíz se configura una vez y la aplicación crea dentro una subcarpeta por curso académico. Puedes cambiarla cuando quieras desde esta pantalla.'
      },
      {
        titulo: 'Contenido de la copia',
        detalle:
          'Cada grupo se guarda en un JSON autocontenido: alumnado, criterios, entregas, notas, evidencias, programación, unidades, eventos, formación y archivos en base64.'
      },
      {
        titulo: 'Copia automática',
        detalle:
          'Al abrir la aplicación se comprueba si cambió el contenido de algún grupo. Si cambió, se crea una copia automática para no perder los últimos cambios.'
      },
      {
        titulo: 'Importar una copia',
        detalle:
          'La importación restaura solo el grupo seleccionado. Si ya existe un grupo con la misma identidad, se sustituye su contenido; los demás grupos no se tocan.'
      },
      {
        titulo: 'Avisos y errores',
        detalle:
          'Si la carpeta no está configurada o ha desaparecido, la aplicación muestra un aviso. Revisa la ruta antes de dar por buena una copia manual.'
      }
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
      {
        titulo: 'Consulta a pantalla completa',
        detalle:
          'La normativa se abre en una vista de lectura amplia, manteniendo la barra lateral para conservar el contexto del grupo.'
      },
      {
        titulo: 'Importar normativa',
        detalle:
          'La importación está en Opciones globales. Al terminar, la aplicación actualiza el contenido y vuelve a la pantalla de normativa.'
      },
      {
        titulo: 'Efecto de la importación',
        detalle:
          'Importar normativa sustituye el contenido de consulta, pero no modifica por sí solo las notas, criterios, programaciones o copias ya guardadas.'
      },
      {
        titulo: 'Relación con RA/CE',
        detalle:
          'La normativa sirve de referencia para interpretar los RA y CE del módulo. Los datos concretos de evaluación siguen viviendo en los criterios y en las unidades.'
      }
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
      {
        titulo: 'Gestionar grupos',
        detalle:
          'Abre la lista de grupos del curso activo. Desde ahí puedes crear, editar, borrar y entrar al dashboard de cada grupo.'
      },
      {
        titulo: 'Cursos académicos',
        detalle:
          'Permite renombrar o borrar cursos sin grupos. El curso activo se cambia desde el selector superior de la barra lateral.'
      },
      {
        titulo: 'Plantillas',
        detalle:
          'Reutiliza criterios entre grupos del mismo módulo y modalidad. Los grupos nuevos reciben la plantilla automáticamente.'
      },
      {
        titulo: 'Control de faltas',
        detalle:
          'Abre la vista de tutoría para importar PDFs de ITACA, configurar módulos y consultar el historial de faltas.'
      },
      {
        titulo: 'Copias de seguridad',
        detalle:
          'Configura la carpeta, crea copias manuales o restaura un grupo concreto desde su JSON.'
      },
      {
        titulo: 'Guía de uso',
        detalle:
          'Abre esta guía completa con capturas. La ayuda contextual de cada sección se abre desde el botón Ayuda de la barra superior.'
      },
      {
        titulo: 'Normativa FP e Importar normativa',
        detalle:
          'La primera abre la consulta; la segunda importa un nuevo contenido. La importación no cambia por sí sola las notas ni los criterios.'
      },
      {
        titulo: 'Datos de prueba',
        detalle:
          'Solo aparecen en la previsualización web. Permiten restaurar el grupo de ejemplo o vaciar los datos simulados; no afectan a la aplicación de escritorio.'
      }
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
