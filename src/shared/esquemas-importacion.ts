/**
 * Esquemas JSON de los formatos de importación.
 *
 * Se descargan desde las propias secciones para que el profesorado pueda
 * consultar los campos admitidos y reutilizarlos como plantilla.
 */

export const ESQUEMA_ALUMNADO = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'Importación de alumnado',
  description:
    'Array de alumnos. También se aceptan CSV/TSV con las columnas nombre, apellidos, dni y correo.',
  type: 'array',
  items: {
    type: 'object',
    properties: {
      nombre: { type: 'string', description: 'Nombre de pila.' },
      apellidos: { type: 'string', description: 'Apellidos.' },
      dni: { type: ['string', 'null'], description: 'DNI o NIE. Opcional.' },
      correo: {
        type: ['string', 'null'],
        format: 'email',
        description: 'Correo electrónico. Opcional.'
      },
      activo: {
        type: 'boolean',
        default: true,
        description: 'Si falta, se considera activo.'
      }
    },
    required: ['nombre', 'apellidos'],
    additionalProperties: true
  },
  examples: [
    [
      {
        nombre: 'Ana',
        apellidos: 'García',
        dni: '11111111H',
        correo: 'ana@ejemplo.com',
        activo: true
      }
    ]
  ]
} as const

export const ESQUEMA_PROGRAMACION = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'Importación de programación de aula',
  description:
    'Array de días. Cada día puede ser una fecha ISO o un objeto con fecha, contenido, desviación y observaciones. También se aceptan TSV/CSV.',
  type: 'array',
  items: {
    oneOf: [
      {
        type: 'string',
        description: 'Fecha ISO (2026-09-15) o dd/mm/aaaa.',
        examples: ['2026-09-15', '15/09/2026']
      },
      {
        type: 'object',
        properties: {
          fecha: {
            type: 'string',
            description: 'Fecha ISO (2026-09-15) o dd/mm/aaaa.'
          },
          contenido: { type: 'string', description: 'Contenido trabajado en la sesión.' },
          desviacion: { type: 'string', description: 'Desviación respecto a la programación.' },
          observaciones: { type: 'string', description: 'Notas adicionales.' }
        },
        required: ['fecha'],
        additionalProperties: true
      }
    ]
  },
  examples: [
    [
      {
        fecha: '2026-09-15',
        contenido: 'Presentación del módulo',
        desviacion: '',
        observaciones: ''
      },
      { fecha: '2026-09-16', contenido: 'Entorno de desarrollo' }
    ]
  ]
} as const

export const ESQUEMA_CALENDARIO = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'Importación del calendario escolar',
  description:
    'Array de días, { dias: [...] } o { festivos: [...], no_lectivos: [...], vacaciones: [...] }. Cada día indica fecha, tipo y descripción opcional.',
  type: 'array',
  items: {
    type: 'object',
    properties: {
      fecha: { type: 'string', description: 'Fecha ISO (2026-09-15) o dd/mm/aaaa.' },
      tipo: {
        type: 'string',
        enum: ['lectivo', 'no_lectivo', 'festivo', 'vacaciones'],
        description: 'Tipo de día.'
      },
      descripcion: {
        type: ['string', 'null'],
        description: 'Descripción o motivo del día.'
      }
    },
    required: ['fecha', 'tipo'],
    additionalProperties: true
  },
  examples: [
    [
      { fecha: '2026-09-15', tipo: 'lectivo', descripcion: 'Inicio del curso' },
      { fecha: '2026-10-12', tipo: 'festivo', descripcion: 'Fiesta Nacional' }
    ],
    {
      festivos: ['2026-10-12', '2026-11-02'],
      no_lectivos: ['2026-12-07'],
      vacaciones: [{ fecha: '2026-12-23', descripcion: 'Vacaciones de Navidad' }]
    }
  ]
} as const

export const ESQUEMA_UNIDADES = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'Importación de unidades de programación',
  description:
    'Array de unidades o { unidades: [...] }. Cada unidad puede incluir sus sesiones, criterios de evaluación (RA + CE) y contenidos.',
  type: 'array',
  items: {
    type: 'object',
    properties: {
      codigo: { type: 'string', description: 'Código corto, por ejemplo UD1.' },
      nombre: { type: 'string' },
      fecha_inicio: { type: 'string', description: 'ISO o dd/mm/aaaa.' },
      fecha_fin: { type: 'string', description: 'ISO o dd/mm/aaaa.' },
      peso: { type: 'number', description: 'Peso de la unidad en la nota final (0–100).' },
      contenidos: { type: 'string' },
      observaciones: { type: ['string', 'null'] },
      criterios: {
        type: 'array',
        description:
          'Criterios concretos que trabaja la unidad. Puede ser un CE suelto, todos los de un RA o CE de varios RA.',
        items: {
          oneOf: [
            {
              type: 'object',
              properties: {
                raCodigo: { type: 'string', description: 'Código del RA, por ejemplo RA1.' },
                ceCodigo: { type: 'string', description: 'Código del CE, por ejemplo a.' }
              },
              required: ['raCodigo', 'ceCodigo'],
              additionalProperties: true
            },
            {
              type: 'string',
              description: 'Forma abreviada RA1.a o RA1|a.'
            }
          ]
        }
      },
      ra_codigos: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Compatibilidad: si no se envían criterios, se incluyen todos los CE de estos RA.'
      },
      sesiones: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            fecha: { type: 'string', description: 'ISO o dd/mm/aaaa.' },
            contenido: { type: 'string' },
            desviacion: { type: 'string' },
            observaciones: { type: 'string' }
          },
          required: ['fecha'],
          additionalProperties: true
        }
      }
    },
    required: ['nombre'],
    additionalProperties: true
  },
  examples: [
    [
      {
        codigo: 'UD1',
        nombre: 'Introducción al módulo',
        fecha_inicio: '2026-09-15',
        fecha_fin: '2026-10-15',
        contenidos: 'Entorno, sintaxis y estructuras de control.',
        criterios: [
          { raCodigo: 'RA1', ceCodigo: 'a' },
          { raCodigo: 'RA1', ceCodigo: 'b' },
          { raCodigo: 'RA2', ceCodigo: 'a' }
        ],
        sesiones: [{ fecha: '2026-09-16', contenido: 'Presentación del módulo' }]
      }
    ]
  ]
} as const

export const ESQUEMA_EVENTOS = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'Importación de evaluaciones y exámenes',
  description:
    'Array de eventos, { eventos: [...] } o { evaluaciones: [...], examenes: [...] }. Las fechas se admiten en ISO o dd/mm/aaaa.',
  oneOf: [
    {
      type: 'array',
      items: { $ref: '#/$defs/evento' }
    },
    {
      type: 'object',
      properties: {
        eventos: { type: 'array', items: { $ref: '#/$defs/evento' } },
        evaluaciones: { type: 'array', items: { $ref: '#/$defs/evento' } },
        examenes: { type: 'array', items: { $ref: '#/$defs/evento' } }
      },
      additionalProperties: false
    }
  ],
  $defs: {
    evento: {
      type: 'object',
      properties: {
        tipo: {
          type: 'string',
          enum: ['evaluacion', 'examen'],
          description: 'Obligatorio salvo cuando el evento va dentro de evaluaciones o examenes.'
        },
        titulo: { type: 'string', description: 'Título visible de la fecha.' },
        fecha: { type: 'string', description: 'Fecha ISO (2026-11-19) o dd/mm/aaaa.' },
        hora: { type: 'string', pattern: '^([01]?\\d|2[0-3]):[0-5]\\d$', description: 'HH:MM.' },
        avaluacion: { type: ['string', 'null'], description: 'Id de la avaluación (AV1, AV2…).' },
        observaciones: {
          type: ['string', 'null'],
          description: 'Aula, instrucciones, incidencias…'
        }
      },
      required: ['titulo', 'fecha'],
      additionalProperties: true
    }
  },
  examples: [
    {
      eventos: [
        {
          tipo: 'examen',
          titulo: 'Examen AV1',
          fecha: '19/11/2026',
          hora: '09:00',
          avaluacion: 'AV1'
        },
        { tipo: 'evaluacion', titulo: 'Sesión 1ª evaluación', fecha: '10/12/2026' }
      ]
    }
  ]
} as const

export const ESQUEMA_CICLO = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'Importación de currículo: ciclo, módulos, RA y CE',
  description:
    'Objeto de un ciclo, array de ciclos o { "ciclos": [...] }. Cada ciclo incluye sus módulos y, dentro de cada módulo, los resultados de aprendizaje (RA) y criterios de evaluación (CE). El id debería coincidir con el id del catálogo para que los grupos existentes enlacen automáticamente.',
  oneOf: [
    { $ref: '#/$defs/ciclo' },
    { type: 'array', minItems: 1, items: { $ref: '#/$defs/ciclo' } },
    {
      type: 'object',
      properties: {
        ciclos: { type: 'array', minItems: 1, items: { $ref: '#/$defs/ciclo' } }
      },
      required: ['ciclos'],
      additionalProperties: true
    }
  ],
  $defs: {
    ciclo: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          minLength: 1,
          description:
            'Identificador del ciclo. Si coincide con catalogo_ciclos.id, los grupos y módulos se enlazan con el catálogo.'
        },
        denominacion: { type: 'string', minLength: 1 },
        nivel: {
          type: 'string',
          description: 'Por ejemplo: Formación Profesional de Grado Superior.'
        },
        familia_profesional: { type: 'string' },
        duracion_horas: { type: 'integer', minimum: 0, default: 0 },
        ects: { type: 'integer', minimum: 0, default: 0 },
        abreviatura: {
          type: 'string',
          description: 'Abreviatura corta para el nombre del grupo (DAW, DAM, ASIR…).'
        },
        rd: { type: 'string', description: 'Real Decreto o norma de referencia.' },
        rd_actualizacion: { type: 'string' },
        boe_url: { type: 'string', description: 'Enlace al BOE.' },
        boe_url_actualizacion: { type: 'string' },
        modulos: { type: 'array', minItems: 1, items: { $ref: '#/$defs/modulo' } }
      },
      required: ['id', 'denominacion', 'modulos'],
      additionalProperties: true
    },
    modulo: {
      type: 'object',
      properties: {
        codigo: {
          type: 'string',
          minLength: 1,
          description: 'Código oficial del módulo, por ejemplo 0484.'
        },
        nombre: { type: 'string', minLength: 1 },
        siglas: { type: 'string', description: 'Siglas cortas del módulo (BD, PROG…).' },
        curso: { type: 'string', enum: ['1', '2'] },
        ects: { type: ['integer', 'null'], minimum: 0 },
        horas_minimas_boe: { type: ['integer', 'null'], minimum: 0 },
        ra: { type: 'array', items: { $ref: '#/$defs/ra' } }
      },
      required: ['codigo', 'nombre'],
      additionalProperties: true
    },
    ra: {
      type: 'object',
      properties: {
        codigo: {
          type: 'string',
          description: 'Código del RA, por ejemplo RA1. Si falta, se genera a partir de numero.'
        },
        numero: {
          type: 'integer',
          minimum: 1,
          description:
            'Número del RA dentro del módulo. Si falta, se deduce del código o del orden.'
        },
        descripcion: { type: 'string', minLength: 1 },
        ce: { type: 'array', items: { $ref: '#/$defs/ce' } }
      },
      required: ['descripcion'],
      additionalProperties: true
    },
    ce: {
      type: 'object',
      properties: {
        codigo: {
          type: 'string',
          description: 'Código del CE, normalmente a, b, c… Si falta, se genera por orden.'
        },
        descripcion: { type: 'string', minLength: 1 }
      },
      required: ['descripcion'],
      additionalProperties: true
    }
  },
  examples: [
    {
      id: 'gs-desarrollo-de-aplicaciones-multiplataforma',
      denominacion: 'Desarrollo de Aplicaciones Multiplataforma',
      nivel: 'Formación Profesional de Grado Superior',
      familia_profesional: 'Informática y Comunicaciones',
      duracion_horas: 2000,
      ects: 120,
      abreviatura: 'DAM',
      rd: 'Real Decreto 450/2010',
      boe_url: 'https://www.boe.es/',
      modulos: [
        {
          codigo: '0484',
          nombre: 'Bases de Datos',
          siglas: 'BD',
          curso: '1',
          ects: 10,
          horas_minimas_boe: 160,
          ra: [
            {
              codigo: 'RA1',
              numero: 1,
              descripcion: 'Reconoce los elementos de las bases de datos relacionales.',
              ce: [
                {
                  codigo: 'a',
                  descripcion: 'Se han identificado las características de las bases de datos.'
                },
                { codigo: 'b', descripcion: 'Se han distinguido los modelos de datos.' }
              ]
            }
          ]
        }
      ]
    }
  ]
} as const
