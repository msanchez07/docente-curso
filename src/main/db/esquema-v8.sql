-- Migración v8: siglas de los módulos.
--
-- Las siglas se usan para nombrar los grupos («2º DAW · DWES · Presencial»).
-- Se guardan como dato del módulo para poder corregirlas sin tocar código.

ALTER TABLE modulos ADD COLUMN siglas TEXT;
