# Propuesta — Criterios de evaluación por grupo

> Versión 3, implementada el 27 oct 2026 con las decisiones acordadas.
> Objetivo: definir, para cada grupo, **cómo se calcula la nota** a partir de las
> entregas, sin mezclarlo con los RA/CE oficiales del BOE.

## Decisiones acordadas

| Decisión                       | Acuerdo                                                                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Qué se configura               | **Pesos y mínimos** (no se seleccionan CE aquí)                                                                            |
| Pesos de categoría             | **Iguales en las tres avaluaciones**                                                                                       |
| Media de categoría             | **Simple** (todas las entregas pesan igual)                                                                                |
| Mínimos                        | **Bloqueantes**: suspenden categoría, avaluación o módulo                                                                  |
| Nota del acta                  | Se muestran dos decimales, pero el acta va **redondeada al entero** (7,5 → 8)                                              |
| Convocatorias                  | La extraordinaria y la pérdida de evaluación continua **se incluyen ahora**                                                |
| Extraordinaria                 | Se recuperan **solo las avaluaciones suspensas**, manteniendo las aprobadas                                                |
| Pérdida de evaluación continua | Examen **global** de todo el módulo                                                                                        |
| Copia de criterios             | A los demás grupos del **mismo módulo**                                                                                    |
| Plantillas                     | Se crean **desde un grupo** y se llaman «Plantilla &lt;nombre del grupo&gt;»; se aplican solas al mismo módulo y modalidad |

En la interfaz la sección se llamará **«Criterios»**, para no confundirla con los CE del
BOE. En la documentación se puede precisar «criterios de calificación».

Las **plantillas** son criterios reutilizables: se crean desde un grupo, toman su nombre
(«Plantilla 2º DAW · DWES · Presencial») y un grupo nuevo del mismo módulo y modalidad las
usa automáticamente. El botón **Plantillas** de la barra lateral permite listarlas y
editarlas.

## 1. Qué configuramos y qué no

Conviene separar dos cosas que suenan parecido:

| Concepto                                                          | Quién lo define | Dónde se ve                        |
| ----------------------------------------------------------------- | --------------- | ---------------------------------- |
| **RA y CE** (resultados de aprendizaje y criterios de evaluación) | BOE             | Acción «Consultar RA/CE» del grupo |
| **Criterios de calificación del grupo**                           | Profesorado     | Esta sección                       |

Los RA/CE son el contenido oficial y no se editan. Lo que sí se define por grupo es
**cuánto pesa cada cosa y qué mínimos hay que cumplir** para calcular la nota.

## 2. Estructura propuesta

Para cada grupo se guarda un modelo con tres bloques:

### A. Avaluaciones

| Avaluación          | Peso por defecto |
| ------------------- | ---------------- |
| 1ª evaluación (AV1) | 33 %             |
| 2ª evaluación (AV2) | 33 %             |
| 3ª evaluación (AV3) | 34 %             |

- Se pueden añadir, renombrar, cambiar el peso y quitar.
- La suma debe ser **exactamente 100 %**.
- El peso de AV3 podrá ajustarse si cambia por la formación en empresa.

> **Acordado:** los pesos de categoría son los mismos en las tres avaluaciones. Lo que
> cambia entre avaluaciones es **qué entregas hay** en cada categoría.

### B. Categorías

Son los tipos de entrega que componen cada avaluación.

**Presencial (por defecto):**

| Categoría   | Peso |
| ----------- | ---- |
| Exámenes    | 50 % |
| Actividades | 25 % |
| Proyectos   | 25 % |

**Semipresencial (por defecto):**

| Categoría              | Peso |
| ---------------------- | ---- |
| Exámenes               | 70 % |
| Actividades evaluables | 30 % |

- Se pueden añadir, renombrar, cambiar el peso y quitar.
- La suma debe ser **exactamente 100 %**.
- Cada entrega se ubicará después en **una avaluación** y **una categoría**.

### C. Requisitos mínimos

| Requisito                      | Valor por defecto | Efecto                                       |
| ------------------------------ | ----------------- | -------------------------------------------- |
| Nota mínima de cada entrega    | 4                 | Una entrega por debajo suspende su categoría |
| Media mínima de cada categoría | 5                 | La avaluación queda suspensa                 |
| Nota mínima de cada avaluación | 5                 | Se va a convocatoria ordinaria               |
| Nota final de aprobado         | 5                 | Aprueba o no el módulo                       |

- Los cuatro son editables.
- En esta primera versión no se añaden requisitos nuevos; los cuatro conocidos son los
  que aplica el cálculo.

## 3. Cálculo

```
nota de entrega      = 0–10 (directa o media ponderada de sus CE)
nota de categoría    = media simple de las entregas de esa categoría en la avaluación
nota de avaluación   = Σ (peso de categoría × nota de categoría)
nota final           = Σ (peso de avaluación × nota de avaluación)
```

Reglas:

- Una entrega **sin corregir cuenta como 0**.
- Si una categoría **no tiene entregas** en una avaluación, su peso se reparte entre las
  que sí tienen (renormalización) y se avisa.
- Una entrega por debajo del mínimo **suspende su categoría** (bloqueante).
- Una categoría por debajo del mínimo **suspende la avaluación** (bloqueante).
- Una avaluación por debajo del mínimo deja el módulo **«a convocatoria»** (bloqueante).
- La nota final se muestra con dos decimales; el **acta se redondea al entero** (7,5 → 8,
  7,49 → 7). El redondeo se aplica solo al acta, no a los cálculos intermedios.

**Ejemplo**

AV1: Exámenes 7,0 · Actividades 8,0 · Proyectos sin entregas.
Al renormalizar 50/25 → 66,7/33,3: nota AV1 = 0,667 × 7 + 0,333 × 8 = **7,33**.

## 4. Convocatorias

### Pérdida de evaluación continua (PEC)

- Se marca **por alumno** en Calificaciones (no es un criterio del grupo).
- Se evalúa con un **examen global de todo el módulo** (0–10).
- La nota final es la del examen, con el mínimo de aprobado.
- No se mezcla con las avaluaciones.

### Convocatoria extraordinaria

- Alumnado con nota final inferior al mínimo o con alguna avaluación suspensa.
- Propuesta: **recuperar solo las avaluaciones suspensas**, manteniendo las aprobadas.
- Cada avaluación suspensa se recupera con un examen (0–10) y se aplica su peso.
- La nota final se recalcula con las avaluaciones aprobadas y las recuperadas.
- Si no se presenta, «No presentado».

En Criterios se configura:

- Nota mínima de aprobado (5 por defecto), común a la ordinaria y a la extraordinaria.
- La extraordinaria **recupera solo las avaluaciones suspensas**; las aprobadas se
  mantienen con su nota y su peso.
- La pérdida de evaluación continua se resuelve con un **examen global** y no se mezcla
  con las avaluaciones.

## 5. Interfaz propuesta

Una acción más en la fila del grupo: **Criterios** (icono de ajustes), con tooltip.

Abre una **vista propia** dentro del grupo, con el editor en una tarjeta y cuatro pestañas:

1. **Avaluaciones** — lista editable con pesos y suma en vivo.
2. **Categorías** — lista editable con pesos y suma en vivo.
3. **Mínimos** — los cuatro requisitos.
4. **Resumen** — la fórmula resultante, en texto claro, y el aviso de si los pesos cuadran.

En la barra superior de la sección:

- Indica qué plantilla se está aplicando (o que se usan los valores por defecto de la
  modalidad). **No se elige a mano.**
- Botón **Crear plantilla de este grupo**: guarda los criterios y crea o actualiza
  «Plantilla &lt;nombre del grupo&gt;».
- Estado: «Criterios guardados» / «Sin guardar».

La sección tiene un botón **Plantillas** (también en la barra lateral) para listar,
editar o borrar las plantillas creadas.

En la tabla de grupos se añade un indicador discreto bajo el nombre:
«Criterios definidos» o «Sin criterios».

## 6. Datos

Se guarda **por grupo**, porque el mismo módulo puede evaluarse distinto en presencial y
semipresencial.

Propuesta: una tabla con el modelo en JSON versionado, no tres tablas normalizadas.

```sql
CREATE TABLE criterios_grupo_clase (
  grupo_clase_id  INTEGER PRIMARY KEY REFERENCES grupos_clase(id) ON DELETE CASCADE,
  version         INTEGER NOT NULL DEFAULT 1,
  modelo          TEXT NOT NULL,   -- { avaluaciones, categorias, requisitos, convocatorias }
  actualizado_en  TEXT NOT NULL
);

CREATE TABLE plantillas_criterios (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre          TEXT NOT NULL UNIQUE,   -- «Plantilla 2º DAW · DWES · Presencial»
  modulo_codigo   TEXT NOT NULL REFERENCES modulos(codigo) ON DELETE CASCADE,
  modalidad       TEXT NOT NULL,
  modelo          TEXT NOT NULL,
  creado_en       TEXT NOT NULL,
  actualizado_en  TEXT NOT NULL,
  UNIQUE (modulo_codigo, modalidad)
);
```

Motivo: el modelo se edita y se guarda entero; no hace falta consultarlo por partes.
La plantilla se asocia al módulo y la modalidad del grupo del que nace, así que la
selección para un grupo nuevo es automática.

## 7. Validaciones

- Al menos una avaluación y una categoría.
- Pesos entre 0 y 100; sin duplicados de nombre.
- Sumas de **exactamente 100 %** en avaluaciones y categorías (sin tolerancia).
- No se puede guardar con la suma mal.
- Al cambiar la modalidad del grupo, sus criterios guardados no cambian solos; la
  plantilla de la nueva modalidad solo se aplica si el grupo todavía no tiene criterios.

## 8. Pendiente de decidir

1. **Tercera avaluación y formación en empresa**: ¿el peso de AV3 se ajusta a mano o hay
   una regla específica?
2. **Versiones de plantilla**: ahora hay una por módulo y modalidad; ¿hacen falta varias
   versiones con nombres distintos?
3. **Requisitos adicionales**: añadir mínimos propios que salgan en el informe sin afectar
   al cálculo.

## 9. Plan de implementación (siguiente iteración)

1. **Migración v11**: tabla `criterios_grupo_clase` con el modelo en JSON.
2. **Dominio**: reutilizar `ModeloEvaluacion`, `modeloPorDefecto` y `validarModelo`;
   añadir convocatorias (extraordinaria solo suspensas, PEC global) y redondeo del acta.
3. **Repositorio**: obtener, guardar y copiar criterios a grupos del mismo módulo.
4. **IPC y preload**: canales `criterios:obtener`, `criterios:guardar`,
   `criterios:copiar`.
5. **UI**: acción «Criterios» con icono de ajustes en la fila del grupo; diálogo con
   pestañas Avaluaciones / Categorías / Mínimos / Resumen; suma en vivo; plantilla por
   modalidad.
6. **Tabla de grupos**: indicador «Criterios definidos» / «Sin criterios».
7. **Pruebas**: plantillas, validación de sumas, persistencia, copia, bloqueo de mínimos,
   extraordinaria y PEC.
8. **Previsualización web**: persistencia en `localStorage` con el mismo modelo.

## 10. Fuera de alcance de esta iteración

- Entregas y notas reales (se harán en su sección).
- Selección de CE por categoría.
- Informes con el modelo aplicado.
