/**
 * Validación del documento HTML de normativa que se puede importar.
 *
 * Es deliberadamente laxa: solo comprueba que sea un HTML razonable y que no
 * sea enorme. El documento se muestra aislado en un iframe.
 */
const TAMANO_MAXIMO = 20 * 1024 * 1024

/** Evento interno para que la vista recargue el iframe tras importar. */
export const EVENTO_NORMATIVA_ACTUALIZADA = 'normativa-fpt:actualizada'

export function validarHtmlNormativa(html: string): void {
  if (!html.trim()) {
    throw new Error('El archivo está vacío.')
  }
  if (html.length > TAMANO_MAXIMO) {
    throw new Error('El archivo es demasiado grande (máximo 20 MB).')
  }
  if (!/<!doctype\s+html|<html[\s>]/i.test(html)) {
    throw new Error('No parece un documento HTML: falta <html> o <!doctype html>.')
  }
}
