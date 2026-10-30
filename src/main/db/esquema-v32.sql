-- Migración v32: calificación por unidades didácticas.
--
-- Permite elegir entre el cálculo por evaluaciones/trimestres (actual) y un
-- cálculo por unidades. Cada unidad tiene un peso y las entregas se asignan
-- manualmente a una unidad desde su formulario.

ALTER TABLE unidades_programacion ADD COLUMN peso REAL NOT NULL DEFAULT 0;

ALTER TABLE entregas_clase
  ADD COLUMN unidad_id INTEGER REFERENCES unidades_programacion(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_entregas_clase_unidad
  ON entregas_clase(unidad_id);
