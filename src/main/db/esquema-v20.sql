-- Migración v20: evidencias (ficheros) asociadas a una entrega.
--
-- Son globales de la entrega: material, enunciados, entregas corregidas,
-- PDFs, imágenes… No se vinculan a un alumno concreto.

CREATE TABLE IF NOT EXISTS archivos_entrega_clase (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  entrega_id  INTEGER NOT NULL REFERENCES entregas_clase(id) ON DELETE CASCADE,
  categoria   TEXT NOT NULL DEFAULT 'material'
              CHECK (categoria IN ('material', 'solucion', 'apuntes', 'entrega', 'otro')),
  nombre      TEXT NOT NULL,
  tipo        TEXT NOT NULL,
  tamano      INTEGER NOT NULL,
  datos       TEXT NOT NULL,
  creado_en   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_archivos_entrega
  ON archivos_entrega_clase(entrega_id);
