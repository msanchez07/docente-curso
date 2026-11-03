# Aula Nova 1.1.0

**Gestión de cursos académicos, entregas y calificaciones de Formación Profesional.**

**Descarga:** [GitHub Releases v1.1.0](https://github.com/msanchez07/docente-curso/releases/tag/v1.1.0)

- **Fecha:** 03/11/2026
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

## Novedades principales

### Currículos completos

- **181 ciclos** del catálogo 2026/2027 con módulos, RA y CE.
- **14.282 RA** y **105.927 CE** en los ficheros curriculares.
- Datos generados desde el dosier de la Conselleria, los Reales Decretos del BOE y los
  decretos autonómicos del DOGV.
- Informe de cobertura incluido en la aplicación y en
  [`resources/boe/COBERTURA.md`](./resources/boe/COBERTURA.md).

### Cursos de especialización

- **36 cursos de especialización** con **154 módulos**, **855 RA** y **5.695 CE**.
- Nuevo nivel **Curso de especialización** en el selector de grupos.
- Catálogo propio en `resources/horarios/cursos-especializacion-2026-27.json`.
- Informe de cobertura en
  [`resources/boe/COBERTURA-ESPECIALIZACION.md`](./resources/boe/COBERTURA-ESPECIALIZACION.md).

### Importación y programación

- **Importador de currículos con esquema JSON** en `Ajustes → Currículo`.
- Permite importar un ciclo o un array de ciclos; valida la estructura y conserva los pesos ya
  configurados.
- **Módulos compartidos** entre ciclos mediante la tabla `modulo_ciclos`: un mismo módulo puede
  aparecer en varios ciclos sin duplicar sus RA/CE.
- Importación de unidades con fechas ISO completas, criterios alternativos y claves
  `ra_codigo`/`ce_codigo`.
- **Borrar todas las unidades** de un grupo conservando las sesiones de la programación.

## Datos incluidos

La aplicación **no arranca con datos de prueba**. Incluye:

- 181 ciclos del catálogo oficial de secuenciación y horarios 2026/2027.
- 36 cursos de especialización.
- RA/CE oficiales de todos los ciclos y cursos de especialización, con cobertura parcial en
  aquellos módulos que las fuentes públicas no documentan (ámbitos de FP Básica, proyectos
  intermodulares y optativos).

Los datos de ejemplo quedan restringidos a la previsualización web de desarrollo.

## Notas de instalación

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
- **Actualizaciones:** la aplicación comprueba GitHub Releases al iniciar. En macOS, la
  instalación automática de Squirrel requiere firma Developer ID; si no puede aplicarla, descarga
  el DMG y lo abre para arrastrarlo a Aplicaciones.
