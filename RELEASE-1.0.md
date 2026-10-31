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
