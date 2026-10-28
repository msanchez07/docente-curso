-- Migración v18: rúbrica adjunta como fichero.
--
-- Se guarda un JSON con { nombre, tipo, datos } donde `datos` es base64 sin
-- prefijo data:. La rúbrica de texto sigue en la columna `rubrica`.

ALTER TABLE entregas_clase ADD COLUMN rubrica_archivo TEXT;
