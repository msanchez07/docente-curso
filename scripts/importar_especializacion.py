#!/usr/bin/env python3
"""Importa los cursos de especialización de FP de la Comunitat Valenciana.

Fuente: dosier de cursos de especialización de la Conselleria y los RDs que
enlaza cada ficha. Genera:
  - resources/boe/ce-<slug>.json
  - resources/horarios/cursos-especializacion-2026-27.json
  - resources/boe/COBERTURA-ESPECIALIZACION.md
"""
from __future__ import annotations

import hashlib
import html
import json
import re
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import importar_curriculos as base

RAIZ = Path(__file__).resolve().parent.parent
DIR_JSON = RAIZ / "resources" / "boe"
DIR_HORARIOS = RAIZ / "resources" / "horarios"
DOSIER_CE = "https://ceice.gva.es/es/web/formacion-profesional/dossier-de-cursos-d-especialitzacio"
NIVEL = {
    "Medio": "Curso de Especialización de Grado Medio",
    "Superior": "Curso de Especialización de Grado Superior",
}


def texto(fragmento: str) -> str:
    return " ".join(html.unescape(re.sub(r"<[^>]+>", " ", fragmento)).split())


def slug(texto_original: str) -> str:
    limpio = unicodedata.normalize("NFKD", texto_original).encode("ascii", "ignore").decode()
    limpio = re.sub(r"[^a-z0-9]+", "-", limpio.lower()).strip("-")
    return re.sub(r"-+", "-", limpio)


def abreviatura(nombre: str) -> str:
    omitir = {"de", "del", "la", "las", "el", "los", "en", "y", "e", "para", "con", "por", "a"}
    palabras = [p for p in re.findall(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+", nombre) if p.lower() not in omitir]
    siglas = "".join(p[0].upper() for p in palabras if p)
    return (siglas or "CE")[:8]


BOE_MANUAL_CE = {
    "Recursos y servicios en la nube": ["BOE-A-2026-4673"],
}

CURSOS_MANUALES = {
    "Posicionamiento en buscadores (SEO/SEM) y comunicación en redes sociales": {
        "familia": "Comercio y Marketing",
        "grado": "Superior",
        "duracion": 710,
        "boe_ids": ["BOE-A-2024-3537"],
        "modulos": [
            {"codigo": "5110", "nombre": "Estrategia digital básica", "horas_anuales": 60, "horas_semanales": None},
            {"codigo": "5111", "nombre": "Gestión del posicionamiento y la comunicación online", "horas_anuales": 60, "horas_semanales": None},
            {"codigo": "5112", "nombre": "Posicionamiento orgánico en buscadores (SEO)", "horas_anuales": 75, "horas_semanales": None},
            {"codigo": "5113", "nombre": "Posicionamiento de pago en buscadores (SEM)", "horas_anuales": 100, "horas_semanales": None},
            {"codigo": "5114", "nombre": "Comunicación en redes sociales", "horas_anuales": 60, "horas_semanales": None},
        ],
    },
}


def enlaces_dosier() -> list[dict]:
    archivo = base.descargar(DOSIER_CE, "dossier-ce.html")
    contenido = archivo.read_text(encoding="utf-8", errors="replace")
    cursos: dict[str, dict] = {}
    for fila in re.findall(r"<tr[^>]*>(.*?)</tr>", contenido, re.S):
        celdas = re.findall(r"<td[^>]*>(.*?)</td>", fila, re.S)
        if len(celdas) != 4:
            continue
        familia = texto(celdas[1])
        for nivel, celda in zip(("Medio", "Superior"), celdas[2:4]):
            for href, etiqueta in re.findall(
                r"<a[^>]+href=\"([^\"]+)\"[^>]*>(.*?)</a>", celda, re.S
            ):
                if "/publicador-de-cursos-especialitzacio/" not in href or "/content/" not in href:
                    continue
                url = html.unescape(href).strip().split("?")[0]
                if not url.startswith("http"):
                    url = "https://ceice.gva.es" + url
                nombre = texto(etiqueta)
                cursos.setdefault(url, {
                    "familia": familia,
                    "nivel": nivel,
                    "nombre": nombre,
                    "url": url,
                })
    return list(cursos.values())


def tablas(contenido: str) -> list[str]:
    return re.findall(r"<table.*?</table>", contenido, re.S)


def filas(tabla: str) -> list[list[str]]:
    resultado = []
    for fila in re.findall(r"<tr[^>]*>(.*?)</tr>", tabla, re.S):
        celdas = [texto(celda) for celda in re.findall(r"<td[^>]*>(.*?)</td>", fila, re.S)]
        if celdas:
            resultado.append(celdas)
    return resultado


def parsear_ficha(url: str) -> dict:
    url_es = url.replace("https://ceice.gva.es/web/", "https://ceice.gva.es/es/web/")
    url_es = url_es.replace("https://ceice.gva.es/ca/", "https://ceice.gva.es/es/")
    archivo = base.descargar(
        url_es + "?languageId=es", hashlib.sha1(url_es.encode()).hexdigest() + "-ce.html"
    )
    contenido = archivo.read_text(encoding="utf-8", errors="replace")
    plano = texto(contenido)
    familia = re.search(r"Familia Profesional:\s*(.*?)\s*Grado:", plano, re.S)
    grado = re.search(r"Grado:\s*(.*?)\s*Duración:", plano, re.S)
    duracion = re.search(r"Duración:\s*(\d+)\s*horas", plano, re.I)
    modulos: list[dict] = []
    for tabla in tablas(contenido):
        cabecera = filas(tabla)[0] if filas(tabla) else []
        if not cabecera or "Cod." not in cabecera[0] or "Módulos" not in cabecera[1]:
            continue
        for fila in filas(tabla)[1:]:
            if len(fila) < 4:
                continue
            codigo, nombre, horas_mod, horas_sem = fila[:4]
            if not re.fullmatch(r"\d{4}", codigo):
                continue
            modulos.append({
                "codigo": codigo,
                "nombre": nombre,
                "horas_anuales": int(horas_mod) if horas_mod.isdigit() else None,
                "horas_semanales": int(horas_sem) if horas_sem.isdigit() else None,
            })
        break
    return {
        "familia": familia.group(1).strip() if familia else "",
        "grado": grado.group(1).strip() if grado else "",
        "duracion": int(duracion.group(1)) if duracion else 0,
        "modulos": modulos,
        "boe_ids": base.enlaces_boe(archivo),
    }


def main() -> int:
    cursos = enlaces_dosier()
    print(f"Cursos de especialización encontrados: {len(cursos)}")
    catalogo = []
    cobertura = [
        "# Cobertura de cursos de especialización",
        "",
        "| Curso | Módulos | Módulos con RA/CE | RA | CE | Estado |",
        "|---|---:|---:|---:|---:|---|",
    ]
    usados: set[str] = set()
    for indice, curso in enumerate(cursos, 1):
        try:
            ficha = parsear_ficha(curso["url"])
        except Exception as error:
            print(f"[{indice}/{len(cursos)}] {curso['nombre']}: {error}", file=sys.stderr)
            continue
        if not ficha["boe_ids"]:
            ficha["boe_ids"] = BOE_MANUAL_CE.get(curso["nombre"], ficha["boe_ids"])
        manual = CURSOS_MANUALES.get(curso["nombre"])
        if not ficha["modulos"] and manual:
            ficha.update(manual)
        if not ficha["modulos"]:
            print(f"[{indice}/{len(cursos)}] {curso['nombre']}: sin tabla de módulos", file=sys.stderr)
            continue
        identificador = "ce-" + slug(curso["nombre"])
        if identificador in usados:
            identificador += f"-{indice}"
        usados.add(identificador)

        codigos = {m["codigo"] for m in ficha["modulos"]}
        parsed: dict[str, dict] = {}
        mejor_titulo = ""
        mejor_url = ""
        mejor_puntuacion = 0
        for boe_id in ficha["boe_ids"]:
            try:
                xml = base.descargar(
                    f"https://www.boe.es/diario_boe/xml.php?id={boe_id}",
                    f"{boe_id}.xml",
                )
                modulos = base.parsear_xml(xml)
                if not modulos:
                    pdf_url = base.url_pdf_boe(xml)
                    if pdf_url:
                        pdf = base.descargar(pdf_url, f"{boe_id}.pdf")
                        modulos = base.parsear_texto_pdf(base.texto_pdf(pdf))
            except Exception as error:
                print(f"  {curso['nombre']}: {boe_id}: {error}", file=sys.stderr)
                continue
            utiles = [modulos[c] for c in codigos if c in modulos]
            puntuacion = sum(len(m["ra"]) for m in utiles)
            for codigo, modulo in modulos.items():
                if codigo not in codigos:
                    continue
                if codigo not in parsed or len(modulo["ra"]) > len(parsed[codigo]["ra"]):
                    parsed[codigo] = modulo
            if puntuacion > mejor_puntuacion:
                mejor_puntuacion = puntuacion
                mejor_titulo = base.titulo_boe(xml)
                mejor_url = f"https://www.boe.es/buscar/act.php?id={boe_id}"

        modulos_json = []
        for modulo in ficha["modulos"]:
            fuente = parsed.get(modulo["codigo"])
            modulos_json.append({
                "nombre": modulo["nombre"],
                "codigo": modulo["codigo"],
                "ects": fuente.get("ects") if fuente else None,
                "horas_minimas_boe": (
                    fuente.get("horas_minimas_boe") if fuente else modulo["horas_anuales"]
                ),
                "siglas": None,
                "curso": "1",
                "ra": fuente["ra"] if fuente else [],
            })
        datos = {
            "id": identificador,
            "denominacion": curso["nombre"],
            "nivel": NIVEL.get(ficha["grado"] or curso["nivel"], NIVEL["Superior"]),
            "familia_profesional": ficha["familia"] or curso["familia"],
            "duracion_horas": ficha["duracion"],
            "ects": 0,
            "abreviatura": abreviatura(curso["nombre"]),
            "rd": mejor_titulo or "BOE",
            "boe_url": mejor_url or "https://www.boe.es/",
            "modulos": modulos_json,
        }
        (DIR_JSON / f"{identificador}.json").write_text(
            json.dumps(datos, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        catalogo.append({
            "id": identificador,
            "denominacion": curso["nombre"],
            "nivel": "CE",
            "familia_profesional": ficha["familia"] or curso["familia"],
            "abreviatura": abreviatura(curso["nombre"]),
            "modulos": [{**modulo, "curso": "1"} for modulo in ficha["modulos"]],
        })
        con = sum(1 for modulo in modulos_json if modulo["ra"])
        ra = sum(len(modulo["ra"]) for modulo in modulos_json)
        ce = sum(len(resultado["ce"]) for modulo in modulos_json for resultado in modulo["ra"])
        estado = "ok" if ra else "sin RA/CE"
        cobertura.append(
            f"| {curso['nombre']} | {len(modulos_json)} | {con} | {ra} | {ce} | {estado} |"
        )
        print(f"[{indice}/{len(cursos)}] {curso['nombre']}: {con}/{len(modulos_json)} módulos · {ra} RA · {ce} CE")

    catalogo.sort(key=lambda curso: (curso["familia_profesional"], curso["denominacion"]))
    (DIR_HORARIOS / "cursos-especializacion-2026-27.json").write_text(
        json.dumps({
            "curso_academico": "2026/2027",
            "fuente": DOSIER_CE,
            "actualizado": "2026-11-03",
            "niveles": ["CE"],
            "ciclos": catalogo,
        }, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (DIR_JSON / "COBERTURA-ESPECIALIZACION.md").write_text(
        "\n".join(cobertura) + "\n", encoding="utf-8"
    )
    print(f"\nCatálogo: {DIR_HORARIOS / 'cursos-especializacion-2026-27.json'}")
    print(f"Informe: {DIR_JSON / 'COBERTURA-ESPECIALIZACION.md'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
