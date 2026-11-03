# Aula Nova 1.1.1

**Corrección de datos de DWES en segundo de DAW.**

**Descarga:** [GitHub Releases v1.1.1](https://github.com/msanchez07/docente-curso/releases/tag/v1.1.1)

- **Fecha:** 03/11/2026
- **Autor:** Manuel Sánchez Gomis · Profesor de Ciclos Formativos de Informática
- **Contacto:** [me.sanchezgomis@edu.gva.es](mailto:me.sanchezgomis@edu.gva.es)
- **Repositorio:** [github.com/msanchez07/docente-curso](https://github.com/msanchez07/docente-curso)

## Corrección

- Actualiza los módulos de DAW desde el texto consolidado del **RD 405/2023**.
- **DWES (0613), segundo de DAW**, recupera los criterios:
  - `RA7 · h`
  - `RA9 · h`
- Esto permite importar unidades que usan esos CE sin el error
  «El criterio RA7 · h no pertenece al módulo del grupo».
- También se actualizan los RA/CE de 0373, 0483, 0484, 0485, 0487, 0613, 0614 y 0615.

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

- **macOS:** la aplicación va firmada **ad-hoc**, pero no notarizada. Si aparece el aviso de
  seguridad, abre con **clic derecho → Abrir → Abrir** o ejecuta:

  ```bash
  xattr -cr "/Applications/Aula Nova.app"
  open "/Applications/Aula Nova.app"
  ```

- **Windows:** el instalador no está firmado; SmartScreen puede mostrar un aviso.
- **Linux:** el AppImage se ejecuta con `chmod +x` y doble clic. El `.deb` se instala con
  `sudo apt install ./aula-nova_amd64.deb`.
- **Actualización:** al arrancar, la app comprueba GitHub Releases y avisa antes de descargar e
  instalar. En macOS puede descargar el DMG y abrirlo para arrastrarlo a Aplicaciones.
