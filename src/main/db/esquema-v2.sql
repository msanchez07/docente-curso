-- Migración v2: se elimina el concepto de «grupo» (no se utiliza).
--
-- Se reconstruye la tabla `alumnos` sin `grupo_id` y se elimina la tabla
-- `grupos`. Se hace con las claves ajenas desactivadas para poder recrear la
-- tabla padre sin romper las referencias de las tablas hijas.

PRAGMA foreign_keys = OFF;

CREATE TABLE alumnos_nuevo (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre    TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  dni       TEXT,
  email     TEXT,
  activo    INTEGER NOT NULL DEFAULT 1,
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO alumnos_nuevo (id, nombre, apellidos, dni, email, activo, creado_en)
  SELECT id, nombre, apellidos, dni, email, activo, creado_en FROM alumnos;

DROP TABLE alumnos;
ALTER TABLE alumnos_nuevo RENAME TO alumnos;

DROP TABLE IF EXISTS grupos;

PRAGMA foreign_keys = ON;
