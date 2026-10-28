# Plan de implementación — Aplicación de gestión de entregas y notas (Electron, local)

> Documento generado por el subagente `planner` y guardado para revisión.
> Estado: **pendiente de verificación del profesorado** antes de implementar.

## Petición original

> Leer el contenido de los cursos de apuntes. La idea es generar una nueva aplicación
> para gestionar las entregas de los alumnos y las notas, de tal manera que al final
> genere un informe final. Todo tiene que ir relacionado con el BOE, así que las
> entregas deben estar relacionadas con el BOE. Empecemos definiendo que será un
> Electron para ejecución en local.

## Contexto encontrado en el repositorio

- **`docs2/`** es la versión VitePress del módulo *Desarrollo web en entorno servidor*
  (DAW): `introduccion`, `php`, `aplicaciones_web`, `laravel`, `servicios_web`,
  `webs_dinamicas`, `aplicaciones_web_hibridas`, más `index.md` y `bibliografia.md`.
  Los ejercicios viven en los `99-ejercicios.md` de cada carpeta (con pestañas
  `Enunciado`/`Solución`).
- **`docs/php/evaluacion/98 - tarea_evaluacion.md`** ya contiene una tarea de evaluación
  real con **rúbrica y pesos** (arrays, funciones, condicionales, directivas…), y
  `docs/introduccion/evaluacion/cuestionario_moodle.txt` es un banco de preguntas. Ese
  material es la materia prima de las "entregas".
- El módulo oficial es **0613. Desarrollo web en entorno servidor** (DAW), definido en
  **RD 686/2010** (BOE-A-2010-9269) y actualizado por **RD 405/2023**
  (BOE-A-2023-13221). El BOE fija los **RA (Resultados de Aprendizaje)** y sus
  **CE (Criterios de Evaluación)**.

---

## Requirements Restatement

Construir una **aplicación de escritorio Electron para ejecución 100 % local** (sin
backend, sin nube) que permita al profesorado del módulo 0613:

1. **Ingerir el contenido de los cursos** de `docs2/` y las tareas de evaluación de
   `docs/` como fuente de las entregas.
2. **Definir entregas** (tareas/ejercicios evaluables) y **vincular cada entrega al
   BOE**: cada entrega se asocia a uno o varios **Resultados de Aprendizaje (RA)** y
   **Criterios de Evaluación (CE)** del módulo 0613, con su peso.
3. **Gestionar alumnos** (grupos, matrícula, datos mínimos).
4. **Registrar entregas y notas** por alumno, entrega y criterio (0–10, estado de
   entrega, observaciones, fichero adjunto).
5. **Calcular la calificación**: nota por entrega → nota por RA → **nota final del
   módulo**, con ponderaciones configurables y validación de que suman 100 %.
6. **Generar un informe final** por alumno y por grupo (HTML y PDF), trazable al BOE
   (RA/CE cubiertos, pesos, notas, aprobado/suspenso).

**Alcance de la primera fase:** arrancar por la definición y el esqueleto de la app
Electron. La ingesta automática avanzada, cifrado y firma quedan en fases posteriores.

---

## Architecture Changes

Se crea una **aplicación independiente** que no interfiere con el sitio VitePress de
`docs2/`.

```
apuntes/
├── apuntes_daw_entorno_servidor/   # (existente) repo de apuntes — solo lectura
│   ├── docs2/                      # contenido del curso (VitePress)
│   └── docs/                       # tareas de evaluación
└── gestion-entregas/               # NUEVA app Electron (independiente)
    ├── package.json
    ├── electron.vite.config.ts
    ├── tsconfig.json
    ├── src/
    │   ├── main/               # proceso principal (Node)
    │   │   ├── index.ts        # arranque BrowserWindow, menú, ciclo de vida
    │   │   ├── ipc/            # handlers IPC (alumnos, entregas, notas, informes)
    │   │   ├── db/             # SQLite: esquema, migraciones, repositorios
    │   │   ├── domain/         # motor de calificación, validaciones (Zod)
    │   │   ├── ingest/         # parser de docs2/ + docs/ (entregas y rúbricas)
    │   │   └── report/         # generación de informe final (PDF/HTML)
    │   ├── preload/
    │   │   └── index.ts        # puente seguro contextBridge (API tipada)
    │   └── renderer/           # interfaz Vue 3
    │       ├── views/          # Alumnos, Entregas, BOE, Calificaciones, Informes, Ajustes
    │       ├── components/     # tablas, editor de pesos, mapeo RA/CE
    │       ├── stores/         # Pinia
    │       └── router/
    ├── resources/
    │   ├── boe/0613.json       # RA/CE transcritos del BOE (RD 405/2023)
    │   └── plantillas/         # plantilla del informe final
    └── tests/
```

**Modelo de datos (SQLite, esquema `gestion-entregas/src/main/db/schema.sql`):**

| Tabla | Campos clave |
|---|---|
| `modulos` | id, codigo (`0613`), nombre, rd, boe_url, horas, ects |
| `resultados_aprendizaje` | id, modulo_id, codigo (`RA1`…), descripcion, peso |
| `criterios_evaluacion` | id, ra_id, codigo (`a`,`b`…), descripcion, peso |
| `alumnos` | id, nombre, apellidos, dni, email, grupo, activo |
| `entregas` | id, modulo_id, titulo, descripcion, origen (`docs2/php/…`), fecha_limite, peso, tipo |
| `entrega_ce` | entrega_id, ce_id, peso *(N:M entrega↔criterio)* |
| `entregas_alumno` | id, entrega_id, alumno_id, fecha_entrega, estado, ruta_fichero, observaciones |
| `notas` | id, entrega_alumno_id, ce_id, nota (0–10), comentario |
| `config` | curso_academico, escala, umbral_aprobado, ponderaciones |

**Motor de calificación (`domain/grading.ts`):** `nota_entrega` = media ponderada de CE;
`nota_RA` = media ponderada de entregas mapeadas a ese RA; `nota_final` = media
ponderada de RA. Valida pesos y avisa si no suman 100 %.

---

## Implementation Phases

### Fase 0 — Descubrimiento y datos BOE (bloqueante)

- **0.1** Extraer RA/CE **verbatim** del módulo 0613 desde el texto consolidado del BOE
  (RD 405/2023, `BOE-A-2023-13221`) y volcarlos en `resources/boe/0613.json`. *Por qué:*
  todo el producto se ancla al BOE; un dato erróneo contamina informes. *Riesgo:* alto.
- **0.2** Inventariar el contenido de `docs2/` y las tareas de `docs/*/evaluacion/` para
  decidir el mapa inicial unidad→RA (hipótesis: `introduccion`→RA1, `php`→RA2,
  `aplicaciones_web`→RA3/RA4, `laravel`→RA5,
  `servicios_web`/`webs_dinamicas`/`hibridas`→RA6). *Verificable con el profesorado.*
- **0.3** Validar el modelo de datos y las ponderaciones con un caso real (la tarea de
  `98 - tarea_evaluacion.md`).

### Fase 1 — Andamiaje Electron + Vue 3 + TS

- **1.1** Crear `gestion-entregas/` con `electron-vite` (main/preload/renderer),
  TypeScript y Vue 3.
- **1.2** Configurar `BrowserWindow` segura: `contextIsolation: true`,
  `nodeIntegration: false`, `sandbox` donde sea posible.
- **1.3** Definir el **contrato IPC tipado** en `preload/index.ts` (contextBridge), única
  superficie de acceso del renderer.
- **1.4** Router + Pinia + layout base (menú lateral: Alumnos, Entregas, BOE,
  Calificaciones, Informes, Ajustes).
- **1.5** Verificación: `npm run dev` abre la ventana y navega entre vistas vacías.

### Fase 2 — Persistencia y dominio

- **2.1** Integrar **SQLite** (`better-sqlite3` con `electron-rebuild`; plan B:
  `sql.js`/JSON si falla el build nativo).
- **2.2** Esquema + migraciones + `seed` de `resources/boe/0613.json`.
- **2.3** Repositorios por entidad (patrón repository) y validación de entrada con
  **Zod**.
- **2.4** Tests unitarios del motor de calificación (`tests/grading.test.ts`): pesos,
  redondeos, aprobado/suspenso, pesos que no suman 100 %.

### Fase 3 — Ingesta del contenido de los cursos

- **3.1** Parser de `docs2/**/*.md` (leer headings, `Tabs`/admonitions
  `custom-block question`) para proponer entregas.
- **3.2** Parser de `docs/*/evaluacion/*` (tareas + rúbricas en tabla) para sembrar
  entregas con pesos y criterios.
- **3.3** UI de revisión: importar → previsualizar → confirmar/editar antes de persistir
  (nunca escribir automáticamente sin revisión).

### Fase 4 — UI de gestión (alumnos, entregas, BOE)

- **4.1** CRUD de **Alumnos** (grupos, importación CSV).
- **4.2** CRUD de **Entregas** con editor de mapeo **RA/CE + pesos** (reutilizando el
  patrón `Tabs` del repo si aporta).
- **4.3** Vista **BOE**: RA/CE de solo lectura, con la cobertura (qué entregas cubren cada
  criterio) y alerta de criterios sin evaluar.

### Fase 5 — Calificaciones

- **5.1** Vista de registro de **entregas de alumno** (estado, fichero adjunto, fecha).
- **5.2** Editor de **notas por CE** con cálculo en vivo de nota de entrega y RA.
- **5.3** Panel de **nota final** por alumno y grupo, con validación de ponderaciones.

### Fase 6 — Informe final

- **6.1** Plantilla de informe (HTML) por alumno y por grupo, con cabecera BOE (módulo,
  RD, RA/CE), tablas de notas y resumen.
- **6.2** Export a **PDF** con `webContents.printToPDF` (nativo de Electron, sin
  dependencias pesadas) y a **HTML**.
- **6.3** Export de notas a **CSV** para volcado a la plataforma del centro.

### Fase 7 — Empaquetado y endurecimiento

- **7.1** Build y empaquetado local (`electron-builder`) para macOS/Windows.
- **7.2** Copias de seguridad/exportación de la base de datos local.
- **7.3** Privacidad: datos de alumnado (DNI/notas) solo en local, sin telemetría;
  documentar tratamiento LOPDGDD/RGPD.

### Fase 8 — Pruebas y QA

- **8.1** Unitarias (Vitest) del dominio e ingesta.
- **8.2** E2E (Playwright-Electron) del flujo: crear entrega → mapear RA/CE → calificar →
  generar informe.
- **8.3** Verificación de arranque limpio y sin `console.log` en producción.

---

## Dependencies

- **Runtime/UI:** Electron, electron-vite, Vue 3, TypeScript, Vue Router, Pinia.
- **Persistencia:** `better-sqlite3` (+`electron-rebuild`), plan B `sql.js`/`electron-store`.
- **Validación/parsing:** Zod, `gray-matter`, `markdown-it` (o parser propio).
- **Informes:** `printToPDF` nativo; opcional `exceljs`/`papaparse` para CSV/XLSX.
- **Empaquetado/tests:** `electron-builder`, Vitest, Playwright (Electron).
- **Datos externos:** texto del BOE (RD 686/2010 y RD 405/2023) para el `seed` de RA/CE.

---

## Risks

- **HIGH — Fidelidad al BOE:** transcribir RA/CE y pesos oficiales del módulo 0613
  (actualizado por RD 405/2023). *Mitigación:* extracción verbatim, campo editable, URL
  BOE citada y revisión del profesorado en Fase 0.
- **HIGH — Módulo nativo (`better-sqlite3`) en Electron:** el rebuild nativo puede fallar
  por plataforma/arquitectura. *Mitigación:* `electron-rebuild` + binarios precompilados;
  abstracción de repositorio con plan B `sql.js`/JSON.
- **MEDIUM — Modelo de ponderaciones:** cada profesor pondera distinto. *Mitigación:*
  pesos configurables con validación (suma = 100 %) y valores por defecto editables.
- **MEDIUM — Protección de datos del alumnado (RGPD/LOPDGDD):** DNI y notas son datos
  personales. *Mitigación:* almacenamiento exclusivamente local, sin nube/telemetría,
  exportación controlada, cifrado opcional en fase posterior.
- **MEDIUM — Fragilidad del parser de `docs2/`:** admonitions y `Tabs` personalizados
  pueden romper la extracción. *Mitigación:* parser tolerante + paso de revisión manual
  obligatorio antes de persistir.
- **LOW — Empaquetado/firma:** distribución macOS/Windows. *Mitigación:*
  `electron-builder`; firma notarizada se decide más adelante.
- **LOW — Coherencia con el repo:** evitar mezclar la app con el build de VitePress.
  *Mitigación:* carpeta y `package.json` independientes.

---

## Estimated Complexity

**HIGH.** Estimación orientativa para una persona: **4–6 semanas** (Fase 0–2 ~1,5 semanas;
Fase 3–5 ~2 semanas; Fase 6–8 ~1,5 semanas). La Fase 1 (esqueleto Electron) puede estar
operativa en **1–2 días**.

---

## Success Criteria

- [ ] App Electron arranca en local sin dependencias de red.
- [ ] RA/CE del módulo 0613 cargados desde el BOE y visibles en la app.
- [ ] Cada entrega se puede mapear a RA/CE con pesos.
- [ ] Se registran alumnos, entregas y notas por criterio.
- [ ] La nota final se calcula con ponderaciones validadas (suma 100 %).
- [ ] Se genera un informe final por alumno y por grupo en PDF y HTML, trazable al BOE.
- [ ] Cobertura de tests ≥ 80 % en dominio e ingesta.

---

## Decisiones confirmadas

| Punto | Decisión |
|---|---|
| Módulo BOE | **0613 — Desarrollo web en entorno servidor** (DAW). Fuente RA/CE: texto consolidado del **RD 405/2023** (`BOE-A-2023-13221`), que actualiza el **RD 686/2010**. |
| Renderer | **Vue 3 + TypeScript** (coherente con el VitePress del repo). |
| Persistencia | **SQLite con `better-sqlite3`** (+ `electron-rebuild`). |
| Ubicación | **`gestion-entregas/`** (nueva carpeta del repo, app independiente). |
| Informes | **PDF + HTML + CSV**. |

## Puntos a verificar antes de implementar

1. **Mapa unidad → RA (Fase 0.2):** la hipótesis
   `introduccion`→RA1, `php`→RA2, `aplicaciones_web`→RA3/RA4, `laravel`→RA5,
   `servicios_web`/`webs_dinamicas`/`hibridas`→RA6 es una suposición del planner.
2. **Ponderaciones por defecto:** ¿qué peso tiene cada RA en la nota final?
3. **Ubicación del repositorio:** el proyecto vive en `apuntes/gestion-entregas/`, como app
   independiente del repo de apuntes (`apuntes_daw_entorno_servidor/`).
4. **Alcance de la ingesta:** ¿se importan también `docs/` (tareas de evaluación) o solo
   `docs2/`?
