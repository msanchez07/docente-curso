# Guía de uso · Docente Curso

> Guía viva de la aplicación. Debe actualizarse siempre que se añada, cambie o elimine una
> función relevante. Si algo no coincide con la aplicación, la guía está mal y hay que corregirla.

**Última actualización:** 31/10/2026  
**Versión verificada:** 208 tests, `typecheck`, `build` y `smoke` en verde.

---

## Índice

1. [Qué es y cómo se organiza](#1-qué-es-y-cómo-se-organiza)
2. [Puesta en marcha](#2-puesta-en-marcha)
3. [Navegación general](#3-navegación-general)
4. [Cursos y grupos](#4-cursos-y-grupos)
5. [Dashboards: curso y grupo](#5-dashboards-curso-y-grupo)
6. [Programación de aula](#6-programación-de-aula)
7. [Programación didáctica](#7-programación-didáctica)
8. [Alumnado y formación en empresa](#8-alumnado-y-formación-en-empresa)
9. [Entregas y evidencias](#9-entregas-y-evidencias)
10. [Criterios de calificación](#10-criterios-de-calificación)
11. [Calificaciones y convocatorias](#11-calificaciones-y-convocatorias)
12. [Control de faltas](#12-control-de-faltas)
13. [Informes](#13-informes)
14. [Copias de seguridad](#14-copias-de-seguridad)
15. [Normativa FP y datos de prueba](#15-normativa-fp-y-datos-de-prueba)
16. [Datos, privacidad y arquitectura](#16-datos-privacidad-y-arquitectura)
17. [Mantenimiento de esta guía](#17-mantenimiento-de-esta-guía)

---

## 1. Qué es y cómo se organiza

Aplicación local para gestionar el día a día de un curso de FP:

- grupos de clase;
- programación;
- alumnado y formación en empresa;
- entregas, evidencias y notas;
- criterios de calificación;
- convocatorias;
- informes;
- control de faltas;
- copias de seguridad.

El eje es el **grupo de clase**: un módulo, un curso, una modalidad y un curso académico.

No hay nube ni backend remoto: la base de datos y las exportaciones viven en el equipo del
docente.

---

## 2. Puesta en marcha

Requisitos: Node.js 20 o superior y npm.

```bash
npm install
npm run dev        # aplicación de escritorio
npm run dev:web    # previsualización web con API simulada
```

Comprobaciones de calidad:

```bash
npm run typecheck
npm test
npm run build
npm run smoke
npm run smoke:boe
```

Empaquetado:

```bash
npm run build:unpack
npm run build:mac
npm run build:win
npm run build:linux
```

---

## 3. Navegación general

### Barra lateral

- Selector de **curso académico**.
- Lista de grupos del curso activo.
- Acceso a **Gestionar grupos**, **Nuevo grupo** y **Opciones globales**.
- En Opciones globales: cursos, plantillas, control de faltas, copias, normativa y datos de
  prueba.

### Barra superior de grupo

Aparece en las vistas de un grupo y sustituye al antiguo botón «Volver»:

- **Dashboard**.
- **Día a día**: Programación, Horario, Faltas, Entregas y Calificaciones.
- **Consulta**: Alumnado, Programación didáctica e Informes.

Los grupos se separan con barras verticales finas. La opción activa queda resaltada.

### Acciones secundarias

Las operaciones que no son principales se agrupan en menús **Acciones** con iconos. Las acciones
principales (guardar, exportar PDF, nueva unidad, etc.) permanecen visibles.

### Guía integrada y ayuda contextual

- En **Opciones globales → Guía de uso** hay una guía completa con capturas reales de cada
  sección.
- En la barra superior de grupo, el botón **Ayuda** abre una explicación de la sección actual,
  con su captura y sus acciones principales.
- La guía completa y la ayuda usan el mismo contenido, así que se actualizan juntas.

### Avisos

Los guardados, errores y avisos aparecen como **notificaciones emergentes** en la parte superior
derecha. Se cierran solas o con la aspita.

### Opciones globales

El menú **Opciones globales** de la barra lateral reúne:

- **Gestionar grupos**.
- **Cursos académicos**.
- **Plantillas**.
- **Control de faltas**.
- **Copias de seguridad**.
- **Guía de uso**.
- **Normativa FP** e **Importar normativa**.
- **Restaurar/Eliminar datos de prueba**, solo en la previsualización web.

---

## 4. Cursos y grupos

- El curso académico se calcula por fecha (septiembre–julio) y puede cambiarse desde la barra
  lateral.
- Un grupo se crea con ciclo, módulo, curso y modalidad.
- El nombre se genera automáticamente, por ejemplo: `2º DAW · DWES · Presencial`.
- El horario se define con bloques de 55 minutos:
  - mañana 08:00–14:00, recreo 10:45–11:15;
  - tarde 14:40–21:05, recreo 18:00–18:20.
- En semipresencial se pueden marcar sesiones, tutorías colectivas y tutorías individuales.
- Los grupos se pueden renombrar, editar y borrar con confirmación.

---

## 5. Dashboards: curso y grupo

### Dashboard del curso

Es el **punto de entrada** de la aplicación. Toda la pantalla gira alrededor de un único
calendario con todos los módulos del curso activo:

- entregas, exámenes, evaluaciones y días no lectivos;
- etiquetas por módulo dentro de cada día, con enlace al dashboard del módulo;
- colores estables por módulo y leyenda de modalidad;
- filtros por módulo y tipo, detalle del día seleccionado y exportación a PDF/.ics;
- navegación mensual y botón Hoy;
- sin tablas de alumnado, colas de trabajo ni listados de módulos.

### Dashboard del grupo

El dashboard del grupo responde a tres preguntas:

1. **¿Qué pasa hoy?** Sesiones del día.
2. **¿Qué tengo que hacer?** Notas por poner y avisos de la cola de trabajo.
3. **¿Quién necesita atención?** Alumnado en riesgo.

Incluye:

- cabecera del grupo;
- resumen de hoy, pendiente de corregir y alumnado en riesgo;
- cola de trabajo con entregas pendientes y avisos;
- tabla de alumnado en riesgo;
- agenda con minicalendario mensual y próximas fechas;
- bloque plegable **Más información del grupo** con estado, formación en empresa y programación
  didáctica.

Los días festivos, no lectivos y vacaciones tienen prioridad visual roja. Las unidades didácticas
visibles por día usan colores estables.

---

## 6. Programación de aula

- Sesiones por fecha y hora, con varias sesiones por día.
- Vistas: Tarjetas, Tabla, Calendario, Unidades y **Calendario escolar**.
- El calendario escolar es una pestaña junto a Unidades.
- En la pestaña Calendario escolar, la barra superior de Programación mantiene la navegación
  mensual y la navegación propia del panel no se duplica.
- Las acciones secundarias están en **Acciones**:
  - cargar ejemplo;
  - importar programación;
  - descargar esquema.
- **Exportar PDF** genera el informe completo con fechas, horario y tutorías.
- Las unidades se gestionan en maestro-detalle:
  - sesiones;
  - RA y contenidos;
  - importación JSON y descarga de esquema.

---

## 7. Programación didáctica

Pestañas:

- Unidades.
- Fechas / evaluaciones.
- Criterios.
- RA/CE.
- Calendario.

La **presentación del módulo** es una plantilla HTML editable con datos reales del grupo. Se puede
previsualizar, copiar para Aules, descargar e imprimir/PDF.

---

## 8. Alumnado y formación en empresa

- Alta manual de alumnado.
- Importación JSON/CSV sin duplicar por DNI, correo o nombre y apellidos.
- Edición, activación/desactivación y desmatriculación.
- Ficha del alumno con notas, RA, entregas y evolución.
- Formación en empresa por periodos:
  - empresa;
  - fechas;
  - horas cuando corresponda.

Las FCT no registran faltas en el control de faltas.

---

## 9. Entregas y evidencias

Cada entrega se asocia obligatoriamente a:

- una unidad didáctica;
- una avaluación;
- una categoría;
- uno o varios RA/CE.

La ficha de entrega incluye:

- **Enunciado**.
- **Descripción del problema**.
- **Restricciones**.

Al abrir una entrega se muestra primero la **Ficha** y después la pestaña **Notas**.

Otras funciones:

- rúbrica en texto y/o archivo;
- evidencias clasificadas por tipo;
- bloqueo/desbloqueo de la entrega;
- notas decimales y anotaciones por alumno;
- exportación por entrega, avaluación o curso;
- PDF si solo hay texto/rúbrica;
- ZIP si hay archivos o PDF + archivos;
- previsualización en ventana propia antes de exportar.

---

## 10. Criterios de calificación

### Categorías generales

Las categorías son los instrumentos de calificación: exámenes, actividades, proyectos, etc.

- Cada categoría tiene un peso.
- La suma de los pesos generales debe ser exactamente 100 %.
- Una categoría sin entregas no hunde la nota: su peso se reparte entre las que sí tienen
  entregas.

### Pesos propios por trimestre

Cada trimestre puede usar los pesos generales o definir un **cálculo propio**:

1. Ir a **Criterios → Trimestres**.
2. Activar **Pesos propios** en el trimestre deseado.
3. Ajustar los porcentajes de sus categorías.

Ejemplo:

- pesos generales: exámenes 40 %, actividades 30 %, proyectos 30 %;
- 2.º trimestre: exámenes 50 %, proyectos 50 %, actividades 0 %.

Consecuencias:

- el trimestre se calcula con sus pesos propios;
- las categorías con peso 0 no penalizan ese trimestre;
- la suma de los pesos propios debe ser exactamente 100 %;
- la nota final sigue calculándose con los pesos de RA.

### RA

- Cada RA tiene un peso en la nota final.
- Por defecto se reparte el 100 % a partes iguales.
- La suma de los pesos de RA debe ser exactamente 100 %.
- La nota final es la media ponderada de las notas de RA.

### Mínimos

Se pueden configurar mínimos bloqueantes para:

- nota mínima de cada entrega;
- media mínima de cada categoría;
- nota mínima de cada avaluación;
- aprobado del módulo.

---

## 11. Calificaciones y convocatorias

Calificaciones es una vista de consulta: la nota final no se edita aquí, se calcula desde
entregas, categorías y RA.

Pestañas:

- cada trimestre;
- **Ordinaria**;
- **Extraordinaria**;
- **Final**.

En cada trimestre se muestra:

- nota del trimestre;
- categorías con su peso efectivo;
- entregas y notas;
- indicador **Cálculo propio** cuando el trimestre tiene pesos distintos a los generales.

En la pestaña Final:

- nota final;
- fórmula de pesos de RA;
- RA superados y pendientes;
- acceso al informe del alumno.

### Convocatorias

- Solo existe una convocatoria de cada tipo.
- Se crea automáticamente al abrir su pestaña.
- Se organizan por bloques de trimestre, unidad o RA/CE.
- Cada alumno recibe los bloques que le corresponden según lo suspenso.
- El profesor puede ajustar bloques y notas.
- Si se marca **Examen global**, su nota sustituye al resto de bloques y vale el 100 % de esa
  convocatoria.

---

## 12. Control de faltas

Vista de tutoría por curso, no por grupo.

### Configuración

- Contexto de curso compacto; el selector solo aparece si hay varios cursos/tutorías.
- Límite de faltas en un campo pequeño con `%`.
- Faltas justificadas mediante interruptor.
- Módulos en tarjetas:
  - nombre;
  - código;
  - nombre exacto de columna en el PDF de ITACA;
  - horas.

### Importación e historial

- Subida de PDFs de ITACA de varias páginas.
- El PDF no se guarda: se guardan las faltas extraídas.
- El **historial** está plegado por defecto y se abre con el botón **Historial (n)**.
- Al elegir un informe, el historial se cierra.
- El historial también se cierra al cambiar de curso.

### Tabla

- Una columna por módulo.
- Cabecera con código y nombre del módulo.
- Número de faltas en caja neutra.
- Porcentaje en píldora de color:
  - verde: correcto;
  - amarillo: aviso;
  - naranja: riesgo;
  - rojo: pérdida.
- Primera columna fija y filas alternas.
- Impresión/PDF del informe seleccionado.

---

## 13. Informes

Tipos:

- Resumen.
- Calificaciones.
- RA superados.

Se puede elegir todo el grupo o un alumno.

Incluyen:

- gráficas;
- RA y CE;
- formación en empresa;
- datos de alumnado;
- previsualización A4;
- impresión/PDF;
- descarga HTML/CSV desde **Acciones**;
- **Imprimir / PDF** como acción principal.

---

## 14. Copias de seguridad

- Carpeta raíz global configurable.
- Subcarpeta automática por curso académico.
- Un JSON autocontenido por grupo.
- Incluye alumnado, criterios, entregas, notas, evidencias, programación, unidades, eventos,
  formación y archivos en base64.
- Importación para restaurar solo un grupo.
- Aviso si la carpeta no está configurada o desaparece.
- Copia automática al abrir la aplicación si cambió el contenido de un grupo.

---

## 15. Normativa FP y datos de prueba

- Normativa FP a pantalla completa.
- Importación de normativa desde la barra lateral.
- En previsualización web:
  - restaurar datos de prueba;
  - eliminar datos de prueba con confirmación.

---

## 16. Datos, privacidad y arquitectura

- Electron + Vue 3 + TypeScript + Pinia + Vue Router.
- SQLite con `better-sqlite3` y migraciones versionadas.
- Vite/electron-vite.
- Vitest.
- JSZip para exportaciones.

Base de datos local:

```text
~/Library/Application Support/gestion-entregas/gestion-entregas.db   # macOS
```

La previsualización web usa `localStorage` y una API simulada. No hay backend remoto ni envío de
datos a servicios externos.

---

## 17. Mantenimiento de esta guía

Siempre que se haga un cambio relevante:

1. Actualizar la sección afectada de esta guía.
2. Actualizar `README.md` si cambia la funcionalidad principal.
3. Actualizar `RESUMEN-ITERACIONES.md` con la entrada de iteración y el recuento de tests.
4. Revisar que los nombres de menús, pestañas y botones coinciden con la interfaz real.
5. Regenerar las capturas si cambió la interfaz:
   ```bash
   npm run dev:web
   npm run capturar:guia
   ```
6. Ejecutar `typecheck`, `test`, `build` y `smoke`.
