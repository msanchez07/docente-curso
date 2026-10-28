-- Migración v27: tutorías semanales de los grupos semipresenciales.
--
-- Cada día puede tener una hora de tutoría presencial colectiva y otra de
-- tutoría individual. Se guarda en el grupo, junto al horario semanal.

ALTER TABLE grupos_clase ADD COLUMN tutorias_semana TEXT NOT NULL DEFAULT '{}';
