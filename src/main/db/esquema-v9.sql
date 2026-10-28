-- Migración v9: curso al que pertenece cada módulo.
--
-- El formulario de grupos solo debe ofrecer los módulos del curso elegido
-- (un módulo de 2º no puede darse en 1º). El curso se guarda como dato del
-- módulo para poder filtrar y validar.

ALTER TABLE modulos ADD COLUMN curso TEXT CHECK (curso IN ('1', '2'));
