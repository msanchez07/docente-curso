/**
 * Genera la guía visual en HTML a partir del mismo contenido que usa la guía
 * integrada de la aplicación (`src/renderer/src/content/guia.ts`).
 *
 * Uso: npm run guia:html
 */
import { build } from 'esbuild'
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'

const raiz = resolve(import.meta.dirname, '..')
const salida = join(raiz, 'docs')
const imagenes = join(salida, 'guia')
const entrada = join(tmpdir(), `guia-aula-nova-${process.pid}.mjs`)
const fuente = join(raiz, 'src/renderer/src/content/guia.ts')

const resultado = await build({
  stdin: {
    contents: `import { seccionesGuia } from ${JSON.stringify(fuente)};\nexport { seccionesGuia };`,
    loader: 'ts',
    resolveDir: raiz,
    sourcefile: 'guia-entrada.ts'
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
  plugins: [
    {
      name: 'png-como-nombre',
      setup(build) {
        build.onLoad({ filter: /\.png$/ }, (args) => ({
          contents: `export default ${JSON.stringify(basename(args.path))};`,
          loader: 'js'
        }))
      }
    }
  ]
})

writeFileSync(entrada, resultado.outputFiles[0].text, 'utf-8')
const { seccionesGuia } = await import(pathToFileURL(entrada).href)
rmSync(entrada, { force: true })

mkdirSync(imagenes, { recursive: true })
for (const seccion of seccionesGuia) {
  copyFileSync(
    join(raiz, 'src/renderer/src/assets/guia', seccion.imagen),
    join(imagenes, seccion.imagen)
  )
}
copyFileSync(join(raiz, 'build/icon.png'), join(imagenes, 'icon.png'))

function escapar(texto) {
  return String(texto)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function enlace(id) {
  return `#${id}`
}

const indice = seccionesGuia
  .map(
    (seccion, indiceSeccion) => `
        <a class="indice__enlace" href="${enlace(seccion.id)}">
          <span class="indice__numero">${String(indiceSeccion + 1).padStart(2, '0')}</span>
          <span>${escapar(seccion.titulo)}</span>
        </a>`
  )
  .join('')

const secciones = seccionesGuia
  .map(
    (seccion, indiceSeccion) => `
      <section class="seccion" id="${escapar(seccion.id)}">
        <div class="seccion__cabecera">
          <span class="seccion__numero">${String(indiceSeccion + 1).padStart(2, '0')}</span>
          <div>
            <h2>${escapar(seccion.titulo)}</h2>
            <p class="seccion__resumen">${escapar(seccion.resumen)}</p>
          </div>
        </div>
        <a class="captura" href="guia/${escapar(seccion.imagen)}" target="_blank" rel="noreferrer">
          <img src="guia/${escapar(seccion.imagen)}" alt="Captura de ${escapar(seccion.titulo)}" loading="lazy" />
          <span class="captura__pie">Captura real de ${escapar(seccion.titulo)} · clic para ampliar</span>
        </a>
        <div class="seccion__texto">
          ${seccion.explicacion.map((parrafo) => `<p>${escapar(parrafo)}</p>`).join('')}
        </div>
        <div class="puntos">
          ${seccion.puntos
            .map(
              (punto) => `
            <article class="punto">
              <h3>${escapar(punto.titulo)}</h3>
              <p>${escapar(punto.detalle)}</p>
            </article>`
            )
            .join('')}
        </div>
      </section>`
  )
  .join('')

const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="Guía de uso de Aula Nova: gestión de cursos académicos, entregas y calificaciones de FP." />
    <title>Guía de uso · Aula Nova</title>
    <style>
      :root {
        --tinta: #0f2438;
        --tinta-suave: #52657a;
        --navy: #0b1f33;
        --navy-2: #143a5a;
        --acento: #2563eb;
        --acento-suave: #eef4ff;
        --borde: #dbe3ec;
        --fondo: #f5f8fc;
        --blanco: #ffffff;
        --dorado: #e8a33d;
        --sombra: 0 18px 50px rgba(15, 36, 56, 0.10);
      }
      * { box-sizing: border-box; }
      html { scroll-behavior: smooth; }
      body {
        margin: 0;
        background: var(--fondo);
        color: var(--tinta);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        line-height: 1.65;
      }
      a { color: var(--acento); }
      .hero {
        background:
          radial-gradient(circle at 85% 5%, rgba(45, 212, 191, 0.25), transparent 34%),
          radial-gradient(circle at 8% 95%, rgba(232, 163, 61, 0.16), transparent 32%),
          linear-gradient(135deg, var(--navy), var(--navy-2));
        color: #fff;
        padding: 56px 24px 64px;
      }
      .hero__interior, .contenedor { width: min(1120px, 100%); margin: 0 auto; }
      .marca { display: flex; align-items: center; gap: 14px; margin-bottom: 46px; }
      .marca img { width: 44px; height: 44px; border-radius: 12px; box-shadow: 0 10px 24px rgba(0,0,0,.28); }
      .marca strong { display: block; font-size: 15px; letter-spacing: .06em; text-transform: uppercase; }
      .marca span { display: block; color: #a9bbcf; font-size: 12px; }
      .hero h1 { margin: 0; max-width: 760px; font-size: clamp(38px, 7vw, 72px); line-height: 1.02; letter-spacing: -.04em; }
      .hero p { max-width: 720px; margin: 18px 0 0; color: #c9d8e8; font-size: 17px; }
      .hero__meta { display: flex; flex-wrap: wrap; gap: 8px 18px; margin-top: 26px; color: #a9bbcf; font-size: 13px; }
      .hero__meta a { color: #eaf2fb; }
      .indice {
        margin: -34px auto 0;
        position: relative;
        width: min(1120px, calc(100% - 32px));
        padding: 18px;
        border: 1px solid var(--borde);
        border-radius: 18px;
        background: var(--blanco);
        box-shadow: var(--sombra);
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
        gap: 8px;
      }
      .indice__enlace {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 9px 11px;
        border-radius: 10px;
        color: var(--tinta);
        text-decoration: none;
        font-size: 13.5px;
        font-weight: 550;
        transition: background .14s ease, color .14s ease;
      }
      .indice__enlace:hover { background: var(--acento-suave); color: var(--acento); }
      .indice__numero { color: var(--acento); font-size: 11px; font-weight: 700; font-variant-numeric: tabular-nums; }
      .contenedor { padding: 54px 24px 90px; }
      .seccion {
        padding: 54px 0 60px;
        border-top: 1px solid var(--borde);
        scroll-margin-top: 24px;
      }
      .seccion:first-of-type { border-top: 0; padding-top: 18px; }
      .seccion__cabecera { display: flex; gap: 18px; align-items: flex-start; margin-bottom: 24px; }
      .seccion__numero {
        flex: 0 0 auto;
        display: inline-grid;
        place-items: center;
        width: 42px; height: 42px;
        border-radius: 12px;
        background: var(--acento);
        color: #fff;
        font-size: 12px;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }
      h2 { margin: 0; font-size: clamp(25px, 4vw, 38px); line-height: 1.12; letter-spacing: -.025em; }
      .seccion__resumen { margin: 6px 0 0; color: var(--tinta-suave); font-size: 15.5px; }
      .captura {
        display: block;
        overflow: hidden;
        border: 1px solid var(--borde);
        border-radius: 16px;
        background: #fff;
        box-shadow: var(--sombra);
        text-decoration: none;
      }
      .captura img { display: block; width: 100%; height: auto; }
      .captura__pie { display: block; padding: 10px 14px; border-top: 1px solid var(--borde); color: var(--tinta-suave); font-size: 12px; }
      .seccion__texto { max-width: 880px; margin-top: 22px; }
      .seccion__texto p { margin: 0 0 12px; color: #34485e; font-size: 15px; }
      .puntos { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 12px; margin-top: 20px; }
      .punto { padding: 17px 18px; border: 1px solid var(--borde); border-radius: 14px; background: #fff; }
      .punto h3 { margin: 0 0 5px; font-size: 14.5px; }
      .punto p { margin: 0; color: var(--tinta-suave); font-size: 13.5px; }
      .pie {
        padding: 34px 24px 50px;
        border-top: 1px solid var(--borde);
        background: #eef3f9;
        color: var(--tinta-suave);
        font-size: 13px;
      }
      .pie__interior { width: min(1120px, 100%); margin: 0 auto; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; }
      @media (max-width: 640px) {
        .hero { padding-top: 34px; }
        .marca { margin-bottom: 30px; }
        .seccion__cabecera { gap: 12px; }
        .seccion { padding: 40px 0 44px; }
      }
      @media print {
        .hero { background: #fff; color: var(--tinta); }
        .hero p, .hero__meta, .marca span { color: var(--tinta-suave); }
        .indice { box-shadow: none; }
        .captura { box-shadow: none; break-inside: avoid; }
        .seccion { break-inside: avoid; }
      }
    </style>
  </head>
  <body>
    <header class="hero">
      <div class="hero__interior">
        <div class="marca">
          <img src="guia/icon.png" alt="Aula Nova" />
          <div>
            <strong>Aula Nova</strong>
            <span>Gestión de cursos académicos</span>
          </div>
        </div>
        <h1>Guía de uso</h1>
        <p>La misma guía que encontrarás dentro de la aplicación, con capturas reales de cada pantalla.</p>
        <div class="hero__meta">
          <span>Versión 1.0</span>
          <span>Manuel Sánchez Gomis · Profesor de Ciclos Formativos de Informática</span>
          <a href="mailto:me.sanchezgomis@edu.gva.es">me.sanchezgomis@edu.gva.es</a>
        </div>
      </div>
    </header>

    <nav class="indice" aria-label="Índice de la guía">
      ${indice}
    </nav>

    <main class="contenedor">
      ${secciones}
    </main>

    <footer class="pie">
      <div class="pie__interior">
        <span>Aula Nova · Guía de uso · v1.0.0</span>
        <span>Manuel Sánchez Gomis · me.sanchezgomis@edu.gva.es</span>
      </div>
    </footer>
  </body>
</html>`

writeFileSync(join(salida, 'index.html'), html, 'utf-8')
writeFileSync(join(salida, '.nojekyll'), '', 'utf-8')
console.log(`Guía HTML generada: ${join(salida, 'index.html')} (${seccionesGuia.length} secciones)`)
