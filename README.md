# Docente Curso · gestión de entregas y calificaciones

Aplicación de escritorio **local** para organizar la docencia de FP alrededor de **grupos de
clase**: programación, alumnado, entregas con rúbrica, evidencias, calificaciones, formación en
empresa e informes trazables al BOE.

> **Repositorio:** [git@github.com:msanchez07/docente-curso.git](https://github.com/msanchez07/docente-curso)
>
> El detalle de lo construido, las decisiones y el historial de iteraciones están en
> [`RESUMEN-ITERACIONES.md`](./RESUMEN-ITERACIONES.md). Ese documento es el que debe actualizarse
> al cerrar cada nueva iteración.

## Estado

Aplicación funcional en desarrollo activo. Verificación actual:

- `npm run typecheck` ✅
- `npm test` ✅ **204 tests**
- `npm run build` ✅
- `npm run smoke` ✅

## Funcionalidad principal

- **Cursos académicos automáticos** por fecha (septiembre–julio); actualmente `2026/2027`.
- **Grupos** por ciclo, nivel, modalidad y módulo, con nombre generado y curso académico
  asignado automáticamente.
- **Horario semanal** de bloques de 55 minutos:
  - Mañana 08:00–14:00, recreo 10:45–11:15.
  - Tarde 14:40–21:05, recreo 18:00–18:20.
  - En semipresencial se marcan sesiones, tutorías colectivas y tutorías individuales, con
    varias posibles por día y colores distintos.
  - Vista independiente de horario desde el dashboard.
- **Dashboard** con agenda ordenada por fechas y minicalendario mensual:
  - Días coloreados por entregas, exámenes, evaluaciones y festivos/no lectivos.
  - Festivos y no lectivos con fondo rojo, sin indicar unidad didáctica.
  - Unidades didácticas visibles por día con colores estables.
  - Listado de próximos hitos y fila aparte de días no lectivos.
- **Programación de aula**: sesiones por fecha y hora, varias por día, unidades, desviaciones y
  observaciones.
- **Programación didáctica**: unidades, fechas, criterios, RA/CE y calendario escolar.
  - **Presentación del módulo**: plantilla HTML editable, con datos reales del grupo, vista
    previa, copia para Aules, descarga e impresión/PDF.
  - Plantilla de calificación por unidad: categorías, pesos y mínimos; editable o importable
    desde JSON.
- **Entregas**:
  - Asociación obligatoria a una unidad didáctica.
  - Secciones **Enunciado**, **Descripción del problema** y **Restricciones**.
  - Pestañas **Ficha** y **Notas** al abrir una entrega; la ficha es la vista inicial.
  - Ficha HTML autocontenida, con vista previa, copia para Aules, descarga e impresión/PDF.
  - Rúbrica en texto y/o archivo, evidencias y mapeo a RA/CE.
  - Bloqueo/desbloqueo y notas por alumno.
  - Exportación PDF/ZIP por entrega o curso completo, con dossier y archivos cuando corresponde.
- **Calificaciones**:
  - Vista de consulta: la nota final no se edita aquí, se calcula desde las entregas.
  - Pestañas por unidad didáctica y última pestaña **Nota final**.
  - Cada trimestre pondera en la nota final; las unidades ponderan dentro de su trimestre.
  - La suma de pesos de las unidades de un trimestre debe ser 100 %.
  - Cálculo de categorías, RA y nota final, con mínimos por unidad.
  - Informe PDF por alumno y acceso a su informe completo.
- **Informes** de grupo y alumno con gráficas, RA, formación, impresión y exportación.
- **Plantillas de criterios** con listado y edición en páginas propias.
- **Normativa FP** a pantalla completa e importación desde la barra lateral.
- **Datos de prueba** en la previsualización web: restaurar o eliminar.
- **Control de faltas por curso/tutoría**:
  - Todos los módulos del curso con nombre exacto en el informe ITACA, horas y límite.
  - Se excluyen los módulos de FCT/formación en empresa, que no tienen faltas.
  - Importación de PDFs de faltas de varias páginas.
  - Historial de las faltas extraídas de cada informe; no se guarda el PDF.
  - Tabla por alumno y módulo, porcentajes y estados por colores.
  - Impresión/PDF del informe seleccionado.
- **Copias de seguridad por grupo**:
  - Carpeta raíz global configurable.
  - Subcarpeta automática por curso académico.
  - JSON autocontenido por grupo (alumnado, criterios, entregas, notas, evidencias,
    programación, unidades con sus plantillas, eventos y formación; archivos en base64).
  - Importación de una copia para restaurar solo ese grupo.
  - Aviso si la carpeta no está configurada o ha desaparecido.
  - Copia automática al abrir la aplicación si el contenido de un grupo cambió.
- **Menú de opciones globales** en la barra lateral (cursos, plantillas, copias, normativa y
  datos de prueba).

## Stack

- Electron
- Vue 3 + TypeScript + Pinia + Vue Router
- SQLite con `better-sqlite3` y migraciones versionadas (última: **v36**)
- Vite / electron-vite
- Vitest
- JSZip para exportaciones con archivos

## Puesta en marcha

Requisitos: Node.js 20+ y npm.

```bash
npm install
npm run dev        # app de escritorio en desarrollo
npm run dev:web    # previsualización en navegador con API simulada
```

## Comandos

```bash
npm run typecheck  # comprobación de tipos
npm test           # tests unitarios
npm run build      # typecheck + build de main, preload y renderer
npm run smoke      # flujo renderer → preload → IPC → SQLite
npm run smoke:boe  # lectura de los recursos del BOE
npm run format     # Prettier
npm run lint       # ESLint
```

Empaquetado:

```bash
npm run build:unpack
npm run build:mac
npm run build:win
npm run build:linux
```

## Estructura

```text
src/
├── main/            # proceso principal: SQLite, IPC, servicios de exportación
│   ├── db/          # esquema, migraciones y repositorios
│   ├── entregas/    # exportación de entregas (PDF/ZIP)
│   ├── informes/    # informes HTML/PDF/CSV
│   └── programacion/# exportación de programación a PDF
├── preload/         # puente tipado entre renderer y main
├── renderer/        # interfaz Vue 3
│   ├── components/  # componentes reutilizables
│   ├── dev/         # API simulada para la previsualización web
│   ├── stores/      # Pinia
│   └── views/       # vistas por grupo y globales
├── shared/          # tipos, validaciones y generadores compartidos
└── resources/       # BOE, normativa y materiales de ejemplo
tests/               # pruebas unitarias
scripts/             # smoke tests y utilidades
```

## Datos y privacidad

La base de datos vive en el equipo del docente:

```text
~/Library/Application Support/gestion-entregas/gestion-entregas.db   # macOS
```

No hay backend remoto. La previsualización web (`npm run dev:web`) es solo una simulación local
con `localStorage`. Las exportaciones se generan localmente.

## Documentación

- [`RESUMEN-ITERACIONES.md`](./RESUMEN-ITERACIONES.md) — estado vivo, decisiones, historial y
  pendientes.
- [`PLAN.md`](./PLAN.md) — plan original por fases.
- [`PLAN-REVISION-SECCIONES.md`](./PLAN-REVISION-SECCIONES.md) — revisión de secciones.
