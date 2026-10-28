/**
 * Datos de ejemplo para la programación de aula.
 *
 * Se usan en la previsualización web y en el botón «Cargar datos de ejemplo»
 * del editor. No forman parte de los datos reales del curso.
 */

export interface DiaProgramacionDemo {
  fecha: string
  contenido: string
  desviacion: string
  observaciones: string
}

const CONTENIDOS = [
  'Presentación del módulo y entorno',
  'Repaso de PHP: sintaxis y variables',
  'Estructuras de control y funciones',
  'Arrays y funciones de cadena',
  'Formularios y validación',
  'Sesiones, cookies y login',
  'Práctica: carrito de la compra',
  'Corrección del carrito',
  'POO: clases y objetos',
  'Herencia e interfaces',
  'Excepciones y errores',
  'Namespaces y autocarga',
  'Práctica: gestor de tareas',
  'PDO: conexión y consultas',
  'Consultas preparadas y transacciones',
  'Repaso 1ª evaluación',
  'Examen AV1',
  'Corrección y feedback',
  'MVC: estructura y rutas',
  'Controladores y vistas',
  'Plantillas y escape',
  'Práctica: mini framework',
  'Práctica: mini framework II',
  'APIs REST: diseño',
  'JSON, estados y errores',
  'Consumo de APIs con fetch',
  'Práctica: API de tareas',
  'Práctica: API de tareas II',
  'Seguridad: XSS y CSRF',
  'Seguridad: contraseñas y permisos',
  'Pruebas y depuración',
  'Despliegue y entorno',
  'Práctica final: integración',
  'Práctica final: integración II',
  'Repaso 2ª evaluación',
  'Examen AV2',
  'Corrección y recuperación',
  'Presentación de proyectos',
  'Cierre y deberes de Navidad'
]

const DESVIACIONES = [
  'Sin desviación',
  'Sin desviación',
  'Se retrasó la práctica',
  'Sin desviación',
  'Sin desviación',
  'Faltó tiempo para el login',
  'Sin desviación',
  'Se pospuso la POO',
  'Sin desviación',
  'Sin desviación',
  'Sin desviación',
  'Sin desviación',
  'Sin desviación',
  'Sin desviación',
  'Sin desviación',
  'Sin desviación',
  'Se alargó el examen',
  'Se recupera contenido',
  'Sin desviación',
  'Sin desviación',
  'Sin desviación',
  'Sin desviación',
  'Falta de equipos',
  'Sin desviación',
  'Sin desviación',
  'Se retrasó la API',
  'Sin desviación',
  'Sin desviación',
  'Sin desviación',
  'Se amplió seguridad',
  'Sin desviación',
  'Sin desviación',
  'Sin desviación',
  'Práctica final más larga',
  'Sin desviación',
  'Sin desviación',
  'Se recupera contenido pendiente',
  'Sin desviación',
  'Sin desviación'
]

const OBSERVACIONES = [
  'Aula 3',
  'Aula 3',
  '',
  'Falta un alumno',
  '',
  '',
  'Material en el aula virtual',
  '',
  '',
  'Se usa el proyector',
  '',
  '',
  'Entrega el 16/11',
  '',
  '',
  '',
  'Examen en el aula 2',
  '',
  '',
  'Revisar ejemplos',
  '',
  '',
  'Incidencia con el servidor',
  '',
  '',
  'Publicar enunciado',
  '',
  '',
  '',
  '',
  'Revisar credenciales',
  '',
  '',
  '',
  '',
  '',
  '',
  'Presentaciones de 10 min',
  'Entrega de notas'
]

function diasLectivos(): string[] {
  const dias: string[] = []
  const cursor = new Date('2026-10-28T00:00:00Z')
  const fin = new Date('2026-12-22T00:00:00Z')
  while (cursor <= fin) {
    const iso = cursor.toISOString().slice(0, 10)
    const dia = cursor.getUTCDay()
    if (dia !== 0 && dia !== 6 && iso !== '2026-12-08') dias.push(iso)
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dias
}

export function diasProgramacionDemo(): DiaProgramacionDemo[] {
  return diasLectivos().map((fecha, indice) => ({
    fecha,
    contenido: CONTENIDOS[indice] ?? '',
    desviacion: DESVIACIONES[indice] ?? 'Sin desviación',
    observaciones: OBSERVACIONES[indice] ?? ''
  }))
}
