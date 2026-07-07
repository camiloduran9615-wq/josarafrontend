import { api } from '@/lib/api'
import { getTenantId } from '@/services/auth.service'
import type { ApiResponse } from '@/types'

const base = () => `/${getTenantId()}`

export interface Remision {
  id: string
  numero: string
  fecha: string
  fecha_entrega?: string
  direccion_entrega?: string
  transportista?: string
  numero_guia?: string
  valor_total: number
  estado: 'borrador' | 'enviada' | 'facturada' | 'anulada'
  tercero: { razon_social: string; identificacion: string }
  created_at: string
}

export const remisionService = {
  getAll: async (): Promise<ApiResponse<Remision[]>> => {
    const { data } = await api.get<ApiResponse<Remision[]>>(`${base()}/remisiones`)
    return data
  },
  create: async (payload: Record<string, unknown>): Promise<ApiResponse<Remision>> => {
    const { data } = await api.post<ApiResponse<Remision>>(`${base()}/remisiones`, payload)
    return data
  },
  update: async (id: string, payload: Record<string, unknown>): Promise<ApiResponse<Remision>> => {
    const { data } = await api.put<ApiResponse<Remision>>(`${base()}/remisiones/${id}`, payload)
    return data
  },
  destroy: async (id: string): Promise<ApiResponse<null>> => {
    const { data } = await api.delete<ApiResponse<null>>(`${base()}/remisiones/${id}`)
    return data
  },
}
