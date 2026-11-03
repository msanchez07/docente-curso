# Aula Nova 1.1.4

**Búsqueda manual de actualizaciones y correcciones de programación.**

**Descarga:** [GitHub Releases v1.1.4](https://github.com/msanchez07/docente-curso/releases/tag/v1.1.4)

- **Fecha:** 03/11/2026
- **Autor:** Manuel Sánchez Gomis · Profesor de Ciclos Formativos de Informática
- **Contacto:** [me.sanchezgomis@edu.gva.es](mailto:me.sanchezgomis@edu.gva.es)
- **Repositorio:** [github.com/msanchez07/docente-curso](https://github.com/msanchez07/docente-curso)

## Cambios

- **Buscar actualizaciones:** nuevo botón en `Configuración → Acerca de`, con estado de la
  comprobación y aviso si ya se tiene la última versión.
- **Guardar unidades:** se serializa el formulario antes de enviarlo por IPC. Corrige el error
  `An object could not be cloned` al guardar fechas, contenidos y criterios.
- **Quincena en tabla:** la vista de tabla muestra también los días de clase de la quincena que
  todavía no tienen fila guardada, no solo las sesiones ya creadas.
- Se mantiene la corrección de **1.1.3**: las unidades sin pesos ya no se bloquean por el reparto
  de pesos.

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
