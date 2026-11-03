-- Migración v39: pertenencia de módulos a ciclos.
--
-- `modulos.codigo` es único porque un módulo compartido (FOL, Inglés, IPE…)
-- tiene los mismos RA/CE en varios ciclos. Esta tabla guarda en qué ciclos se
-- imparte cada módulo sin duplicar sus RA/CE.

CREATE TABLE IF NOT EXISTS modulo_ciclos (
  ciclo_id      TEXT NOT NULL REFERENCES ciclos(id) ON DELETE CASCADE,
  modulo_codigo TEXT NOT NULL REFERENCES modulos(codigo) ON DELETE CASCADE,
  PRIMARY KEY (ciclo_id, modulo_codigo)
);

CREATE INDEX IF NOT EXISTS idx_modulo_ciclos_modulo
  ON modulo_ciclos(modulo_codigo);
