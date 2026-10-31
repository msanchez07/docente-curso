/**
 * Firma ad-hoc las aplicaciones de macOS.
 *
 * Sin certificado de desarrollador, electron-builder deja el binario de
 * Electron con su firma de enlazador. macOS puede interpretar eso como una app
 * dañada porque la firma no cubre los recursos del bundle. Una firma ad-hoc
 * del bundle completo evita ese error; sigue sin estar notarizada.
 */
const { execFile } = require('node:child_process')
const { promisify } = require('node:util')

const ejecutar = promisify(execFile)

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return

  const nombre = context.packager.appInfo.productFilename
  const aplicacion = `${context.appOutDir}/${nombre}.app`
  await ejecutar('codesign', ['--force', '--deep', '--sign', '-', aplicacion])
  console.log(`[afterPack] Firma ad-hoc aplicada a ${aplicacion}`)
}
