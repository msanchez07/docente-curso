# Datos BOE de los ciclos formativos

Datos oficiales de los **181 ciclos** del catálogo de horarios 2026-27 de la
Comunitat Valenciana, generados a partir del
[Dosier de ciclos de FP](https://ceice.gva.es/es/web/formacion-profesional/dossier-cicles)
de la Conselleria.

Cada ficha del dosier enlaza el Real Decreto del título (BOE) y el decreto
autonómico de currículo (DOGV). El importador descarga esos enlaces, extrae los
módulos, RA y CE, y los cruza con `resources/horarios/catalogo-2026-27.json`.

## Generar o actualizar los datos

```bash
python3 scripts/importar_curriculos.py
python3 scripts/importar_curriculos.py --ids gm-gestion-administrativa --force
```

El script cachea las descargas en el directorio temporal del sistema. Para los
RDs antiguos que el BOE publica como imágenes usa `pdftotext -raw`; si el PDF
tampoco tiene capa de texto, ese ciclo queda con los módulos que sí se hayan
podido extraer.

## Cobertura actual

- 181 ciclos con al menos parte de sus RA/CE.
- 2.467 de 2.991 módulos con RA/CE (82,5 %).
- 14.282 RA y 105.927 CE en los ficheros por ciclo.
- La tabla completa está en [`COBERTURA.md`](./COBERTURA.md).

Los ciclos de FP Básica y algunos títulos antiguos tienen cobertura parcial:
los ámbitos `3161`–`3164`, el proyecto intermodular de FP Básica y algunos
módulos optativos no tienen RA/CE en los enlaces publicados en el dosier.

## Ficheros

- Un JSON por ciclo: `resources/boe/<id>.json`.
- `COBERTURA.md`: módulos con y sin RA/CE por ciclo.
- `daw.json`: se conserva el fichero original, ampliado con los módulos
  transversales y el proyecto de 1º.

## Estructura

```jsonc
{
  "id": "gm-gestion-administrativa",
  "denominacion": "Gestión Administrativa",
  "nivel": "Formación Profesional de Grado Medio",
  "familia_profesional": "Administración y Gestión",
  "duracion_horas": 2000,
  "ects": 120,
  "abreviatura": "GA",
  "rd": "Real Decreto 1631/2009, de 30 de octubre…",
  "boe_url": "https://www.boe.es/buscar/act.php?id=BOE-A-2009-19148",
  "modulos": [
    {
      "codigo": "0437",
      "nombre": "Comunicación empresarial y atención al cliente",
      "curso": "1",
      "ects": null,
      "horas_minimas_boe": 100,
      "siglas": null,
      "ra": [
        {
          "codigo": "RA1",
          "numero": 1,
          "descripcion": "…",
          "ce": [{ "codigo": "a", "descripcion": "…" }]
        }
      ]
    }
  ]
}
```

`duracion_horas` es la duración del ciclo; `horas_minimas_boe` es la duración
mínima que fija el BOE para cada módulo y no suma el total autonómico.
