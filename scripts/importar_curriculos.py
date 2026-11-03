#!/usr/bin/env python3
"""Importa los currículos de todos los ciclos del dosier de FP de la GVA.

Fuentes:
  - Dosier de ciclos: https://ceice.gva.es/es/web/formacion-profesional/dossier-cicles
  - Enlace BOE de cada ficha de ciclo (RD de título / texto consolidado)
  - Decreto 114/2025 y Decreto 117/2025 (DOGV) para módulos transversales

Uso:
  python3 scripts/importar_curriculos.py
  python3 scripts/importar_curriculos.py --ids gm-gestion-administrativa,gs-administracion-y-finanzas
  python3 scripts/importar_curriculos.py --force   # regenera también los ciclos ya existentes

Los JSON se escriben en resources/boe/<id>.json. El informe de cobertura se
escribe en resources/boe/COBERTURA.md.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import subprocess
import sys
import tempfile
import unicodedata
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DIR_JSON = RAIZ / "resources" / "boe"
CATALOGO = RAIZ / "resources" / "horarios" / "catalogo-2026-27.json"
CACHE = Path(tempfile.gettempdir()) / "aula-nova-curriculos"
CACHE.mkdir(parents=True, exist_ok=True)

DOSIER = "https://ceice.gva.es/es/web/formacion-profesional/dossier-cicles"
DOGV_GM_GS = "https://dogv.gva.es/datos/2025/08/04/pdf/2025_29742_es.pdf"
DOGV_GB = "https://dogv.gva.es/datos/2025/08/13/pdf/2025_32763_es.pdf"

NIVEL = {
    "GB": "Formación Profesional de Grado Básico",
    "GM": "Formación Profesional de Grado Medio",
    "GS": "Formación Profesional de Grado Superior",
}

# Módulos transversales que aparecen en los anexos del Decreto 114/2025.
TRANSVERSALES = ("3159", "0179", "0156", "1709", "1710", "1665", "1664", "1708")

# Fichas antiguas que enlazan a webinterna2 en vez del BOE.
BOE_MANUAL = {
    "gs-transporte-maritimo-y-pesca-de-altura": ["BOE-A-2011-19606"],
}

SIGLAS = {
    "0179": "ING", "0156": "ING", "1709": "IPE I", "1710": "IPE II",
    "1664": "DIG", "1665": "DIG", "1708": "SOST", "3159": "IPE", "3159p": "IPE I",
    "0483": "SI", "0484": "BD", "0485": "PROG", "0373": "LMSGI",
    "0487": "ED", "0486": "AD", "0488": "DI", "0489": "PMDM",
    "0490": "PSP", "0491": "SGE", "0492": "PROY", "0492p": "PROY",
    "0369": "ISO", "0370": "PAR", "0371": "FH", "0372": "GBD",
    "0374": "ASO", "0375": "SRI", "0376": "IAW", "0377": "ASGBD",
    "0378": "SAD", "0379": "PROY", "0379p": "PROY",
    "0221": "MME", "0222": "SOMP", "0223": "AO", "0224": "SOR",
    "0225": "RL", "0226": "SI", "0227": "SR", "0228": "AW",
    "3015": "EEE", "3016": "IMR", "3029": "MMS", "3030": "OAC",
    "3031": "OAD", "0612": "DWEC", "0613": "DWES", "0614": "DESPL",
    "0615": "DIW", "0616": "PROY", "0616p": "PROY", "0617": "FOL",
    "0618": "EIE", "0619": "FCT",
}


def limpiar(texto: str) -> str:
    return " ".join(texto.replace("\xa0", " ").split())


def normalizar(texto: str) -> str:
    texto = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode().lower()
    texto = re.sub(r"^(t\.p\.b\.|t\.s\.|t\.)\s*", "", texto)
    return re.sub(r"[^a-z0-9]+", " ", texto).strip()


def descargar(url: str, nombre: str | None = None) -> Path:
    """Descarga con curl y cachea por URL. Es más robusto que urllib con TLS."""
    clave = hashlib.sha1(url.encode()).hexdigest()
    destino = CACHE / (nombre or clave)
    if destino.exists() and destino.stat().st_size > 0:
        return destino
    temporal = destino.with_suffix(destino.suffix + ".tmp")
    resultado = subprocess.run(
        [
            "curl", "-sL", "--fail", "--retry", "3", "--max-time", "120",
            "-A", "AulaNova/1.0 (importador curricular)", "-o", str(temporal), url,
        ],
        capture_output=True,
        text=True,
    )
    if resultado.returncode != 0:
        raise RuntimeError(f"No se pudo descargar {url}: {resultado.stderr.strip()}")
    temporal.replace(destino)
    return destino


def texto_html(archivo: Path) -> str:
    return archivo.read_text(encoding="utf-8", errors="replace")


def extraer_texto(fragmento: str) -> str:
    return limpiar(html.unescape(re.sub(r"<[^>]+>", " ", fragmento)))


def extraer_enlaces_dosier() -> list[dict]:
    archivo = descargar(DOSIER, "dossier.html")
    contenido = texto_html(archivo)
    enlaces: dict[str, dict] = {}
    for fila in re.findall(r"<tr[^>]*>(.*?)</tr>", contenido, re.S):
        celdas = re.findall(r"<td[^>]*>(.*?)</td>", fila, re.S)
        if len(celdas) < 5:
            continue
        familia = extraer_texto(celdas[1])
        for nivel, celda in zip(("GB", "GM", "GS"), celdas[2:5]):
            for href, etiqueta in re.findall(
                r"<a[^>]+href=\"([^\"]+)\"[^>]*>(.*?)</a>", celda, re.S
            ):
                if "/publicador-de-cicles/" not in href or "/content/" not in href:
                    continue
                url = html.unescape(href).strip().split("?")[0]
                if url.startswith("/"):
                    url = "https://ceice.gva.es" + url
                enlaces.setdefault(url, {
                    "familia": familia,
                    "nivel": nivel,
                    "nombre": extraer_texto(etiqueta),
                    "url": url,
                })
    return list(enlaces.values())


def mapear_catalogo(catalogo: list[dict], enlaces: list[dict]) -> dict[str, list[dict]]:
    """Devuelve id de catálogo → fichas del dosier (puede haber más de una)."""
    import difflib

    mapa: dict[str, list[dict]] = {}
    for enlace in enlaces:
        nivel = enlace["nivel"]
        nombre = normalizar(enlace["nombre"])
        candidatos = [
            ciclo for ciclo in catalogo
            if ciclo["nivel"] == nivel and normalizar(ciclo["denominacion"]) == nombre
        ]
        if not candidatos:
            candidatos = [
                ciclo for ciclo in catalogo
                if ciclo["nivel"] == nivel
                and (
                    normalizar(ciclo["denominacion"]).startswith(nombre)
                    or nombre.startswith(normalizar(ciclo["denominacion"]))
                )
            ]
        if not candidatos:
            mejor = None
            puntuacion = 0.0
            for ciclo in catalogo:
                if ciclo["nivel"] != nivel:
                    continue
                valor = difflib.SequenceMatcher(
                    None, nombre, normalizar(ciclo["denominacion"])
                ).ratio()
                if valor > puntuacion:
                    mejor, puntuacion = ciclo, valor
            if puntuacion >= 0.84:
                candidatos = [mejor]
        for ciclo in candidatos:
            mapa.setdefault(ciclo["id"], []).append(enlace)
    return mapa


def resolver_id_boe(url: str) -> str | None:
    coincidencia = re.search(r"BOE-A-\d{4}-\d+", url)
    if coincidencia:
        return coincidencia.group(0)
    if "/eli/" not in url:
        return None
    try:
        pagina = texto_html(descargar(url))
    except Exception:
        return None
    patrones = [
        r'<meta\s+name="Description"\s+content="(BOE-A-\d{4}-\d+)',
        r'<link\s+rel="canonical"\s+href="[^"]*id=(BOE-A-\d{4}-\d+)',
        r'property="http://data.europa.eu/eli/ontology#id_local"\s+content="(BOE-A-\d{4}-\d+)"',
    ]
    for patron in patrones:
        encontrado = re.search(patron, pagina)
        if encontrado:
            return encontrado.group(1)
    return None


def enlaces_boe(pagina: Path) -> list[str]:
    contenido = texto_html(pagina)
    urls = set()
    for url in re.findall(r"https?://[^\"'\s<>]+", html.unescape(contenido)):
        if "boe.es" not in url:
            continue
        if not any(
            parte in url
            for parte in ("/eli/", "/buscar/act.php", "/buscar/doc.php", "/diario_boe/txt.php", "/boe/dias/")
        ):
            continue
        urls.add(url.rstrip(".,);"))
    ids = {resolver_id_boe(url) for url in urls}
    return sorted(identificador for identificador in ids if identificador)


# --- Parser de XML consolidado del BOE ---------------------------------
RE_MODULO = re.compile(r"^Módulo [Pp]rofesional:\s*(.+?)(?:\.?\s*Código:\s*([0-9]{4}))?\.?$", re.I)
RE_ECTS = re.compile(r"^Equivalencia en créditos ECTS:\s*(\d+)", re.I)
RE_CODIGO = re.compile(r"^Código:\s*([0-9]{4})", re.I)
RE_RA = re.compile(r"^(?:RA)?\s*(\d+)[.:]\s*(.+)$")
RE_CE = re.compile(r"^([a-zñ])\)\s*(.+)$")
RE_DURACION = re.compile(r"^Duración:\s*(\d+)\s*horas", re.I)
FIN_RA_CE = ("Duración:", "Contenidos básicos", "Orientaciones pedagógicas")


def letra(indice: int) -> str:
    numero = indice
    salida = ""
    while True:
        salida = chr(97 + (numero % 26)) + salida
        numero = numero // 26 - 1
        if numero < 0:
            return salida


def normalizar_codigos(modulos: list[dict]) -> None:
    """Corrige erratas del BOE: RA o CE con el mismo código repetido."""
    for modulo in modulos:
        anterior = 0
        for ra in modulo["ra"]:
            if ra["numero"] <= anterior:
                ra["numero"] = anterior + 1
                ra["codigo"] = f"RA{ra['numero']}"
            anterior = ra["numero"]
            codigos = [ce["codigo"] for ce in ra["ce"]]
            if len(codigos) != len(set(codigos)):
                for indice, ce in enumerate(ra["ce"]):
                    ce["codigo"] = letra(indice)


def parrafos_xml(archivo: Path):
    root = ET.parse(archivo).getroot()
    for parrafo in root.iter("p"):
        texto = "".join(parrafo.itertext()).strip()
        for linea in texto.splitlines():
            linea = limpiar(linea)
            if linea:
                yield linea


def parsear_xml(archivo: Path) -> dict[str, dict]:
    modulos: list[dict] = []
    actual = None
    en_ra_ce = False
    ra = None

    def cerrar():
        nonlocal actual, ra, en_ra_ce
        if actual and actual.get("codigo"):
            modulos.append(actual)
        actual, ra, en_ra_ce = None, None, False

    for texto in parrafos_xml(archivo):
        coincidencia = RE_MODULO.match(texto)
        if coincidencia:
            cerrar()
            nombre = re.sub(
                r"\s*Equivalencia en créditos ECTS.*$", "", coincidencia.group(1), flags=re.I
            ).strip()
            actual = {
                "nombre": nombre, "codigo": coincidencia.group(2), "ects": None,
                "horas_minimas_boe": None, "ra": [],
            }
            continue
        if actual is None:
            continue
        coincidencia = RE_CODIGO.match(texto)
        if coincidencia and actual["codigo"] is None:
            actual["codigo"] = coincidencia.group(1)
            continue
        coincidencia = RE_ECTS.match(texto)
        if coincidencia and actual["ects"] is None:
            actual["ects"] = int(coincidencia.group(1))
            continue
        if texto.lower().startswith("resultados de aprendizaje y criterios de evaluación"):
            en_ra_ce = True
            continue
        if en_ra_ce:
            coincidencia = RE_DURACION.match(texto)
            if coincidencia:
                actual["horas_minimas_boe"] = int(coincidencia.group(1))
                en_ra_ce = False
                continue
            if texto.lower().startswith(tuple(fin.lower() for fin in FIN_RA_CE)):
                en_ra_ce = False
                continue
            if texto.lower().startswith("criterios de evaluación"):
                continue
            coincidencia = RE_CE.match(texto)
            if coincidencia and ra is not None:
                ra["ce"].append({"codigo": coincidencia.group(1), "descripcion": coincidencia.group(2).strip()})
                continue
            coincidencia = RE_RA.match(texto)
            if coincidencia:
                ra = {
                    "codigo": f"RA{coincidencia.group(1)}",
                    "numero": int(coincidencia.group(1)),
                    "descripcion": coincidencia.group(2).strip(),
                    "ce": [],
                }
                actual["ra"].append(ra)
                continue
            if ra is not None and ra["ce"]:
                ra["ce"][-1]["descripcion"] = limpiar(ra["ce"][-1]["descripcion"] + " " + texto)
            elif ra is not None:
                ra["descripcion"] = limpiar(ra["descripcion"] + " " + texto)
    cerrar()
    for modulo in modulos:
        for resultado in modulo["ra"]:
            resultado["descripcion"] = re.sub(
                r"\s*Criterios\s*$", "", resultado["descripcion"], flags=re.I
            ).strip()
    normalizar_codigos(modulos)
    return {modulo["codigo"]: modulo for modulo in modulos if modulo["codigo"]}


def titulo_boe(archivo: Path) -> str:
    try:
        root = ET.parse(archivo).getroot()
        nodo = root.find(".//titulo")
        return limpiar(nodo.text or "") if nodo is not None else ""
    except Exception:
        return ""


def url_pdf_boe(archivo: Path) -> str | None:
    try:
        root = ET.parse(archivo).getroot()
        nodo = root.find(".//url_pdf")
        return (nodo.text or "").strip() if nodo is not None else None
    except Exception:
        return None


def texto_pdf(pdf: Path) -> Path:
    destino = pdf.with_suffix(".raw.txt")
    if not destino.exists():
        subprocess.run(["pdftotext", "-raw", str(pdf), str(destino)], check=True)
    return destino


def parsear_texto_pdf(archivo: Path) -> dict[str, dict]:
    """Fallback para RDs antiguos cuyo XML solo contiene imágenes."""
    modulos: list[dict] = []
    actual = None
    en_ra_ce = False
    ra = None
    esperando_nombre = False

    def cerrar():
        nonlocal actual, ra, en_ra_ce, esperando_nombre
        if actual and actual.get("codigo"):
            modulos.append(actual)
        actual, ra, en_ra_ce, esperando_nombre = None, None, False, False

    for linea in archivo.read_text(encoding="utf-8", errors="replace").splitlines():
        texto = limpiar(linea)
        if not texto:
            continue
        if texto.startswith("BOE núm") or texto.startswith("CVE:") or re.match(r"^\d+ / \d+$", texto):
            continue
        coincidencia = RE_MODULO.match(texto)
        if coincidencia:
            cerrar()
            actual = {
                "nombre": coincidencia.group(1).strip(), "codigo": coincidencia.group(2),
                "ects": None, "horas_minimas_boe": None, "ra": [],
            }
            esperando_nombre = not bool(actual["codigo"]) and not actual["nombre"].endswith(".")
            continue
        if esperando_nombre and actual is not None:
            if texto.startswith("Código:"):
                esperando_nombre = False
            elif not texto.startswith(("Resultados", "Criterios", "Duración", "Contenidos")):
                actual["nombre"] = limpiar(actual["nombre"] + " " + texto)
                if texto.endswith("."):
                    esperando_nombre = False
                continue
        if actual is None:
            continue
        coincidencia = RE_CODIGO.match(texto)
        if coincidencia and actual["codigo"] is None:
            actual["codigo"] = coincidencia.group(1)
            continue
        if texto.lower().startswith("resultados de aprendizaje y criterios de evaluación"):
            en_ra_ce = True
            continue
        if en_ra_ce:
            coincidencia = RE_DURACION.match(texto)
            if coincidencia:
                actual["horas_minimas_boe"] = int(coincidencia.group(1))
                en_ra_ce = False
                continue
            if texto.lower().startswith(tuple(fin.lower() for fin in FIN_RA_CE)):
                en_ra_ce = False
                continue
            if texto.lower().startswith("criterios de evaluación"):
                continue
            coincidencia = RE_CE.match(texto)
            if coincidencia and ra is not None:
                ra["ce"].append({"codigo": coincidencia.group(1), "descripcion": coincidencia.group(2).strip()})
                continue
            coincidencia = RE_RA.match(texto)
            if coincidencia:
                ra = {
                    "codigo": f"RA{coincidencia.group(1)}",
                    "numero": int(coincidencia.group(1)),
                    "descripcion": coincidencia.group(2).strip(),
                    "ce": [],
                }
                actual["ra"].append(ra)
                continue
            if ra is not None and ra["ce"]:
                ra["ce"][-1]["descripcion"] = limpiar(ra["ce"][-1]["descripcion"] + " " + texto)
            elif ra is not None:
                ra["descripcion"] = limpiar(ra["descripcion"] + " " + texto)
    cerrar()
    normalizar_codigos(modulos)
    return {modulo["codigo"]: modulo for modulo in modulos if modulo["codigo"]}


# --- Parser de los anexos transversales del DOGV -----------------------
RE_DOGV_CODIGO = re.compile(r"^\s*C[ÓO]DIGO:\s*(\d{4})\.?\s*$", re.I)
RE_DOGV_RA = re.compile(r"^\s*(?:RA)?\s*(\d+)[.:]\s*(.+)$")
RE_DOGV_CE = re.compile(r"^\s*([a-zñ])\)\s*(.+)$")
RE_DOGV_ANEXO = re.compile(r"^\s*ANEXO\b")
RE_DOGV_STOP = re.compile(r"^\s*CONTENIDOS\s*$", re.I)


def parsear_dogv(archivo: Path, codigo: str) -> list[dict]:
    lineas = archivo.read_text(encoding="utf-8", errors="replace").splitlines()
    inicio = None
    for indice, linea in enumerate(lineas):
        coincidencia = RE_DOGV_CODIGO.match(linea)
        if coincidencia and coincidencia.group(1) == codigo:
            inicio = indice + 1
            break
    if inicio is None:
        return []
    fin = len(lineas)
    for indice in range(inicio, len(lineas)):
        if RE_DOGV_ANEXO.match(lineas[indice]) or RE_DOGV_STOP.match(lineas[indice]):
            fin = indice
            break
    ras: list[dict] = []
    ra = None
    ce = None
    for linea in lineas[inicio:fin]:
        texto = limpiar(linea)
        if not texto:
            continue
        if texto.startswith("CVE:") or re.match(r"^Núm\.", texto) or re.match(r"^\d+ / \d+$", texto):
            continue
        if texto.upper().startswith("DURACIÓN") or texto.upper().startswith("CÓDIGO"):
            continue
        if texto.lower().startswith("resultados de aprendizaje") or texto.lower().startswith("criterios de evaluación"):
            continue
        coincidencia = RE_DOGV_RA.match(texto)
        if coincidencia:
            ra = {
                "codigo": f"RA{coincidencia.group(1)}",
                "numero": int(coincidencia.group(1)),
                "descripcion": re.sub(
                    r"\s*Criterios\s*$", "", coincidencia.group(2), flags=re.I
                ).strip(),
                "ce": [],
            }
            ras.append(ra)
            ce = None
            continue
        coincidencia = RE_DOGV_CE.match(texto)
        if coincidencia and ra is not None:
            ce = {"codigo": coincidencia.group(1), "descripcion": coincidencia.group(2).strip()}
            ra["ce"].append(ce)
            continue
        if ra is not None:
            if ce is not None:
                ce["descripcion"] = limpiar(ce["descripcion"] + " " + texto)
            else:
                ra["descripcion"] = limpiar(ra["descripcion"] + " " + texto)
    for resultado in ras:
        resultado["descripcion"] = re.sub(
            r"\s*Criterios\s*$", "", resultado["descripcion"], flags=re.I
        ).strip()
    return ras


def texto_dogv(pdf: Path) -> Path:
    destino = pdf.with_suffix(".txt")
    if not destino.exists():
        subprocess.run(["pdftotext", "-layout", str(pdf), str(destino)], check=True)
    return destino


def cargar_transversales() -> dict[str, list[dict]]:
    try:
        texto_114 = texto_dogv(descargar(DOGV_GM_GS, "dogv114.pdf"))
        texto_117 = texto_dogv(descargar(DOGV_GB, "dogv117.pdf"))
    except Exception as error:
        print(f"AVISO: no se pudieron leer los DOGV: {error}", file=sys.stderr)
        return {}
    transversales = {
        codigo: parsear_dogv(texto_114, codigo)
        for codigo in ("0156", "0179", "1709", "1710", "1664", "1665", "1708")
    }
    transversales["3159"] = parsear_dogv(texto_117, "3159")
    transversales["3159p"] = transversales["3159"]
    return transversales


def buscar_transversal(codigo: str, transversales: dict[str, list[dict]]) -> list[dict]:
    if codigo in transversales:
        return transversales[codigo]
    for prefijo in TRANSVERSALES:
        if codigo.startswith(prefijo):
            return transversales.get(prefijo, [])
    return []


def modulo_fuente(codigo: str, parsed: dict[str, dict]) -> dict | None:
    if codigo in parsed:
        return parsed[codigo]
    base = codigo[:-1] if codigo.endswith("p") else codigo
    return parsed.get(base)


def crear_json(ciclo: dict, parsed: dict[str, dict], transversales: dict[str, list[dict]], rd: str, boe_url: str) -> dict:
    modulos = []
    vistos: set[str] = set()
    for modulo_cat in ciclo["modulos"]:
        codigo = modulo_cat["codigo"]
        if codigo in vistos:
            continue
        vistos.add(codigo)
        fuente = modulo_fuente(codigo, parsed)
        ra = fuente["ra"] if fuente else buscar_transversal(codigo, transversales)
        modulos.append({
            "nombre": modulo_cat["nombre"],
            "codigo": codigo,
            "ects": fuente.get("ects") if fuente else None,
            "horas_minimas_boe": fuente.get("horas_minimas_boe") if fuente else None,
            "siglas": SIGLAS.get(codigo),
            "curso": modulo_cat["curso"],
            "ra": ra,
        })
    return {
        "id": ciclo["id"],
        "denominacion": ciclo["denominacion"],
        "nivel": NIVEL[ciclo["nivel"]],
        "familia_profesional": ciclo["familia_profesional"],
        "duracion_horas": 2000,
        "ects": 120,
        "abreviatura": ciclo["abreviatura"],
        "rd": rd,
        "boe_url": boe_url,
        "modulos": modulos,
    }


def escribir_cobertura(catalogo: list[dict]) -> None:
    lineas = [
        "# Cobertura de currículos",
        "",
        "| Ciclo | Módulos | Módulos con RA/CE | RA | CE | Estado |",
        "|---|---:|---:|---:|---:|---|",
    ]
    for ciclo in catalogo:
        archivo = DIR_JSON / f"{ciclo['id']}.json"
        if not archivo.exists():
            lineas.append(f"| {ciclo['id']} | 0 | 0 | 0 | 0 | sin ficha |")
            continue
        datos = json.loads(archivo.read_text(encoding="utf-8"))
        modulos = datos.get("modulos", [])
        total = len(modulos)
        con = sum(1 for modulo in modulos if modulo.get("ra"))
        ra = sum(len(modulo.get("ra", [])) for modulo in modulos)
        ce = sum(
            len(resultado.get("ce", []))
            for modulo in modulos
            for resultado in modulo.get("ra", [])
        )
        estado = "ok" if ra else "sin RA/CE"
        lineas.append(f"| {ciclo['id']} | {total} | {con} | {ra} | {ce} | {estado} |")
    (DIR_JSON / "COBERTURA.md").write_text("\n".join(lineas) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ids", help="Lista de ids de catálogo separados por comas")
    parser.add_argument("--force", action="store_true", help="Regenera ciclos ya existentes")
    parser.add_argument("--limite", type=int, help="Procesa solo los primeros N ciclos")
    args = parser.parse_args()

    catalogo = json.loads(CATALOGO.read_text(encoding="utf-8"))["ciclos"]
    enlaces = extraer_enlaces_dosier()
    mapa = mapear_catalogo(catalogo, enlaces)
    transversales = cargar_transversales()

    # Algunos ciclos del catálogo están repetidos con singular/plural.
    for ciclo in catalogo:
        if ciclo["id"] in mapa:
            continue
        for otro_id, fichas in mapa.items():
            if otro_id.startswith(ciclo["id"]) or ciclo["id"].startswith(otro_id):
                mapa[ciclo["id"]] = fichas
                break

    ids = [i.strip() for i in args.ids.split(",")] if args.ids else [c["id"] for c in catalogo]
    if args.limite:
        ids = ids[: args.limite]

    existentes = {archivo.stem for archivo in DIR_JSON.glob("*.json")}
    resultados = []
    for indice, ciclo_id in enumerate(ids, 1):
        ciclo = next((c for c in catalogo if c["id"] == ciclo_id), None)
        if ciclo is None:
            print(f"[{indice}/{len(ids)}] {ciclo_id}: no está en el catálogo", file=sys.stderr)
            continue
        if ciclo_id in existentes and not args.force:
            print(f"[{indice}/{len(ids)}] {ciclo_id}: ya existe, se conserva")
            continue
        fichas = mapa.get(ciclo_id, [])
        if not fichas:
            print(f"[{indice}/{len(ids)}] {ciclo_id}: sin ficha en el dosier", file=sys.stderr)
            resultados.append((ciclo_id, 0, 0, 0, "sin ficha"))
            continue

        codigos = {m["codigo"] for m in ciclo["modulos"]}
        codigos |= {codigo[:-1] for codigo in codigos if codigo.endswith("p")}
        parsed: dict[str, dict] = {}
        mejor_titulo = ""
        mejor_url = ""
        mejor_puntuacion = 0
        ids_boe: set[str] = set()
        for ficha in fichas:
            try:
                pagina = descargar(ficha["url"], hashlib.sha1(ficha["url"].encode()).hexdigest() + ".html")
            except Exception as error:
                print(f"  {ciclo_id}: no se pudo abrir la ficha: {error}", file=sys.stderr)
                continue
            ids_boe.update(enlaces_boe(pagina))
        ids_boe.update(BOE_MANUAL.get(ciclo_id, []))
        for boe_id in sorted(ids_boe):
            try:
                xml = descargar(f"https://www.boe.es/diario_boe/xml.php?id={boe_id}", f"{boe_id}.xml")
                modulos = parsear_xml(xml)
                if not modulos:
                    pdf_url = url_pdf_boe(xml)
                    if pdf_url:
                        pdf = descargar(pdf_url, f"{boe_id}.pdf")
                        modulos = parsear_texto_pdf(texto_pdf(pdf))
            except Exception as error:
                print(f"  {ciclo_id}: XML/PDF {boe_id} no válido: {error}", file=sys.stderr)
                continue
            utiles = [modulos[c] for c in codigos if c in modulos]
            if not utiles:
                continue
            puntuacion = sum(len(m["ra"]) for m in utiles)
            for codigo, modulo in modulos.items():
                if codigo not in codigos:
                    continue
                if codigo not in parsed or len(modulo["ra"]) > len(parsed[codigo]["ra"]):
                    parsed[codigo] = modulo
            if puntuacion > mejor_puntuacion:
                mejor_puntuacion = puntuacion
                mejor_titulo = titulo_boe(xml)
                mejor_url = f"https://www.boe.es/buscar/act.php?id={boe_id}"

        tiene_transversales = any(
            buscar_transversal(m["codigo"], transversales) for m in ciclo["modulos"]
        )
        if not parsed and not tiene_transversales:
            resultados.append((ciclo_id, 0, 0, 0, "sin RA/CE en el BOE"))
            print(f"[{indice}/{len(ids)}] {ciclo_id}: sin RA/CE", file=sys.stderr)
            continue

        datos = crear_json(
            ciclo, parsed, transversales,
            mejor_titulo or "BOE", mejor_url or f"https://www.boe.es/",
        )
        destino = DIR_JSON / f"{ciclo_id}.json"
        destino.write_text(json.dumps(datos, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        n_ra = sum(len(m["ra"]) for m in datos["modulos"])
        n_ce = sum(len(r["ce"]) for m in datos["modulos"] for r in m["ra"])
        con = sum(1 for m in datos["modulos"] if m["ra"])
        resultados.append((ciclo_id, len(datos["modulos"]), con, n_ra, n_ce, "ok"))
        print(f"[{indice}/{len(ids)}] {ciclo_id}: {con}/{len(datos['modulos'])} módulos · {n_ra} RA · {n_ce} CE")

    escribir_cobertura(catalogo)
    print(f"\nInforme: {DIR_JSON / 'COBERTURA.md'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
