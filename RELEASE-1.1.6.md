# Aula Nova 1.1.6

**Pérdida de evaluación continua, RA de formación en empresa y resumen de pesos.**

**Descarga:** [GitHub Releases v1.1.6](https://github.com/msanchez07/docente-curso/releases/tag/v1.1.6)

- **Fecha:** 03/11/2026
- **Autor:** Manuel Sánchez Gomis · Profesor de Ciclos Formativos de Informática
- **Contacto:** [me.sanchezgomis@edu.gva.es](mailto:me.sanchezgomis@edu.gva.es)
- **Repositorio:** [github.com/msanchez07/docente-curso](https://github.com/msanchez07/docente-curso)

## Cambios

- **Pérdida de evaluación continua por alumno:** nueva acción en Alumnado. El alumno queda marcado
  en ese grupo, se le asigna el bloque global en Convocatorias y su nota final pasa a ser la de la
  convocatoria ordinaria o extraordinaria cuando está registrada.
- **RA en formación en empresa:** en la ficha de formación del alumno se indica qué RA se trabajan
  en la empresa y si son **totales** o **parciales**.
- **Resumen de calificaciones:** si una evaluación tiene pesos propios de categorías, se muestran
  en el resumen final, no solo en la pestaña de la evaluación.
- **Ver todo:** la vista de tabla se mantiene visible aunque no haya filas guardadas.
- Se mantiene lo incluido en **1.1.5**: fechas de tipo «Otras», terminología «Evaluación» y
  eliminación del aviso redundante de Criterios.

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
