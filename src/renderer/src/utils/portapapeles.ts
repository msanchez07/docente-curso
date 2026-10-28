/** Copia texto al portapapeles con un fallback para contextos sin Clipboard API. */
export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto)
      return true
    }
  } catch {
    // Se intenta el fallback clásico.
  }

  try {
    const area = document.createElement('textarea')
    area.value = texto
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.focus()
    area.select()
    const copiado = document.execCommand('copy')
    area.remove()
    return copiado
  } catch {
    return false
  }
}
