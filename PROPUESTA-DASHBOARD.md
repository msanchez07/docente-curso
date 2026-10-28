# Propuesta — El grupo como eje: barra de grupos + dashboard

> Cambio de estructura de la interfaz. **Implementado el 27/10/2026** con las
> decisiones acordadas: todos los grupos en la barra, dashboard con «Ahora» y alertas,
> cambio ahora y Criterios como sección propia.

## Decisiones acordadas

| Decisión                | Acuerdo                                               |
| ----------------------- | ----------------------------------------------------- |
| Barra izquierda         | **Todos los grupos**, con el activo resaltado         |
| Prioridad del dashboard | **Ahora + alertas**, después estado y accesos         |
| Cuándo                  | **Ahora**, antes de Alumnado                          |
| Criterios               | **Sección propia** (`/grupo/:id/criterios`), no modal |

## Diagnóstico

Ahora la app tiene una sola sección («Grupos») y dentro de cada fila se abren modales o
vistas sueltas. Funciona para probar, pero según se añadan Alumnado, Entregas,
Calificaciones e Informes, el grupo se perderá de vista.

El grupo (módulo + curso + modalidad) es la unidad de todo:

- tiene alumnado,
- tiene criterios,
- tiene programación,
- tendrá entregas, notas e informes.

Por eso la navegación debe ser **grupo → secciones del grupo**, no «secciones globales con
un selector de grupo».

## Estructura propuesta

```
┌──────────────────────┬──────────────────────────────────────────────┐
│ Curso DAW            │  Dashboard del grupo                         │
│                      │                                              │
│ GRUPOS               │  2º DAW · DWES · Presencial                  │
│ ▸ 2º DAW · DWES · P. │  DWES · DAW 2º · Presencial · 3 alumnos      │
│ ▸ 1º DAW · PROG · P. │                                              │
│ ▸ 2º DAW · DWES · S. │  [ Ahora ]  [ Estado ]  [ Alertas ]          │
│                      │                                              │
│ + Nuevo grupo        │  Quincena 27/10 – 11/11                      │
│                      │  ...resumen de los próximos días...          │
│ Plantillas           │                                              │
│                      │  Accesos: Programación · Alumnado ·          │
│                      │  Criterios · RA/CE · Entregas · Notas        │
└──────────────────────┴──────────────────────────────────────────────┘
```

### Barra izquierda

- Lista de **todos los grupos**, con el activo resaltado.
- Cada grupo muestra siglas y un punto de estado (criterios definidos / pendiente).
- Acción **+ Nuevo grupo**.
- **Plantillas** queda como acceso global, fuera de los grupos.
- En ventanas estrechas, la lista se convierte en un selector desplegable.

### Centro: dashboard del grupo

No es un muro de widgets. Prioridad:

1. **Cabecera del grupo**
   - Nombre, módulo, curso, modalidad.
   - Chips: alumnado, criterios definidos, RA/CE.
   - Acciones rápidas: importar alumnado, editar grupo.

2. **Ahora**
   - La quincena actual de programación (hoy → hoy + 15 días).
   - Primeros días con contenido y desviaciones.
   - Enlace a la programación completa.

3. **Estado**
   - Alumnos matriculados.
   - Criterios: definidos o sin definir.
   - RA/CE del módulo.
   - Entregas, nota media, calificaciones e informes.

4. **Alertas**
   - Sin criterios definidos.
   - Sin alumnado.
   - Días de la quincena sin contenido.
   - Entregas sin corregir (cuando existan).

5. **Accesos**
   - Programación, Alumnado, Criterios, RA/CE, Entregas, Calificaciones, Informes.
   - Todas las secciones están activas.

## Rutas

```
/grupo/:id                  → dashboard
/grupo/:id/programacion     → programación de aula
/grupo/:id/alumnado         → alumnado
/grupo/:id/criterios        → criterios (hoy modal; más adelante ruta)
/grupo/:id/entregas         → implementada
/grupo/:id/calificaciones   → implementada
/grupo/:id/informes         → implementada
/grupos                     → gestión de grupos (crear, editar, borrar)
/plantillas                 → plantillas globales
```

- El grupo activo se deduce de la URL, no de un estado global: permite enlaces directos.
- `/programacion/:id` redirige a `/grupo/:id/programacion`.

## Qué se reutiliza

- `GruposView` sigue existiendo como **gestión de grupos** (alta, edición, borrado,
  importación de alumnado).
- `ProgramacionView` pasa a ser una sección del grupo.
- Los modales de Criterios y Plantillas se mantienen al principio; se pueden convertir en
  rutas cuando el dashboard los necesite.
- El alumnado, entregas, etc. se construirán directamente como secciones del grupo.

## Fases

1. **Layout**: barra lateral con grupos + rutas `/grupo/:id` + dashboard vacío.
2. **Dashboard real**: cabecera, quincena, estado y accesos.
3. **Programación** dentro del grupo y tarjeta «Ahora».
4. **Alumnado** como sección (listado, borrar, desactivar; la importación ya existe).
5. **Criterios** como tarjeta/sección del grupo.
6. **Entregas, Calificaciones e Informes** cuando se aborden.

## Decisiones pendientes

Ninguna de las cuatro decisiones iniciales. Quedan para más adelante:

1. Valorar si la barra necesita buscador cuando haya muchos grupos.
2. Llevar Plantillas también a una ruta propia si crece.
3. Añadir un acceso directo a RA/CE desde el dashboard.
