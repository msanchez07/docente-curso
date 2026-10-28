/**
 * Prueba de humo del canal de datos del BOE.
 *
 * Ejecuta Electron sin abrir ventana, resuelve el directorio de recursos igual
 * que el proceso principal y comprueba que `resources/boe/*.json` se lee y
 * resume correctamente. Sirve para verificar la ruta en desarrollo/empaquetado.
 *
 *   npx electron scripts/smoke-boe.mjs
 */
import { app } from 'electron'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

app.whenReady().then(() => {
  const raiz = app.isPackaged ? process.resourcesPath : process.cwd()
  const dir = join(raiz, 'resources', 'boe')

  console.log(`[smoke] appPath   = ${app.getAppPath()}`)
  console.log(`[smoke] cwd       = ${process.cwd()}`)
  console.log(`[smoke] empaquetado = ${app.isPackaged}`)
  console.log(`[smoke] dir BOE    = ${dir}`)

  if (!existsSync(dir)) {
    console.error('[smoke] ERROR: no existe el directorio del BOE')
    app.exit(1)
    return
  }

  for (const fichero of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const ciclo = JSON.parse(readFileSync(join(dir, fichero), 'utf-8'))
    const ra = ciclo.modulos.reduce((t, m) => t + m.ra.length, 0)
    const ce = ciclo.modulos.reduce((t, m) => t + m.ra.reduce((s, r) => s + r.ce.length, 0), 0)
    console.log(
      `[smoke] ${fichero}: ${ciclo.denominacion} → ${ciclo.modulos.length} módulos, ${ra} RA, ${ce} CE`
    )
  }

  console.log('[smoke] OK')
  app.exit(0)
})
