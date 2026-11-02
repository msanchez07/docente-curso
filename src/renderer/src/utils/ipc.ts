/**
 * Convierte un valor reactivo de Vue en un objeto plano serializable.
 *
 * Electron usa structured clone al cruzar el IPC y los proxies de Vue no son
 * clonables, lo que provoca «An object could not be cloned».
 */
export function paraIpc<T>(valor: T): T {
  return JSON.parse(JSON.stringify(valor)) as T
}
