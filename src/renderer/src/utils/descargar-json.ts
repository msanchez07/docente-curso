/**
 * Descarga un esquema JSON.
 *
 * En Electron usa el diálogo nativo «Guardar como»; en la previsualización web
 * cae al enlace Blob habitual.
 */
export async function descargarJson(nombre: string, datos: unknown): Promise<void> {
  if (window.api?.archivos?.guardarJson) {
    try {
      const resultado = await window.api.archivos.guardarJson(nombre, datos)
      if (resultado.ok || resultado.cancelado) return
    } catch {
      // Si falla el diálogo nativo, se intenta la descarga del navegador.
    }
  }

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
