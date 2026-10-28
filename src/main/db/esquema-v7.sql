-- Migración v7: grupos de clase (FP).
--
-- A partir de ahora la unidad de trabajo de la aplicación es la clase de FP
-- en la que se imparte un módulo: ciclo + curso + modalidad + módulo.
-- Convive con la tabla `grupos` (grupo de módulo) mientras el resto de
-- secciones se van incorporando.

CREATE TABLE IF NOT EXISTS grupos_clase (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  ciclo_id       TEXT NOT NULL REFERENCES ciclos(id) ON DELETE CASCADE,
  curso          TEXT NOT NULL CHECK (curso IN ('1', '2')),
  modalidad      TEXT NOT NULL CHECK (modalidad IN ('presencial', 'semipresencial')),
  modulo_codigo  TEXT NOT NULL REFERENCES modulos(codigo) ON DELETE CASCADE,
  nombre         TEXT NOT NULL,
  creado_en      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (ciclo_id, curso, modalidad, modulo_codigo)
);

CREATE INDEX IF NOT EXISTS idx_grupos_clase_ciclo ON grupos_clase(ciclo_id);
CREATE INDEX IF NOT EXISTS idx_grupos_clase_modulo ON grupos_clase(modulo_codigo);
