# Aula Nova 1.1.9

**Corregida la edición de sesiones desde el calendario de Programación de aula.**

**Descarga:** [GitHub Releases v1.1.9](https://github.com/msanchez07/docente-curso/releases/tag/v1.1.9)

- **Fecha:** 06/11/2026
- **Autor:** Manuel Sánchez Gomis · Profesor de Ciclos Formativos de Informática
- **Contacto:** [me.sanchezgomis@edu.gva.es](mailto:me.sanchezgomis@edu.gva.es)
- **Repositorio:** [github.com/msanchez07/docente-curso](https://github.com/msanchez07/docente-curso)

## Corrección

- En la vista **Calendario** de Programación de aula, al pulsar un día con una sesión ya guardada
  se carga su contenido en el formulario.
- Al modificar y guardar, se actualiza esa sesión en lugar de crear una nueva fila.
- Después de guardar se puede volver a pulsar el día y editar el contenido de nuevo.
- Los días sin sesiones siguen abriendo el formulario vacío para añadir una sesión nueva.

## Verificación

- `typecheck` correcto.
- **249 tests** en 42 archivos.
- `build` correcto.
- Smoke completo correcto, incluyendo la edición de una sesión desde el calendario y la
  comprobación de que no se duplica.

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
