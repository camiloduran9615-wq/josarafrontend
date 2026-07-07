import { api } from '@/lib/api'
import { getTenantId } from '@/services/auth.service'
import type { ApiResponse } from '@/types'

const base = () => `/${getTenantId()}`

export interface Cotizacion {
  id: string
  numero: string
  fecha: string
  fecha_validez: string
  valor_bruto: number
  valor_descuento: number
  valor_iva: number
  valor_total: number
  estado: 'borrador' | 'enviada' | 'aceptada' | 'rechazada' | 'vencida' | 'facturada'
  tercero: { razon_social: string; identificacion: string }
  created_at: string
}

export const cotizacionService = {
  getAll: async (): Promise<ApiResponse<Cotizacion[]>> => {
    const { data } = await api.get<ApiResponse<Cotizacion[]>>(`${base()}/cotizaciones`)
    return data
  },
  create: async (payload: Record<string, unknown>): Promise<ApiResponse<Cotizacion>> => {
    const { data } = await api.post<ApiResponse<Cotizacion>>(`${base()}/cotizaciones`, payload)
    return data
  },
  update: async (id: string, payload: Record<string, unknown>): Promise<ApiResponse<Cotizacion>> => {
    const { data } = await api.put<ApiResponse<Cotizacion>>(`${base()}/cotizaciones/${id}`, payload)
    return data
  },
  destroy: async (id: string): Promise<ApiResponse<null>> => {
    const { data } = await api.delete<ApiResponse<null>>(`${base()}/cotizaciones/${id}`)
    return data
  },
}
