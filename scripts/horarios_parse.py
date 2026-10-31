#!/usr/bin/env python3
"""Genera el catálogo de secuenciación y horarios de la Conselleria.

Fuentes: PDFs de «Dosier ciclos» de la CEICE para el curso 2026/2027.
Requiere `pdftotext` (poppler) para extraer el texto con el formato de columnas.

Uso:
    python3 scripts/horarios_parse.py

El JSON resultante se guarda en resources/horarios/catalogo-2026-27.json y se
empaqueta con la aplicación. El catálogo es la base del buscador de ciclos y
módulos al crear un grupo.
"""
from __future__ import annotations

import json
import re
import subprocess
import tempfile
import unicodedata
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / 'resources' / 'horarios' / 'catalogo-2026-27.json'
CURSO = '2026/2027'
FUENTE = 'https://ceice.gva.es/es/web/formacion-profesional/dossier-cicles'

PDFS = {
    ('GB', '1'): 'https://ceice.gva.es/documents/388109149/412229895/Horario+GB+26-27+cas.pdf/1113a85b-9dad-df93-6d7f-c5a16a6eba21?t=1782994213624',
    ('GM', '1'): 'https://ceice.gva.es/documents/388109149/412229895/Horario+GM+26-27+cas.pdf/951c2430-43dd-d9da-8237-dd9ba784062a?t=1782994216217',
    ('GS', '1'): 'https://ceice.gva.es/documents/388109149/412229895/Horario+GS+26-27+cas.pdf/9b6c4d35-feaa-e37c-035b-273619fce569?t=1782994215142',
    ('GB', '2'): 'https://ceice.gva.es/documents/388109149/393516688/Horario_GB_es.pdf/26ea2781-3d07-8f1b-58b8-8cfe7b05329d?t=1750066285996',
    ('GM', '2'): 'https://ceice.gva.es/documents/388109149/393516688/Horario_GM_es.pdf/b5adf8e4-46f2-f810-76ec-48d641586893?t=1750066095667',
    ('GS', '2'): 'https://ceice.gva.es/documents/388109149/393516688/Horario_GS_es.pdf/d96a6385-34d8-492a-5a43-3fd6e0549964?t=1750066171433'
}

MOD_RE = re.compile(
    r'^(?P<indent>\s*)(?:(?P<curso>[123])º\s+)?'
    r'(?P<codigo>[A-Z0-9]{3,}[a-z]?)\s*(?P<nombre>.*?)\s+'
    r'(?P<sem>\d{1,3})\s+(?P<anio>[\d.]+)\s*$'
)
CURSO_RE = re.compile(r'^\s*([123])º\s')
FAMILIA_RE = re.compile(r'^(?:FAMILIA:\s*)?([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ0-9\s\.\-]+)$')
CONECTORES = {'de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'o', 'en', 'a', 'al', 'con', 'para', 'por', 'i'}


def norm(texto: str) -> str:
    return unicodedata.normalize('NFD', texto).encode('ascii', 'ignore').decode().lower().strip()


def titulo(texto: str) -> str:
    palabras = []
    for indice, palabra in enumerate(texto.split()):
        if indice > 0 and norm(palabra) in CONECTORES:
            palabras.append(palabra.lower())
        elif palabra.isupper() and len(palabra) <= 3:
            palabras.append(palabra)
        else:
            palabras.append(palabra[:1].upper() + palabra[1:].lower())
    return ' '.join(palabras)


def es_linea_nombre(linea: str) -> bool:
    texto = linea.strip()
    if not texto:
        return False
    if len(linea) - len(linea.lstrip()) < 18:
        return False
    if MOD_RE.match(linea):
        return False
    if texto.startswith(('Total', 'Ámbito', 'Materia', 'Familia', 'Código', 'Módulo')):
        return False
    return True


def nombre_limpio(partes: list[str]) -> str:
    texto = ''
    for parte in partes:
        parte = parte.strip()
        if not parte:
            continue
        if not texto:
            texto = parte
        elif texto.endswith('-'):
            compuesto = texto.lower().endswith(('físico-', 'fisico-', 'técnico-', 'tecnico-'))
            texto = texto + parte if compuesto else texto[:-1] + parte
        else:
            texto += ' ' + parte
    return re.sub(r'\s+', ' ', texto).strip()


def parsear(texto: str, nivel: str) -> list[dict]:
    lineas = texto.splitlines()
    familia = None
    ciclo = None
    curso = None
    resultado: list[dict] = []
    pendiente: list[str] = []
    i = 0
    while i < len(lineas):
        linea = lineas[i]
        limpia = linea.strip()
        if not limpia:
            i += 1
            continue
        if limpia.startswith('Ámbito'):
            break
        if limpia.startswith(('Anexo', 'ANEXO', 'Familia', 'Código')):
            i += 1
            continue
        if re.match(r'^[-–]?\s*\d+\s+de\s+\d+$', limpia):
            i += 1
            continue
        if limpia.startswith('Total'):
            pendiente = []
            i += 1
            continue

        coincidencia = MOD_RE.match(linea)
        if coincidencia:
            if coincidencia.group('curso'):
                curso = coincidencia.group('curso')
            if curso in ('1', '2') and ciclo is not None:
                nombre = coincidencia.group('nombre').strip()
                posteriores: list[str] = []
                j = i + 1
                while j < len(lineas):
                    siguiente = lineas[j]
                    if not siguiente.strip():
                        j += 1
                        continue
                    if es_linea_nombre(siguiente):
                        posteriores.append(siguiente.strip())
                        j += 1
                        continue
                    break
                siguiente_modulo = MOD_RE.match(lineas[j]) if j < len(lineas) else None
                siguiente_sin_nombre = bool(
                    siguiente_modulo and not siguiente_modulo.group('nombre').strip()
                )
                if siguiente_sin_nombre and nombre:
                    posteriores_ahora: list[str] = []
                    prefijo_siguiente = posteriores
                elif siguiente_sin_nombre and not nombre:
                    if len(posteriores) >= 2:
                        posteriores_ahora = posteriores[:1]
                        prefijo_siguiente = posteriores[1:]
                    else:
                        posteriores_ahora = posteriores
                        prefijo_siguiente = []
                else:
                    posteriores_ahora = posteriores
                    prefijo_siguiente = []

                nombre_completo = nombre_limpio(
                    pendiente + ([nombre] if nombre else []) + posteriores_ahora
                )
                if nombre_completo and not any(
                    modulo['codigo'] == coincidencia.group('codigo')
                    and modulo['curso'] == curso
                    for modulo in ciclo['modulos']
                ):
                    ciclo['modulos'].append(
                        {
                            'curso': curso,
                            'codigo': coincidencia.group('codigo'),
                            'nombre': nombre_completo,
                            'horas_semanales': int(coincidencia.group('sem')),
                            'horas_anuales': int(coincidencia.group('anio').replace('.', ''))
                        }
                    )
                pendiente = prefijo_siguiente
                i = j
                continue

        if limpia.startswith('FAMILIA:'):
            familia = limpia.split(':', 1)[1].strip()
            pendiente = []
            i += 1
            continue

        sangria = len(linea) - len(linea.lstrip())
        if 1 <= sangria <= 4 and not CURSO_RE.match(linea):
            if limpia.upper() == limpia and len(limpia) > 3:
                familia = limpia
            else:
                ciclo = {
                    'nivel': nivel,
                    'familia_profesional': familia,
                    'denominacion': limpia,
                    'modulos': []
                }
                resultado.append(ciclo)
            pendiente = []
            i += 1
            continue

        familia_match = FAMILIA_RE.match(limpia)
        if sangria <= 3 and familia_match and len(limpia) >= 4:
            familia = limpia
            pendiente = []
            i += 1
            continue

        if es_linea_nombre(linea):
            pendiente.append(limpia)
            i += 1
            continue

        pendiente = []
        i += 1
    return resultado


def siglas(nombre: str) -> str:
    palabras = [
        palabra
        for palabra in re.split(r'[^A-Za-zÁÉÍÓÚÑÜ0-9]+', nombre)
        if palabra and norm(palabra) not in CONECTORES
    ]
    resultado = ''.join(palabra[0] for palabra in palabras).upper()
    return resultado[:4] if len(resultado) >= 2 else nombre[:4].upper()


def slug(nombre: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', norm(nombre)).strip('-')


def descargar_pdf(url: str, destino: Path) -> None:
    peticion = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(peticion, timeout=60) as respuesta:
        destino.write_bytes(respuesta.read())


def main() -> None:
    with tempfile.TemporaryDirectory(prefix='horarios-') as temporal:
        tmp = Path(temporal)
        fuentes: dict[tuple[str, str], list[dict]] = {}
        for (nivel, curso), url in PDFS.items():
            pdf = tmp / f'{nivel}-{curso}.pdf'
            txt = tmp / f'{nivel}-{curso}.txt'
            descargar_pdf(url, pdf)
            subprocess.run(['pdftotext', '-layout', str(pdf), str(txt)], check=True)
            fuentes[(nivel, curso)] = parsear(txt.read_text(encoding='utf-8'), nivel)

    # Por curso: primer PDF para 1º y segundo PDF para 2º. Si un ciclo solo
    # aparece en una de las dos fuentes, se usa la disponible.
    por_ciclo: dict[tuple[str, str], dict] = {}
    for (nivel, curso), ciclos in fuentes.items():
        for ciclo in ciclos:
            clave = (nivel, norm(ciclo['denominacion']))
            entrada = por_ciclo.setdefault(
                clave,
                {
                    'nivel': nivel,
                    'denominacion': titulo(ciclo['denominacion']),
                    'familia_profesional': titulo(ciclo['familia_profesional'] or ''),
                    'fuentes': {}
                }
            )
            entrada['fuentes'][curso] = ciclo['modulos']

    catalogo = []
    for (nivel, _), entrada in por_ciclo.items():
        modulos: dict[tuple[str, str], dict] = {}
        for curso in ('1', '2'):
            fuente = entrada['fuentes'].get(curso) or entrada['fuentes'].get('1' if curso == '2' else '2') or []
            vistos = set()
            for modulo in sorted(fuente, key=lambda item: item['codigo']):
                if modulo['curso'] != curso:
                    continue
                clave = norm(modulo['nombre']).replace(' ', '')
                if clave in vistos:
                    continue
                vistos.add(clave)
                modulos[(curso, modulo['codigo'])] = modulo
        if not modulos:
            continue
        catalogo.append(
            {
                'nivel': nivel,
                'denominacion': entrada['denominacion'],
                'familia_profesional': entrada['familia_profesional'],
                'modulos': sorted(modulos.values(), key=lambda item: (item['curso'], item['codigo']))
            }
        )

    usados = set()
    for ciclo in sorted(catalogo, key=lambda item: (['GB', 'GM', 'GS'].index(item['nivel']), item['denominacion'])):
        base = (
            'daw'
            if ciclo['nivel'] == 'GS' and norm(ciclo['denominacion']) == 'desarrollo de aplicaciones web'
            else f"{ciclo['nivel'].lower()}-{slug(ciclo['denominacion'])}"
        )
        identificador = base
        numero = 2
        while identificador in usados:
            identificador = f'{base}-{numero}'
            numero += 1
        usados.add(identificador)
        ciclo['id'] = identificador
        ciclo['abreviatura'] = 'DAW' if identificador == 'daw' else siglas(ciclo['denominacion'])

    datos = {
        'curso_academico': CURSO,
        'fuente': FUENTE,
        'actualizado': '2026-10-31',
        'niveles': ['GB', 'GM', 'GS'],
        'ciclos': sorted(catalogo, key=lambda item: (['GB', 'GM', 'GS'].index(item['nivel']), item['denominacion']))
    }
    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    SALIDA.write_text(json.dumps(datos, ensure_ascii=False, indent=2), encoding='utf-8')
    print(
        f'{len(datos["ciclos"])} ciclos y '
        f'{sum(len(ciclo["modulos"]) for ciclo in datos["ciclos"])} módulos → {SALIDA}'
    )


if __name__ == '__main__':
    main()
