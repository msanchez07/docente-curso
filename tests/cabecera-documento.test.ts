import { describe, expect, it } from 'vitest'
import { generarCabeceraDocumento, generarPieDocumento } from '@shared/cabecera-documento'
import { CONFIGURACION_GENERAL_POR_DEFECTO } from '@shared/tipos'

describe('cabecera de documentos', () => {
  it('incluye datos del centro, logo propio y logos institucionales', () => {
    const html = generarCabeceraDocumento(
      {
        ...CONFIGURACION_GENERAL_POR_DEFECTO,
        centro: {
          ...CONFIGURACION_GENERAL_POR_DEFECTO.centro,
          nombre: 'IES San Vicent Ferrer',
          codigoCentro: '46001199',
          localidad: 'Algemesí'
        },
        logo: 'data:image/png;base64,abc'
      },
      {
        conselleria: 'data:image/png;base64,conselleria',
        unionEuropea: 'data:image/png;base64,ue'
      }
    )
    expect(html).toContain('IES San Vicent Ferrer')
    expect(html).toContain('46001199')
    expect(html).toContain('data:image/png;base64,abc')
    expect(html).toContain('data:image/png;base64,conselleria')
    expect(generarPieDocumento({ unionEuropea: 'data:image/png;base64,ue' })).toContain(
      'data:image/png;base64,ue'
    )
  })
})
