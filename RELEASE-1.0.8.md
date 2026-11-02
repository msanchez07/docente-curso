# Aula Nova 1.0.8

**Gestión de cursos académicos, entregas y calificaciones de Formación Profesional.**

**Descarga:** [GitHub Releases v1.0.8](https://github.com/msanchez07/docente-curso/releases/tag/v1.0.8)

- **Fecha:** 31/10/2026
- **Autor:** Manuel Sánchez Gomis · Profesor de Ciclos Formativos de Informática
- **Contacto:** [me.sanchezgomis@edu.gva.es](mailto:me.sanchezgomis@edu.gva.es)
- **Repositorio:** [github.com/msanchez07/docente-curso](https://github.com/msanchez07/docente-curso)

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

- **Programación de aula:** vista por defecto «Pendientes hasta hoy», con los días de clase sin contenido desde el inicio del curso.
- **macOS:** la actualización descarga el DMG y lo abre para arrastrarlo a Aplicaciones; la instalación automática de Squirrel requiere firma Developer ID.
- **Calendario:** el diálogo de importación permite descargar el esquema antes de rellenarlo.
- **Barra de actualización:** muestra el progreso de descarga y los errores, con opción de descarga manual.
- **Corrección:** evita el error «An object could not be cloned» al guardar la configuración del profesorado y del centro.
- **Actualizaciones automáticas:** en macOS la instalación automática requiere una app firmada y notarizada por Apple. Si Squirrel no puede aplicarla, la app muestra el error y ofrece descargar el DMG manualmente.
- **Actualizaciones automáticas:** la aplicación comprueba GitHub Releases al iniciar y avisa antes de descargar e instalar.
- **macOS:** la aplicación va firmada **ad-hoc**, pero no notarizada. Si aparece el aviso
  «Apple no ha podido verificar que Aula Nova no contenga software malicioso», no significa que
  tenga malware: es el aviso normal de una app sin notarización. Ábrela con **clic derecho →
  Abrir → Abrir**, o ejecuta:

  ```bash
  xattr -cr "/Applications/Aula Nova.app"
  open "/Applications/Aula Nova.app"
  ```

  También puedes ir a **Ajustes del Sistema → Privacidad y seguridad** y pulsar **Abrir igualmente**.

- **Windows:** el instalador no está firmado; SmartScreen puede mostrar un aviso.
- **Linux:** el AppImage se ejecuta con `chmod +x` y doble clic. El `.deb` se instala con
  `sudo apt install ./aula-nova_amd64.deb`.

## Datos incluidos

La aplicación **no arranca con datos de prueba**. Incluye únicamente:

- datos oficiales del BOE para DAW (RA/CE);
- catálogo oficial de secuenciación y horarios 2026/2027 de Grado Básico, Medio y Superior.

Los datos de ejemplo quedan restringidos a la previsualización web de desarrollo.
