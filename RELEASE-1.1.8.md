# Aula Nova 1.1.8

**Auditoría final: programación de aula, faltas, convocatorias y unidades ponderadas.**

**Descarga:** [GitHub Releases v1.1.8](https://github.com/msanchez07/docente-curso/releases/tag/v1.1.8)

- **Fecha:** 06/11/2026
- **Autor:** Manuel Sánchez Gomis · Profesor de Ciclos Formativos de Informática
- **Contacto:** [me.sanchezgomis@edu.gva.es](mailto:me.sanchezgomis@edu.gva.es)
- **Repositorio:** [github.com/msanchez07/docente-curso](https://github.com/msanchez07/docente-curso)

## Correcciones

- **Programación de aula:** se pueden guardar cambios de hora o de unidad de una sesión ya
  creada. Antes el botón «Guardar día» no se activaba si solo cambiaban esos campos.
- **Programación de aula:** los festivos y días no lectivos ya no aparecen como días pendientes
  ni ocupan huecos vacíos en la quincena.
- **Faltas:** corregido el error `An object could not be cloned` al cargar y guardar la
  configuración.
- **Convocatorias:** la vista independiente ya muestra y permite crear tanto la convocatoria
  ordinaria como la extraordinaria. La nota final se refresca al modificar una convocatoria
  desde calificaciones.
- **Unidades de programación:** se han habilitado los campos de trimestre, peso y plantilla de
  calificación. La nota final ya pondera por unidades y trimestres cuando hay unidades
  ponderadas.
- **Entregas:** el formulario solo exige unidad cuando el grupo calcula por unidades; además,
  el guardado de rúbricas adjuntas y la exportación de entregas ya no fallan por objetos
  reactivos de Vue.
- **Calendario del curso:** se pueden consultar los hitos de meses anteriores.
- **Currículo:** el importador JSON vuelve a estar accesible desde **Cursos académicos**.

## Verificación

- `typecheck` correcto.
- **249 tests** en 42 archivos.
- `build` correcto.
- Smoke completo correcto, con recorrido de todas las rutas y pruebas de alta, importación,
  edición, tabla y calendario de programación.

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
- La release no incluye datos de prueba: arranca vacía y solo contiene el catálogo oficial.
