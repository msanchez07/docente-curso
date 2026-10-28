# Propuesta — Sección Alumnado del grupo

> **Implementada el 27/10/2026** con las decisiones acordadas. No hay borrado global:
> «quitar del grupo» conserva la ficha y el resto de matrículas.

## Decisiones acordadas

| Decisión             | Acuerdo                                          |
| -------------------- | ------------------------------------------------ |
| «Borrar» en el grupo | **Quitar del grupo**, sin borrar del sistema     |
| «Desactivar»         | **Mantiene la matrícula**; solo cambia el estado |
| Listado inicial      | **Todos**, con el estado visible                 |

## Propósito

Gestionar el alumnado **de un grupo concreto**: ver quién está matriculado, importar
listas, dar de alta a mano, corregir datos, desactivar y quitar del grupo.

La sección vive dentro del grupo: `/grupo/:id/alumnado`.

## Qué debe permitir

- Ver el alumnado del grupo, ordenado por apellidos y nombre.
- Buscar por nombre, apellidos, DNI o correo.
- Filtrar: activos, inactivos o todos.
- **Importar** JSON/CSV (la importación ya existe y no duplica por DNI, correo o nombre).
- **Alta manual** con nombre, apellidos, DNI, correo y estado.
- **Editar** los datos de una persona.
- **Desactivar / reactivar** sin perder su historial.
- **Quitar del grupo** (dejar de estar matriculado en este grupo).
- En su caso, **eliminar definitivamente** del sistema, con confirmación y aviso de que se
  pierden sus matrículas y notas.

## Qué no debe hacer

- No pone notas ni corrige entregas: eso es Calificaciones.
- No gestiona grupos: eso es `/grupos`.
- No duplica alumnado al importar o al darlo de alta si ya existe por DNI, correo o nombre.

## Datos

- `alumnos`: nombre, apellidos, DNI, correo, activo.
- `matriculas_clase`: relación alumno ↔ grupo.
- Un alumno puede estar en varios grupos. Quitarlo de uno no lo borra de los demás.
- Desactivar conserva la matrícula y el historial, pero lo saca de los listados activos.

## Interfaz

- Página propia, no modal.
- Tarjeta con:
  - cabecera: grupo, número de alumnos y estado;
  - barra: búsqueda, filtro, **Importar** y **Nuevo alumno**;
  - tabla: apellidos, nombre, DNI, correo, estado y acciones con iconos;
  - importación en panel desplegable (fichero o pegar JSON/CSV), como en Programación.
- Alta y edición en un modal pequeño (es un formulario corto).
- Acciones por fila: editar, desactivar/reactivar, quitar del grupo y, si se decide,
  eliminar definitivamente.

## Criterio de «hecho»

1. El grupo muestra su alumnado y el contador coincide con la barra lateral.
2. Se importa una lista y los nuevos aparecen; los repetidos no se duplican.
3. Se da de alta a una persona a mano y queda matriculada.
4. Se desactiva y desaparece del filtro de activos, pero sigue en «todos».
5. Se quita del grupo y deja de aparecer, sin afectar a otros grupos.
6. Se busca por apellidos o DNI y se encuentra.

## Decisiones a cerrar

Resueltas: quitar del grupo, desactivar manteniendo matrícula y listado inicial con todos.
