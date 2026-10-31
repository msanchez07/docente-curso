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
7261012be8a323b907144a69e904338d8c0022a272266f35ea466bc65e181bdf  dist/AulaNova-1.0.0-mac-arm64.dmg
7ba98c5b5acbbeecad168dce8a63aeb98f60d606812a37682e5be0ed676eb1c2  dist/AulaNova-1.0.0-mac-x64.dmg
fc5c7cefae48e04b8490b39ecd67383d41072d8b773c6a0fb9e680ae45c129af  dist/AulaNova-1.0.0-win-x64-setup.exe
ef9ef17a64216daae6e8de44087bbdd87f69a93949bf01f407e7527631b3aea3  dist/AulaNova-1.0.0-linux-x86_64.AppImage
93077d003014ca880082a6178b7096bc8d153626b25a503d56b88d969e175337  dist/aula-nova_1.0.0_amd64.deb
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
