/**
 * Descarga un esquema JSON como fichero, sin depender de Electron.
 */
export function descargarJson(nombre: string, datos: unknown): void {
  const contenido = JSON.stringify(datos, null, 2)
  const blob = new Blob([contenido], { type: 'application/schema+json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
