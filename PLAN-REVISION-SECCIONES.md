# Plan de producto por secciones — gestión-entregas

> Primero se decide **qué queremos** de cada sección. Solo después se implementa.
> Una sección por iteración; no se abre la siguiente hasta cerrar la anterior.

## Visión

Aplicación local para llevar el curso de FP de DAW: grupos, entregas, notas y el informe
final, con la evaluación anclada al BOE. Sin nube y sin depender de una hoja de cálculo.

La aplicación se construye **por secciones**, pero con el **grupo como eje**: la barra
izquierda lista los grupos y el centro es el dashboard del grupo, desde el que se entra a
Programación, Criterios y las secciones que se irán añadiendo.

## Método

Cada sección se define con esta ficha antes de tocar código:

1. **Propósito** — para qué existe.
2. **Cuándo se usa** — momento del curso y quién la usa.
3. **Qué debe permitir** — acciones imprescindibles.
4. **Qué no debe hacer** — límites explícitos.
5. **Datos** — qué entra, qué sale y qué deja para otras secciones.
6. **Criterio de «hecho»** — cómo se comprueba que está terminada.

## Estructura de la aplicación (implementada)

- **Barra izquierda:** todos los grupos, con alumnado, estado de criterios y acceso a
  «Gestionar grupos» y «Plantillas».
- **Centro:** dashboard del curso como entrada, con un calendario global de todos los módulos, y dashboard del grupo
  con:
  - cabecera del grupo,
  - **Ahora** (quincena actual),
  - **Estado**,
  - tarjeta de **Criterios**,
  - **Alertas**,
  - accesos a las secciones.
- **Rutas:**
  - `/dashboard` — dashboard del curso y punto de entrada.
  - `/grupo/:id` — dashboard del grupo.
  - `/grupo/:id/programacion` — programación de aula.
  - `/grupo/:id/programacion-didactica` — unidades, fechas, criterios y RA/CE.
  - `/grupo/:id/criterios` — criterios de calificación.
  - `/grupo/:id/alumnado` — alumnado del grupo.
  - `/grupo/:id/entregas` — listado de entregas, pestañas y secciones.
  - `/grupo/:id/entregas/nueva` — formulario de alta.
  - `/grupo/:id/entregas/:entregaId/editar` — formulario de edición.
  - `/grupo/:id/entregas/:entregaId` — notas y anotaciones por alumno.
  - `/grupo/:id/entregas/:entregaId/evidencias` — gestor de ficheros de la entrega.
  - `/grupo/:id/evaluaciones` — fechas de evaluaciones y exámenes (manual o JSON).
  - `/grupo/:id/alumnado/:alumnoId/formacion` — periodos de formación en empresa.
  - `/grupo/:id/boe` — RA/CE y cobertura.
  - `/grupo/:id/calificaciones` — notas por avaluación y final.
  - `/grupo/:id/informes` — informe por alumno o grupo.
  - `/faltas` — control de faltas por curso/tutoría, con acceso desde el grupo mediante
    `?grupo=:id`.
  - `/normativa` — Normativa FP: guía consultable e importación de `index.html`.
  - `/grupos` — gestión de grupos del curso activo.
  - `/cursos` — cursos académicos: renombrar y borrar.
  - `/plantillas` — listado y edición de plantillas en página propia.
  - `/plantillas/:id` — formulario de edición de una plantilla.
- `Criterios` y `Programación` son **secciones propias**, no modales.

## Sección 1 — Grupos (acordada)

### Propósito

Dar de alta las **clases de FP de DAW** que imparte el profesorado. Es el punto de partida:
el resto de secciones colgarán de un grupo.

### Cuándo se usa

Al principio del curso, y cuando se crea, corrige o elimina un grupo.

### Qué debe permitir

- Ver los grupos ya guardados.
- Crear un grupo indicando **ciclo** (DAW), **módulo**, **curso** (1º o 2º) y
  **modalidad** (presencial o semipresencial). El nombre se genera solo con las siglas del
  módulo: «2º DAW · DWES · Presencial».
- Editar un grupo existente.
- Borrar un grupo, con confirmación.
- Que el grupo **siga ahí al cerrar y volver a abrir** la aplicación.
- Mostrar en la tabla **cuánto alumnado hay matriculado** y una **acción para consultar los
  RA/CE** del módulo (el recuento aparece en el tooltip y en el diálogo).
- **Importar alumnado** en cada grupo desde JSON o CSV, sin duplicar a quien ya existe (por DNI,
  correo o nombre y apellidos).
- No permitir dos grupos idénticos (mismo ciclo, módulo, curso y modalidad).
- **No ofrecer combinaciones imposibles**: al elegir curso, el desplegable de módulos solo
  muestra los que se imparten en ese curso (DWES no aparece en 1º).

### Qué no debe hacer (todavía)

- No gestiona alumnado, entregas, notas ni criterios.
- Los grupos se organizan por **curso académico**; el curso se calcula por fecha y no se crea a mano.
- No hay sincronización ni cuentas de usuario.

### Datos

- **Entra:** ciclo del BOE (DAW), módulo, curso y modalidad.
- **Sale:** un grupo guardado con su identificador.
- **Deja para después:** el grupo será la unidad a la que se vinculen alumnado y entregas.

### Criterio de «hecho»

1. Se crea «2º DAW · DWES · Presencial» y aparece en la lista.
2. Se recarga la aplicación y el grupo sigue ahí.
3. Se intenta crear el mismo grupo otra vez y se avisa de que ya existe.
4. Se edita a «1º DAW · DWES · Semipresencial» y la lista refleja el cambio.
5. Se borra pidiendo confirmación y desaparece.
6. Con 1º elegido, DWES no aparece en el desplegable de módulos; forzarlo por API se rechaza.
7. La tabla muestra «0 alumnos»; la acción de consultar abre los RA y CE del módulo (el tooltip indica «9 RA y 66 CE»).
8. Se importan 3 alumnos y el contador pasa a 3; al reimportar la misma lista no se duplican.

## Sección 2 — Criterios de calificación

Implementada. La ficha completa está en `PROPUESTA-CRITERIOS.md`.

- Pesos de avaluaciones y categorías, mínimos bloqueantes y convocatorias.
- Sumas **exactas** de 100 %; si no, error y no se puede guardar.
- Plantillas creadas desde un grupo, con su nombre, aplicadas automáticamente al mismo
  módulo y modalidad.

## Sección 3 — Programación de aula (implementada)

### Propósito

Registrar, día a día, lo que se trabaja en el grupo, las desviaciones respecto a la
planificación y las observaciones. Se muestra en una **vista propia**
(`/programacion/:grupoId`), no en un modal, y por defecto enseña la quincena actual.

### Cuándo se usa

Al planificar el curso y al cerrar cada sesión o día.

### Qué debe permitir

- Partir de un **listado importado** (JSON o tabla pegada desde hoja de cálculo en
  TSV/CSV) o añadir días a mano.
- Vista de tarjetas para lectura y **edición rápida en tabla** para meter muchos días.
- Formulario lateral para añadir/editar un día: fecha, contenido, desviación y observaciones.
- Guardar la programación completa por grupo: inserta, actualiza y borra lo que ya no está.
- Fusionar por fecha al importar: los días que ya existen no se pisan.
- Ver los días ordenados por fecha.

### Qué no debe hacer (todavía)

- No calcula notas ni modifica los criterios.
- No enlaza cada día con RA/CE ni con entregas.
- No genera un informe de programación.

### Datos

- **Entra:** fechas en JSON (array de `YYYY-MM-DD` o de objetos con `fecha`, `contenido`,
  `desviacion`, `observaciones`).
- **Sale:** filas de programación asociadas al grupo.
- Ejemplo: `ejemplos/programacion-dias-2026.json`.

### Criterio de «hecho»

1. Se importan los 39 días lectivos del 28/10/2026 al 22/12/2026.
2. Se rellena una fila y se guarda.
3. Al cerrar y volver a abrir, los 39 días y el contenido siguen ahí.
4. Se borra una fila y desaparece al guardar.

## Sección 4 — Alumnado (implementada)

Ficha completa en `PROPUESTA-ALUMNADO.md`.

- Listado del grupo con búsqueda y filtro (todos/activos/inactivos).
- Importación JSON/CSV, alta manual y edición.
- Desactivar mantiene la matrícula; quitar del grupo no borra al alumno.
- Contador de la barra lateral sincronizado.

## Decisiones tomadas

| Fecha       | Decisión                                                                                                        |
| ----------- | --------------------------------------------------------------------------------------------------------------- |
| 27 oct 2026 | El grupo es una **clase de FP de DAW**, no un módulo suelto.                                                    |
| 27 oct 2026 | Se identifica por **ciclo + módulo + curso + modalidad**; el nombre usa las **siglas** del módulo (DWES).       |
| 27 oct 2026 | El desplegable de módulos se filtra por el **curso** elegido y el repositorio rechaza mezclas.                  |
| 27 oct 2026 | La tabla muestra **alumnos matriculados** y un enlace a los **RA/CE del módulo**.                               |
| 27 oct 2026 | **Alumnado**: listado del grupo, altas, edición, desactivar y quitar del grupo.                                 |
| 27 oct 2026 | **Programación de aula**: vista de tarjetas + edición rápida en tabla; importación JSON/TSV/CSV.                |
| 28 oct 2026 | **Calificaciones**: vista maestro-detalle; alumnado a la izquierda y notas editables a la derecha.              |
| 27 oct 2026 | **Entregas**: pestañas por avaluación, secciones por categoría y formulario en página propia.                   |
| 27 oct 2026 | **Rúbrica**: texto libre y/o archivo adjunto; se muestra al calificar la entrega.                               |
| 27 oct 2026 | **Notas**: decimales y anotaciones de texto por alumno y entrega.                                               |
| 27 oct 2026 | **Bloqueo**: una entrega bloqueada no se edita, borra ni recalifica; se puede desbloquear.                      |
| 27 oct 2026 | La pestaña de avaluación seleccionada se conserva al volver a Entregas.                                         |
| 28 oct 2026 | **Curso académico**: desplegable en la barra; se calcula por fecha (septiembre–julio).                          |
| 28 oct 2026 | **Creación de grupos**: asigna automáticamente el curso actual; al editar conserva el curso.                    |
| 28 oct 2026 | **Cursos**: se pueden renombrar y borrar si no tienen grupos; no se crean manualmente.                          |
| 28 oct 2026 | **Evidencias**: ficheros globales de la entrega, clasificados como material, solución, apuntes, entrega u otro. |
| 28 oct 2026 | **RA**: cada alumno debe superar todos los RA; se muestran los pendientes y hay informe específico.             |
| 28 oct 2026 | **Formación en empresa**: periodos por alumno con empresa obligatoria y fechas.                                 |
| 28 oct 2026 | **Evaluaciones y exámenes**: fechas por grupo con alta manual, edición y pegado/importación de JSON.            |
| 28 oct 2026 | **Tabla de entregas**: resumen, búsqueda, filtro por estado, progreso de registros y acceso directo a notas.    |
| 28 oct 2026 | **Copiar correo**: acción del menú del alumno, no un botón dentro de la celda de correo.                        |
| 28 oct 2026 | **Componentes**: SelectButton, menú de acciones y formularios en tarjeta unificados.                            |
| 28 oct 2026 | **Dashboard**: barra de acciones agrupada y widgets orientados a tareas, no gráficas genéricas.                 |
| 27 oct 2026 | La interfaz gira alrededor del grupo: barra de grupos + dashboard + secciones del grupo.                        |
| 27 oct 2026 | Cada cambio se revisa en el **navegador**; Electron se valida más adelante.                                     |
| 30 oct 2026 | **Navegación de grupo**: barra superior Dashboard + Día a día + Consulta; sin botón Volver en vistas de grupo.  |
| 30 oct 2026 | **Acciones**: menús desplegables con iconos; guardados con notificaciones emergentes de color.                  |
| 31 oct 2026 | **Criterios**: pesos de categorías generales y pesos propios optativos por trimestre.                           |
| 31 oct 2026 | **Guía**: completa con capturas en Opciones globales y ayuda contextual por sección en la barra superior.       |
| 31 oct 2026 | **Dashboard del curso**: entrada de la aplicación con calendario global de todos los módulos.                   |

## Curso académico (transversal)

- La barra lateral mantiene un **desplegable de cursos académicos** para filtrar los grupos.
- El curso se calcula por la fecha: empieza el **1 de septiembre** y termina el **1 de julio**;
  de enero a agosto se toma el septiembre anterior (por ejemplo, 2026/2027).
- **No se crea un curso a mano**: al crear un grupo, la aplicación asegura el curso actual y
  asigna el grupo a ese curso. Al editar un grupo, conserva el curso con el que se creó.
- Los cursos se pueden **renombrar** y **borrar** desde `/cursos`; no se puede borrar uno que
  todavía tenga grupos. El curso actual puede borrarse si está vacío y se volverá a crear al
  guardar un grupo.
- Las cabeceras de las secciones del grupo muestran el curso académico.

## Dashboard y experiencia de uso

- El **dashboard del curso** es la entrada de la aplicación y muestra un calendario global con todos los
  módulos, sus entregas, exámenes, evaluaciones y días no lectivos.
- La navegación de grupo vive en una **barra superior común**: Dashboard, Día a día
  (Programación, Horario, Faltas, Entregas y Calificaciones) y Consulta (Alumnado,
  Programación didáctica e Informes), con separadores verticales y sin rótulos intermedios.
- Las vistas de grupo no muestran botón «Volver»: la barra superior resuelve la navegación.
- La antigua barra de acciones del dashboard se ha retirado para no duplicar accesos.
- El dashboard prioriza el trabajo diario: próxima sesión, notas por poner, alumnado en riesgo y
  próxima entrega.
- Debajo: próximas sesiones, top 5 de alumnado que necesita atención, tareas pendientes,
  próximas entregas, estado del grupo, progresos y distribución de calificaciones.
- Los formularios de grupo y alumnado son ahora tarjetas en la propia página (no modales).
- Las acciones de tabla se agrupan en un menú «⋯» con etiquetas claras (Entregas,
  Alumnado y Grupos).
- Los selectores segmentados usan el componente común `SelectButton` (Entregas,
  Programación e Informes).
- El alumnado puede tener periodos de **formación en empresa** con empresa obligatoria,
  fechas, observaciones y control de solapes.
- Informes incorpora un informe específico de **RA superados por alumno**.
- En Calificaciones se muestra el estado de los RA, los no superados y un botón para
  copiar el correo del alumno.

## Secciones 5–8 (implementadas)

- **Entregas** (`/grupo/:id/entregas`): pestañas por avaluación (la última vista se
  conserva y «Todas» va al final), una sola tabla agrupada por categoría con resumen de
  preparación, búsqueda y filtro por estado (abiertas, bloqueadas, sin rúbrica, sin RA/CE),
  progreso de registros por entrega y accesos directos a notas. Formulario en página propia
  (no popup), rúbrica obligatoria en texto y/o archivo adjunto, mapeo a RA/CE y bloqueo de
  entregas ya calificadas.
- **Notas por entrega** (`/grupo/:id/entregas/:entregaId`): nota decimal y anotaciones de
  texto por alumno; si la entrega está bloqueada, solo lectura.
- **Evidencias** (`/grupo/:id/entregas/:entregaId/evidencias`): gestor de ficheros global de
  la entrega, con categoría visible (material, solución, apuntes de notas, entrega del
  alumnado u otro), subida múltiple, apertura, descarga y borrado.
- **BOE** (`/grupo/:id/boe`): RA/CE del módulo, cobertura por entregas y porcentaje.
- **Calificaciones** (`/grupo/:id/calificaciones`): vista maestro-detalle con el alumnado a
  la izquierda y las notas editables del alumno seleccionado a la derecha; cálculo por
  categoría/avaluación/final, mínimos bloqueantes y guardado solo cuando hay cambios.
- **Informes** (`/grupo/:id/informes`): previsualización, descarga HTML/CSV e impresión/PDF
  del grupo o de un alumno.
- **Alumnado**: «Ver notas» abre Calificaciones con ese alumno ya seleccionado. La tabla usa
  la barra de controles de Informes (filtros a la izquierda, acciones a la derecha).
- **Evaluaciones y exámenes** (`/grupo/:id/evaluaciones`): cada grupo guarda sus fechas
  (tipo, título, fecha, hora, avaluación y observaciones), con alta manual, edición y
  borrado. La importación JSON acepta un array, `{ eventos: [...] }` o
  `{ evaluaciones: [...], examenes: [...] }`; las fechas se admiten en ISO o `dd/mm/aaaa`.
- **Formación en empresa** (`/grupo/:id/alumnado/:alumnoId/formacion`): periodos por alumno.
- **Normativa FP** (`/normativa`): la guía ocupa todo el contenido; la barra lateral conserva el
  acceso y la importación de `index.html`.

No quedan secciones pendientes de definir; a partir de aquí se pulen las existentes.

## Programación didáctica, unidades y calendario

- **Programación didáctica** (`/grupo/:id/programacion-didactica`) agrupa en pestañas las
  unidades, las fechas, los criterios y los RA/CE.
- **Unidades**: código, nombre, fechas, contenidos, observaciones, RA y sesiones asignadas. Las
  sesiones se vinculan desde el formulario de cada día.
- **Calendario escolar**: se importa por curso académico (JSON) y se consulta desde Programación
  de aula; incluye descarga de esquema y vaciado.
- La programación diaria sigue siendo la vista de trabajo de cada día.

## Registro

| #   | Sección                   | Estado                             | Fecha       |
| --- | ------------------------- | ---------------------------------- | ----------- |
| 0   | Estructura y dashboard    | implementada, pendiente de validar | 27 oct 2026 |
| 1   | Grupos                    | implementada, pendiente de validar | 27 oct 2026 |
| 2   | Criterios de calificación | implementada, pendiente de validar | 27 oct 2026 |
| 3   | Programación de aula      | implementada, pendiente de validar | 27 oct 2026 |
| 4   | Alumnado                  | implementada, pendiente de validar | 27 oct 2026 |
| 5   | Entregas                  | implementada, pendiente de validar | 27 oct 2026 |
| 6   | BOE                       | implementada, pendiente de validar | 27 oct 2026 |
| 7   | Calificaciones            | implementada, pendiente de validar | 27 oct 2026 |
| 8   | Informes                  | implementada, pendiente de validar | 27 oct 2026 |
| 9   | Cursos académicos         | implementada, pendiente de validar | 28 oct 2026 |
| 10  | Evidencias                | implementada, pendiente de validar | 28 oct 2026 |
| 11  | Evaluaciones y exámenes   | implementada, pendiente de validar | 28 oct 2026 |
| 12  | Formación en empresa      | implementada, pendiente de validar | 28 oct 2026 |

## Anexo — hallazgos técnicos de la revisión inicial

Se conservan para cuando se aborden esas secciones; no forman parte del «qué»:

- Calificaciones: al guardar por criterios no se refresca el resumen.
- Entregas: peso sin explicar; mapeo sin buscador. (La tabla ya se reorganizó con resumen,
  búsqueda, filtros y progreso; queda revisar la explicación del peso y el buscador de mapeo.)
- BOE: carga siempre el primer ciclo, ignorando el grupo activo.
- Alumnos: «Quitar del grupo» sin confirmación.
- Transversal: modales sin foco atrapado ni `Esc`, `confirm()` nativo, estilos en línea.
