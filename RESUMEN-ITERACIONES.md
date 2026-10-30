# Docente Curso · resumen de iteraciones

> Documento vivo. Debe actualizarse al cerrar cada iteración con lo construido, las decisiones
> tomadas, las verificaciones ejecutadas y lo que queda pendiente. La versión corta de producto
> está en [`README.md`](./README.md).

**Última actualización:** 28/10/2026  
**Estado:** aplicación funcional de escritorio + previsualización web con API simulada.  
**Verificación de referencia:** `typecheck`, **195 tests**, `build` y `smoke` en verde.

---

## 1. Producto

Aplicación local para que el profesorado de FP organice el curso alrededor de **grupos de
clase**:

- Un grupo es un **módulo + curso + modalidad** dentro de un **curso académico**.
- El curso académico se calcula automáticamente por fecha (septiembre–julio); actualmente
  `2026/2027`.
- Los datos viven en SQLite en el equipo del docente. La previsualización web usa una API
  simulada sobre `localStorage`.

Stack: **Electron + Vue 3 + TypeScript + Pinia + Vue Router + SQLite (`better-sqlite3`) +
Vite/electron-vite + Vitest**.

---

## 2. Lo construido

### 2.1. Cursos, grupos y docencia

- Cursos académicos automáticos y conmutables desde la barra lateral.
- Grupos creados a partir de ciclo, nivel, modalidad y módulo, con nombre generado.
- Renombrado/borrado de cursos con confirmación.
- Asignación automática del grupo al curso actual; al editar se conserva su curso.
- Formulario de grupo con:
  - **Calendario semanal de bloques de 55 minutos** para presencial y semipresencial.
  - Mañana 08:00–14:00, con recreo 10:45–11:15.
  - Tarde 14:40–21:05, con recreo 18:00–18:20.
  - Selección de bloques por clic; en presencial se marca sesión; en semipresencial se
    alterna **sesión → tutoría colectiva → tutoría individual → vacío**.
  - Varias tutorías colectivas y/o individuales por día, con colores distintos.
  - Resumen del horario y de las tutorías en el propio grupo.
- Vista independiente de **Horario semanal** (`/grupo/:grupoId/horario`) accesible desde el
  dashboard, sin ocupar espacio permanente.
- Alumnado por grupo, alta manual e importación JSON/CSV, activación/desactivación y
  desmatriculación.
- Formación en empresa por alumno y periodo, con fechas y empresa. Las FCT no registran horas.

### 2.2. Dashboard del grupo

- Cabecera del grupo, criterios, RA/CE y accesos rápidos.
- Tarjetas de próxima sesión, notas pendientes, alumnado en riesgo y próxima entrega.
- **Próximas sesiones** con fecha visible, contenido, unidad, hora y desviación.
- **Agenda**:
  - Ordenada globalmente por fecha (entregas, exámenes, evaluaciones y no lectivos).
  - Minicalendario mensual con navegación y día actual resaltado.
  - Días coloreados por tipo: entrega (azul), examen (ámbar), evaluación (verde) y
    festivo/no lectivo/vacaciones (**rojo**).
  - Puntos de color y leyenda.
  - Lista de próximos hitos ordenada.
- Alumnado en riesgo, tareas pendientes, estado del grupo, formación en empresa y estado de la
  programación didáctica.

### 2.3. Programación de aula y programación didáctica

- Programación de aula por sesiones/fechas, con varias sesiones por día mediante hora y orden.
- Unidades de programación en maestro-detalle:
  - Sesiones, RA y contenidos.
  - Importación JSON y descarga de esquema.
- Calendario escolar mensual:
  - Festivos, no lectivos y vacaciones con colores.
  - Colores de unidad por día.
  - Importación JSON con `festivos`, `no_lectivos` y `vacaciones`; esquema descargable.
- Hub de programación didáctica con pestañas Unidades, Fechas, Criterios, RA/CE y Calendario.
- Exportación de la programación de aula a **PDF con todas las fechas**, márgenes y diseño de
  informe, incluyendo el horario semanal y las tutorías de la semipresencial.

### 2.4. Entregas, evidencias y calificaciones

- Entregas por grupo, ubicadas en avaluación y categoría, con mapeo a RA/CE.
- Rúbrica en texto y/o archivo adjunto; evidencias clasificadas por tipo.
- Tabla de entregas agrupada por categoría, con búsqueda, filtros, progreso de registros,
  fechas y acciones.
- Bloqueo/desbloqueo de entregas; las bloqueadas no admiten cambios hasta desbloquearlas.
- Calificaciones:
  - Notas decimales por entrega y anotaciones.
  - Cálculo de categoría, avaluación, RA y nota final.
  - Desbloqueo directo desde Calificaciones si una entrega está bloqueada.
  - Botón **Editar notas** y **Informe PDF** por alumno.
  - Enlace **Ver informe** que abre Informes con el alumno seleccionado.
- Informes:
  - Resumen/Calificaciones/RA.
  - Gráficas al final, pastel 3D y criterios superados por RA.
  - Impresión/exportación HTML/CSV/PDF con opciones y previsualización.
- Plantillas de criterios con listado y edición en páginas propias (`/plantillas`,
  `/plantillas/:id`), no en modal.
- Criterios de calificación en maestro-detalle con categorías, avaluaciones, mínimos y resumen.

### 2.5. Exportación de entregas

- Exportación por **una entrega**, **avaluación/trimestre** o **curso completo**.
- **Previsualización en ventana propia** antes de exportar; no se abre como modal.
- Dossier con portada, índice, una página por entrega, descripción, rúbrica, criterios y
  archivos; estilo alineado con Informes (colores, márgenes, tarjetas).
- Si solo hay texto/rúbrica: **PDF**.
- Si hay archivos: **ZIP** con los archivos.
- Si hay ambos: **ZIP con el PDF y los archivos**.
- El archivo de una sola entrega usa el **nombre de la entrega**.
- Los archivos se organizan por entrega, rúbrica y evidencias.

### 2.6. Copias de seguridad

- Carpeta raíz **global** de copias, elegida por el usuario.
- Subcarpeta automática por **curso académico**; cada grupo se guarda como JSON autocontenido
  con alumnado, criterios, entregas, notas, evidencias, programación, unidades, eventos,
  formación y archivos en base64.
- Importación por grupo: restaura solo ese grupo; si ya existe la misma identidad
  (curso + ciclo + nivel + modalidad + módulo), sustituye su contenido.
- Aviso en la aplicación si la carpeta no está configurada o deja de existir.
- **Copia automática al abrir la aplicación** si cambió el contenido de un grupo; también se
  puede crear manualmente por grupo o para todos.
- Menú **Opciones globales** en la barra lateral para cursos, plantillas, copias, normativa y
  datos de prueba.

### 2.7. Control de faltas por curso

- Vista de tutoría a nivel de **curso** (ciclo + nivel + modalidad), con todos los módulos y el
  alumnado matriculado en cualquiera de ellos.
- Nombre exacto de cada módulo en el PDF de ITACA, horas y límite configurables.
- Importación de PDFs de faltas de **varias páginas** con `pdfjs-dist`.
- **Historial de informes**: cada PDF subido se guarda como una instantánea independiente y se
  puede consultar después.
- Tabla por alumno y módulo, porcentajes y estados por colores.
- Impresión/PDF del informe seleccionado.
- Nueva migración **v30** (`faltas_modulo_config`, `faltas_informes`).

### 2.8. Normativa y datos de prueba

- Normativa FP a pantalla completa manteniendo la barra lateral; importación desde la barra.
- Previsualización web:
  - **Restaurar datos de prueba**.
  - **Eliminar datos de prueba** con confirmación; deja la aplicación vacía y no vuelve a
    sembrar datos automáticamente.

### 2.9. Persistencia y migraciones

- SQLite con migraciones versionadas (`PRAGMA user_version`).
- Última migración aplicada: **v28**.
  - v23: unidades y calendario escolar.
  - v24: horas de formación.
  - v25: varias sesiones por día (`hora`, `orden`).
  - v26: horario semanal por días.
  - v27: tutorías semanales.
  - v28: bloques de 55 minutos del calendario semanal.
  - v29: totales de faltas y justificadas por alumno/grupo.
  - v30: configuración de módulos e historial de informes de faltas por curso.
- `dias_semana` y `tutorias_semana` se derivan del calendario cuando hay bloques, para que la
  programación, el resumen del grupo y el PDF sean coherentes.

---

## 3. Decisiones relevantes

- Cursos académicos derivados de la fecha; no se crean manualmente.
- Grupos como unidad de trabajo; entregas/criterios pertenecen al grupo.
- Informes con SVG nativo, sin depender de Chart.js, para que impresión/exportación sea
  autocontenida.
- El calendario de bloques se usa en presencial y semipresencial; las tutorías solo se marcan en
  semipresencial.
- Las tutorías se marcan en el propio calendario, no en una sección separada.
- Los días festivos/no lectivos tienen prioridad visual roja en la agenda.
- La agenda muestra las unidades didácticas de cada día con un color estable por unidad; la
  leyenda del mes permite identificar todas las unidades visibles.
- Las vistas embebidas en programación didáctica usan cabeceras de sección, no cabeceras de
  página, para mantener una jerarquía única.
- La previsualización de entregas se abre en ventana propia; la exportación se confirma desde
  ella.
- El PDF de entregas usa el nombre de la entrega cuando el ámbito es una sola entrega.

---

## 4. Verificación

Comandos de cierre de iteración:

```bash
npm run typecheck
npm test
npm run build
npm run smoke
```

Estado actual: **195 tests**, 31 archivos de test, build y smoke correctos.

---

## 5. Pendiente / próximas iteraciones

- E2E real con Playwright + Electron (la Fase 8 sigue abierta).
- Revisar si se necesita una nota final manual/override y cómo encaja con la trazabilidad.
- Terminar de pulir textos y estados vacíos de algunas vistas heredadas (`AjustesView`).
- Validar el mapa de contenidos del módulo 0613 con el profesorado.
- Revisar rendimiento y accesibilidad de tablas largas y del dashboard en ventanas pequeñas.

---

## 6. Cómo actualizar este documento

Al cerrar cada iteración:

1. Añade una entrada al final de **Registro de iteraciones** con fecha y alcance.
2. Actualiza las secciones de funcionalidad afectadas; no dupliques información en README.
3. Anota decisiones nuevas y limitaciones conocidas.
4. Actualiza el recuento de tests y el resultado de `typecheck`, `build` y `smoke`.
5. Mueve a “Pendiente” lo que siga abierto y elimina lo ya resuelto.

### Registro de iteraciones

| Fecha      | Iteración          | Resumen                                                                                                                                 |
| ---------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| 28/10/2026 | Base               | Electron + Vue 3 + SQLite, cursos, grupos, alumnado, criterios, entregas, notas, informes, normativa, BOE.                              |
| 28/10/2026 | Programación       | Unidades, calendario escolar, sesiones múltiples, programación didáctica, PDF de programación.                                          |
| 28/10/2026 | Dashboard          | Agenda, formación, programación didáctica, fechas visibles y calendario de agenda coloreado.                                            |
| 28/10/2026 | Horarios           | Bloques de 55 minutos, recreos, tutorías colectivas/individuales múltiples por día, vista de horario.                                   |
| 28/10/2026 | Entregas           | Exportación por entrega/avaluación/curso, previsualización en ventana propia, PDF/ZIP, nombre de archivo e informe por alumno.          |
| 30/10/2026 | Homogeneización UI | Cabeceras de página y de sección unificadas, métricas compartidas, navegación de mes común y unidades didácticas visibles en la agenda. |
