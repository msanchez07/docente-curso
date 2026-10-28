/**
 * Normalización de texto para los datos de alumnado.
 *
 * Las listas de matrícula suelen llegar todo en mayúsculas («GARCÍA RUIZ,
 * MARÍA»). Se convierten a mayúscula inicial respetando las partículas
 * («de», «del», «la»…) y los guiones/apóstrofes. Si el texto ya viene con
 * minúsculas, se deja tal cual: solo se corrige lo que está todo en mayúsculas.
 */
const PARTICULAS = new Set([
  'de',
  'del',
  'la',
  'las',
  'los',
  'y',
  'e',
  'i',
  'o',
  'u',
  'da',
  'das',
  'do',
  'dos',
  'van',
  'von',
  'di',
  'el',
  'dels',
  'della'
])

function capitalizarPalabra(palabra: string): string {
  return palabra
    .split(/([-'’])/)
    .map((trozo) =>
      trozo === '' || /^[-'’]$/.test(trozo) ? trozo : trozo.charAt(0).toUpperCase() + trozo.slice(1)
    )
    .join('')
}

export function normalizarNombre(texto: string): string {
  const limpio = texto.trim().replace(/\s+/g, ' ')
  if (!limpio) return ''

  const tieneMayusculas = /[A-ZÁÉÍÓÚÜÑÇ]/.test(limpio)
  const esTodoMayusculas = tieneMayusculas && limpio === limpio.toUpperCase()
  if (!esTodoMayusculas) return limpio

  return limpio
    .toLowerCase()
    .split(' ')
    .map((palabra, indice) =>
      indice > 0 && PARTICULAS.has(palabra) ? palabra : capitalizarPalabra(palabra)
    )
    .join(' ')
}

/** Normaliza una lista de nombres separados por comas (p. ej. autores). */
export function normalizarListaNombres(texto: string): string {
  return texto
    .split(',')
    .map((parte) => normalizarNombre(parte))
    .join(', ')
}
