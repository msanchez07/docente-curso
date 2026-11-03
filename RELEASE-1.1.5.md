# Aula Nova 1.1.5

**Fechas de tipo «Otras» y unificación de «Evaluación».**

**Descarga:** [GitHub Releases v1.1.5](https://github.com/msanchez07/docente-curso/releases/tag/v1.1.5)

- **Fecha:** 03/11/2026
- **Autor:** Manuel Sánchez Gomis · Profesor de Ciclos Formativos de Informática
- **Contacto:** [me.sanchezgomis@edu.gva.es](mailto:me.sanchezgomis@edu.gva.es)
- **Repositorio:** [github.com/msanchez07/docente-curso](https://github.com/msanchez07/docente-curso)

## Cambios

- **Programación didáctica → Fechas:** nuevo tipo **Otras** además de Evaluación y Examen, para
  anotar reuniones, entregas de notas, visitas u otras fechas.
- Las fechas de tipo «Otras» aparecen en el calendario y en el dashboard del grupo.
- **Terminología unificada:** la interfaz usa **Evaluación/Evaluaciones** en lugar de
  «Avaluación/Avaluaciones». El identificador interno `avaluacion_id` se mantiene por
  compatibilidad con los datos existentes.
- **Criterios:** se elimina el aviso que explicaba la calificación por unidades, por resultar
  redundante.
- Se mantiene lo incluido en **1.1.4**:
  - botón **Buscar actualizaciones** en `Configuración → Acerca de`;
  - corrección de `An object could not be cloned` al guardar unidades;
  - días de clase de la quincena visibles en la vista de tabla.

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
