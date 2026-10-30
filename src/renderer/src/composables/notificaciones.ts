import { ref } from 'vue'

export type TipoNotificacion = 'ok' | 'error' | 'aviso'

export interface Notificacion {
  id: number
  mensaje: string
  tipo: TipoNotificacion
}

let siguienteId = 1
export const notificaciones = ref<Notificacion[]>([])

export function cerrarNotificacion(id: number): void {
  notificaciones.value = notificaciones.value.filter((notificacion) => notificacion.id !== id)
}

export function notificar(mensaje: string, tipo: TipoNotificacion = 'ok', duracion = 3600): void {
  if (!mensaje.trim()) return
  const notificacion: Notificacion = {
    id: siguienteId++,
    mensaje: mensaje.trim(),
    tipo
  }
  notificaciones.value = [...notificaciones.value, notificacion]
  window.setTimeout(() => cerrarNotificacion(notificacion.id), duracion)
}
