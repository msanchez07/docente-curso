# Datos del BOE (ciclo DAW)

Fuentes oficiales descargadas y usadas para generar los datos del ciclo.

## Ficheros

| Fichero | Qué es |
|---|---|
| `BOE-A-2023-13221.html` / `.xml` | RD 405/2023, de 29 de mayo, que **actualiza** los títulos de DAM y DAW. |
| `BOE-A-2010-9269-consolidado.html` / `.xml` | RD 686/2010, de 20 de mayo (**texto consolidado**), que establece el título de Técnico Superior en Desarrollo de Aplicaciones Web. Ya incorpora la actualización del RD 405/2023. |
| `daw.json` | Datos extraídos: ciclo DAW completo (13 módulos) con RA y CE. |

## URLs oficiales

- RD 405/2023 (original): <https://www.boe.es/diario_boe/txt.php?id=BOE-A-2023-13221>
- RD 686/2010 (consolidado): <https://www.boe.es/buscar/act.php?id=BOE-A-2010-9269>

## Por qué dos normas

El RD 405/2023 **no redefine el título entero**: solo sustituye el articulado y el
anexo I (módulos profesionales) de dos títulos ya existentes. Para el ciclo DAW
redefine 9 módulos (0483, 0484, 0485, 0373, 0487, 0612, 0613, 0614, 0615). Los
restantes (0616 Proyecto, 0617 FOL, 0618 EIE, 0619 FCT) siguen vigentes desde el
RD 686/2010. Por eso la fuente del ciclo completo es el **texto consolidado del
RD 686/2010**, que ya integra ambos.

## Regenerar `daw.json`

```bash
python3 scripts/boe_parse.py \
  resources/boe/BOE-A-2010-9269-consolidado.xml \
  resources/boe/daw.json
```

## Estructura de `daw.json`

```jsonc
{
  "id": "daw",
  "denominacion": "Desarrollo de Aplicaciones Web",
  "nivel": "Formación Profesional de Grado Superior",
  "familia_profesional": "Informática y Comunicaciones",
  "duracion_horas": 2000,
  "ects": 120,
  "rd": "RD 686/2010, de 20 de mayo",
  "rd_actualizacion": "RD 405/2023, de 29 de mayo",
  "boe_url": "…",
  "boe_url_actualizacion": "…",
  "modulos": [
    {
      "codigo": "0613",
      "nombre": "Desarrollo Web en entorno servidor",
      "ects": 12,
      "horas_minimas_boe": 100,
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

La estructura es **genérica**: admite varios ciclos (un fichero JSON por ciclo, o un
array de ciclos) sin cambiar el modelo de datos.

## Nota sobre las horas

`horas_minimas_boe` es la `Duración` que fija el BOE para cada módulo. **No suma el
total del ciclo** (1100 h frente a las 2000 h del título): el BOE fija las
*enseñanzas mínimas* y cada comunidad autónoma amplía la carga horaria hasta el
total. Si la app necesita las horas reales de un centro, deben cargarse aparte.
