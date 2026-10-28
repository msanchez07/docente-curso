-- Migración v12: plantillas de criterios creadas desde un grupo.
--
-- Una plantilla se asocia al módulo y la modalidad del grupo del que nace.
-- Los grupos nuevos con ese módulo y modalidad la usan automáticamente.

CREATE TABLE IF NOT EXISTS plantillas_criterios (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre          TEXT NOT NULL UNIQUE,
  modulo_codigo   TEXT NOT NULL REFERENCES modulos(codigo) ON DELETE CASCADE,
  modalidad       TEXT NOT NULL CHECK (modalidad IN ('presencial', 'semipresencial')),
  modelo          TEXT NOT NULL,
  creado_en       TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (modulo_codigo, modalidad)
);

CREATE INDEX IF NOT EXISTS idx_plantillas_modulo ON plantillas_criterios(modulo_codigo);
