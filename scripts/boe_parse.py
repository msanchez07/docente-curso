#!/usr/bin/env python3
"""Extrae los módulos, RA y CE del ciclo DAW desde el texto consolidado del BOE.

Fuente: RD 686/2010 (BOE-A-2010-9269), texto consolidado, que incorpora la
actualización del RD 405/2023 (BOE-A-2023-13221).

Salida: JSON con la estructura genérica
    { ciclo, modulos: [ { codigo, nombre, ects, horas, ra: [ { codigo, descripcion, ce: [...] } ] } ] }

Uso:
    boe_parse.py <xml_consolidado> <salida.json>
"""
import json
import re
import sys
import xml.etree.ElementTree as ET


def texto_parrafos(xml_path):
    root = ET.parse(xml_path).getroot()
    return [(p.text or "").strip() for p in root.iter("p")]


RE_MODULO = re.compile(r"^Módulo [Pp]rofesional:\s*(.+?)\.?$")
RE_ECTS = re.compile(r"^Equivalencia en créditos ECTS:\s*(\d+)")
RE_CODIGO = re.compile(r"^Código:\s*([0-9]{4})")
RE_RA = re.compile(r"^(\d+)\.\s+(.+)$")
RE_CE = re.compile(r"^([a-zñ])\)\s+(.+)$")
RE_DURACION = re.compile(r"^Duración:\s*(\d+)\s*horas")
FIN_RA_CE = ("Duración:", "Contenidos básicos:", "Orientaciones pedagógicas.")

# Siglas con las que se nombran los grupos («2º DAW · DWES · Presencial»).
# Se guardan como dato del módulo para poder corregirlas sin tocar código.
SIGLAS = {
    "0373": "LMSGI",
    "0483": "SI",
    "0484": "BD",
    "0485": "PROG",
    "0487": "ED",
    "0612": "DWEC",
    "0613": "DWES",
    "0614": "DESPL",
    "0615": "DIW",
    "0616": "PROY",
    "0617": "FOL",
    "0618": "EIE",
    "0619": "FCT",
}

# Curso del ciclo en el que se imparte cada módulo (1º o 2º).
CURSOS = {
    "0373": "1",
    "0483": "1",
    "0484": "1",
    "0485": "1",
    "0487": "1",
    "0617": "1",
    "0612": "2",
    "0613": "2",
    "0614": "2",
    "0615": "2",
    "0616": "2",
    "0618": "2",
    "0619": "2",
}


def parse_modulos(paras):
    modulos = []
    actual = None
    en_ra_ce = False
    ra_actual = None

    def cerrar():
        nonlocal actual, ra_actual, en_ra_ce
        if actual:
            modulos.append(actual)
        actual, ra_actual, en_ra_ce = None, None, False

    for tx in paras:
        if not tx:
            continue

        m = RE_MODULO.match(tx)
        if m:
            # Nuevo módulo (los datos se completan en las líneas siguientes)
            if actual and actual.get("codigo"):
                modulos.append(actual)
            actual = {"nombre": m.group(1).strip(), "codigo": None, "siglas": None,
                      "curso": None, "ects": None, "horas_minimas_boe": None, "ra": []}
            ra_actual, en_ra_ce = None, False
            continue

        if actual is None:
            continue

        m = RE_CODIGO.match(tx)
        if m and actual["codigo"] is None:
            actual["codigo"] = m.group(1)
            actual["siglas"] = SIGLAS.get(m.group(1))
            actual["curso"] = CURSOS.get(m.group(1))
            continue

        m = RE_ECTS.match(tx)
        if m and actual["ects"] is None:
            actual["ects"] = int(m.group(1))
            continue

        if tx.startswith("Resultados de aprendizaje y criterios de evaluación"):
            en_ra_ce = True
            continue

        if en_ra_ce:
            m = RE_DURACION.match(tx)
            if m:
                actual["horas_minimas_boe"] = int(m.group(1))
                en_ra_ce = False
                continue
            if tx.startswith(FIN_RA_CE):
                en_ra_ce = False
                continue
            if tx.startswith("Criterios de evaluación"):
                continue
            m = RE_CE.match(tx)
            if m and ra_actual is not None:
                ra_actual["ce"].append({"codigo": m.group(1), "descripcion": m.group(2).strip()})
                continue
            m = RE_RA.match(tx)
            if m:
                ra_actual = {"codigo": f"RA{m.group(1)}",
                             "numero": int(m.group(1)),
                             "descripcion": m.group(2).strip(),
                             "ce": []}
                actual["ra"].append(ra_actual)
                continue

    if actual and actual.get("codigo"):
        modulos.append(actual)

    return [m for m in modulos if m["codigo"]]


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    xml_in, json_out = sys.argv[1], sys.argv[2]
    modulos = parse_modulos(texto_parrafos(xml_in))

    ciclo = {
        "id": "daw",
        "denominacion": "Desarrollo de Aplicaciones Web",
        "nivel": "Formación Profesional de Grado Superior",
        "familia_profesional": "Informática y Comunicaciones",
        "duracion_horas": 2000,
        "ects": 120,
        "rd": "RD 686/2010, de 20 de mayo",
        "rd_actualizacion": "RD 405/2023, de 29 de mayo",
        "boe_url": "https://www.boe.es/buscar/act.php?id=BOE-A-2010-9269",
        "boe_url_actualizacion": "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2023-13221",
        "modulos": modulos,
    }

    with open(json_out, "w", encoding="utf-8") as f:
        json.dump(ciclo, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"✔ {len(modulos)} módulos → {json_out}")
    for m in modulos:
        n_ce = sum(len(r['ce']) for r in m['ra'])
        print(f"   {m['codigo']}  {m['nombre'][:52]:<52} RA={len(m['ra']):>2}  CE={n_ce:>3}  {m['horas_minimas_boe']}h")


if __name__ == "__main__":
    main()
