# Aula Nova 1.1.2

**Mejora visual de los RA en Criterios y en RA/CE.**

**Descarga:** [GitHub Releases v1.1.2](https://github.com/msanchez07/docente-curso/releases/tag/v1.1.2)

- **Fecha:** 03/11/2026
- **Autor:** Manuel Sánchez Gomis · Profesor de Ciclos Formativos de Informática
- **Contacto:** [me.sanchezgomis@edu.gva.es](mailto:me.sanchezgomis@edu.gva.es)
- **Repositorio:** [github.com/msanchez07/docente-curso](https://github.com/msanchez07/docente-curso)

## Cambios

- **Criterios → RA:** la tabla apretada pasa a filas legibles con:
  - código del RA en un chip;
  - descripción completa con mejor interlineado;
  - peso separado a la derecha, con su `%`.
- **RA/CE:** el índice lateral limita cada descripción a dos líneas y evita listas visualmente
  interminables. El texto completo sigue disponible al seleccionar el RA.
- Se mantiene la corrección de **1.1.1** para `RA7.h` y `RA9.h` de DWES en segundo de DAW.

## Artefactos

| Plataforma                | Archivo                               |
| ------------------------- | ------------------------------------- |
| macOS Apple Silicon       | `dist/AulaNova-mac-arm64.dmg`         |
| macOS Intel               | `dist/AulaNova-mac-x64.dmg`           |
| Windows x64               | `dist/AulaNova-win-x64-setup.exe`     |
| Linux x64 · AppImage      | `dist/AulaNova-linux-x86_64.AppImage` |
| Linux x64 · Debian/Ubuntu | `dist/aula-nova_amd64.deb`            |

También se generan los ZIP de macOS en `dist/`.

## Notas de instalación

- **macOS:** firmada ad-hoc, no notarizada. Si aparece el aviso de seguridad, abre con
  **clic derecho → Abrir → Abrir** o ejecuta:

  ```bash
  xattr -cr "/Applications/Aula Nova.app"
  open "/Applications/Aula Nova.app"
  ```

- **Windows:** el instalador no está firmado; SmartScreen puede mostrar un aviso.
- **Linux:** AppImage con `chmod +x`; `.deb` con `sudo apt install ./aula-nova_amd64.deb`.
- La app comprueba GitHub Releases al iniciar y avisa antes de descargar e instalar.
