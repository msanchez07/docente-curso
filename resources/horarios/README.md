# Catálogo de secuenciación y horarios

Datos oficiales de **secuenciación y carga horaria** de los ciclos formativos de
Formación Profesional de la Comunitat Valenciana para el curso **2026/2027**.

## Fuente

- [Dosier ciclos · CEICE](https://ceice.gva.es/es/web/formacion-profesional/dossier-cicles)
- PDFs de **Secuenciación y horarios** de 1º y 2º curso de Grado Básico, Grado
  Medio y Grado Superior.

El catálogo combina el PDF de 1º curso para los módulos de primer curso y el de
2º curso para los de segundo. Cada ciclo guarda nivel, familia profesional,
abreviatura, curso académico y sus módulos con horas semanales y anuales.

## Regenerar

```bash
python3 scripts/horarios_parse.py
```

Requiere `pdftotext` (poppler). El script descarga los seis PDFs, extrae las
tablas y escribe `resources/horarios/catalogo-2026-27.json`.

## Uso en la aplicación

Al arrancar, el proceso principal siembra `catalogo_ciclos` y
`catalogo_modulos`. La vista **Grupos → Nuevo grupo** usa ese catálogo para
buscar y filtrar ciclos y módulos. Las filas de `ciclos` y `modulos` se crean
solo cuando se guarda un grupo que las necesita, de modo que la sección del BOE
sigue conteniendo únicamente los ciclos con RA/CE cargados.
