# Datos del BOE (ciclos de Informática)

Datos oficiales de los ciclos de la familia **Informática y Comunicaciones**
incluidos en el catálogo de horarios 2026-27 de la Comunitat Valenciana.

Fuente de los enlaces: [Dosier de ciclos de FP](https://ceice.gva.es/es/web/formacion-profesional/dossier-cicles)
de la Conselleria.

## Ficheros JSON

| Fichero                                                  | Ciclo                                          | Norma principal           |
| -------------------------------------------------------- | ---------------------------------------------- | ------------------------- |
| `daw.json`                                               | Desarrollo de Aplicaciones Web                 | RD 686/2010 + RD 405/2023 |
| `gs-desarrollo-de-aplicaciones-multiplataforma.json`     | Desarrollo de Aplicaciones Multiplataforma     | RD 450/2010               |
| `gs-administracion-de-sistemas-informaticos-en-red.json` | Administración de Sistemas Informáticos en Red | RD 1629/2009              |
| `gm-sistemas-microinformaticos-y-redes.json`             | Sistemas Microinformáticos y Redes             | RD 1691/2007              |
| `gb-informatica-de-oficina.json`                         | Informática de Oficina                         | RD 356/2014 + RD 127/2014 |
| `gb-informatica-y-comunicaciones.json`                   | Informática y Comunicaciones                   | RD 127/2014 + RD 356/2014 |

## Enlaces oficiales

- [RD 450/2010 (DAM)](https://www.boe.es/buscar/act.php?id=BOE-A-2010-8067)
- [RD 1629/2009 (ASIR)](https://www.boe.es/buscar/act.php?id=BOE-A-2009-18355)
- [RD 1691/2007 (SMR)](https://www.boe.es/buscar/act.php?id=BOE-A-2008-819)
- [RD 127/2014 (FP Básica)](https://www.boe.es/buscar/act.php?id=BOE-A-2014-2360)
- [RD 356/2014 (FP Básica)](https://www.boe.es/buscar/act.php?id=BOE-A-2014-5591)

Módulos transversales de GM/GS: [Decreto 114/2025 (DOGV)](https://dogv.gva.es/datos/2025/08/04/pdf/2025_29742_es.pdf).
Itinerario personal para la empleabilidad de FP Básica: [Decreto 117/2025 (DOGV)](https://dogv.gva.es/datos/2025/08/13/pdf/2025_32763_es.pdf).

## Cobertura

- Los módulos profesionales de los títulos LOE (DAM, ASIR, SMR) tienen RA/CE
  completos.
- Los módulos transversales (Inglés, IPE, Digitalización, Sostenibilidad) se
  incorporan desde los anexos del Decreto 114/2025.
- En FP Básica se incorporan los módulos profesionales de los RD de 2014 y el
  IPE del Decreto 117/2025. Los ámbitos `3161`–`3164` y el proyecto intermodular
  no tienen RA/CE en los enlaces oficiales del dosier; quedan sin datos.
- Los módulos optativos y el proyecto de 1º sin norma estatal específica se
  mantienen en el ciclo con `ra: []`.

## Nota sobre las horas

`horas_minimas_boe` es la `Duración` que fija el BOE para cada módulo. No suma el
total del ciclo: el BOE fija las enseñanzas mínimas y cada comunidad autónoma
amplía la carga horaria hasta el total. Las horas reales del catálogo están en
`resources/horarios/catalogo-2026-27.json`.

## Estructura

La estructura es la misma que la del importador de currículos: un fichero JSON
por ciclo con `id`, `denominacion`, `nivel`, `familia_profesional`,
`duracion_horas`, `ects`, `rd`, `boe_url` y `modulos[]`; cada módulo contiene
`ra[]` y cada RA contiene `ce[]`.
