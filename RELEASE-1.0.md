# Aula Nova 1.0

**Gestión de cursos académicos, entregas y calificaciones de Formación Profesional.**

- **Fecha:** 31/10/2026
- **Autor:** Manuel Sánchez Gomis · Profesor de Ciclos Formativos de Informática
- **Contacto:** [me.sanchezgomis@edu.gva.es](mailto:me.sanchezgomis@edu.gva.es)
- **Repositorio:** [github.com/msanchez07/docente-curso](https://github.com/msanchez07/docente-curso)

## Artefactos

| Plataforma                | Archivo                                     |
| ------------------------- | ------------------------------------------- |
| macOS Apple Silicon       | `dist/AulaNova-1.0.0-mac-arm64.dmg`         |
| macOS Intel               | `dist/AulaNova-1.0.0-mac-x64.dmg`           |
| Windows x64               | `dist/AulaNova-1.0.0-win-x64-setup.exe`     |
| Linux x64 · AppImage      | `dist/AulaNova-1.0.0-linux-x86_64.AppImage` |
| Linux x64 · Debian/Ubuntu | `dist/aula-nova_1.0.0_amd64.deb`            |

También se generan los ZIP de macOS en `dist/`.

## SHA-256

```text
b8c8b35c9f1872624368e6b1e540348bdec4f45ad351f8bcc17645e303bfd4ca  AulaNova-1.0.0-mac-arm64.dmg
f54b317bfa2252a895c455a9d01dba7659e6c415a95c81e2872eff6c0a8f07bf  AulaNova-1.0.0-mac-x64.dmg
25751e1cd46320f216e3da750fd770d98a33c0e018498a2a589562233dbf770e  AulaNova-1.0.0-win-x64-setup.exe
16ac5a21957e2f6cbf7b53f916f3284d47782e0f2466639dd77e05878cfc615f  AulaNova-1.0.0-linux-x86_64.AppImage
227bffa5fba42315977ca33dc25c968a3a903fb1ce568d31b61fe49da5329e58  aula-nova_1.0.0_amd64.deb
```

## Notas de instalación

- **macOS:** las compilaciones no están firmadas ni notarizadas. Si Gatekeeper lo impide, abre
  con clic derecho → **Abrir**.
- **Windows:** el instalador no está firmado; SmartScreen puede mostrar un aviso.
- **Linux:** el AppImage se ejecuta con `chmod +x` y doble clic. El `.deb` se instala con
  `sudo apt install ./aula-nova_1.0.0_amd64.deb`.

## Datos incluidos

La aplicación **no arranca con datos de prueba**. Incluye únicamente:

- datos oficiales del BOE para DAW (RA/CE);
- catálogo oficial de secuenciación y horarios 2026/2027 de Grado Básico, Medio y Superior.

Los datos de ejemplo quedan restringidos a la previsualización web de desarrollo.
