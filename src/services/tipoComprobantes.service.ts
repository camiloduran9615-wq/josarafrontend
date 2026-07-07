import { api } from '@/lib/api'
import { getTenantId } from '@/services/auth.service'

const base = () => `/${getTenantId()}`

export interface TipoComprobante {
  id: string
  codigo: string
  nombre: string
  tipo_documento: 'FV' | 'DC' | 'NC' | 'ND'
  resolucion_id: string | null
  resolucion?: {
    id: string
    nombre: string
    prefijo: string | null
    desde: number
    hasta: number
    numero_resolucion: string
    fecha_fin: string
  } | null
  consecutivo_actual: number
  prefijo_override: string | null
  observaciones_default: string | null
  habilitar_rete_iva: boolean
  habilitar_rete_ica: boolean
  habilitar_autorretencion: boolean
  titulo_pdf: string | null
  activo: boolean
}

export const tipoComprobantesService = {
  getAll: async (): Promise<TipoComprobante[]> => {
    const { data } = await api.get(`${base()}/tipo-comprobantes`)
    return data.data || []
  },

  create: async (payload: Partial<TipoComprobante>): Promise<TipoComprobante> => {
    const { data } = await api.post(`${base()}/tipo-comprobantes`, payload)
    return data.data
  },

  update: async (id: string, payload: Partial<TipoComprobante>): Promise<TipoComprobante> => {
    const { data } = await api.put(`${base()}/tipo-comprobantes/${id}`, payload)
    return data.data
  },

  toggle: async (id: string): Promise<void> => {
    await api.delete(`${base()}/tipo-comprobantes/${id}`)
  },
}
