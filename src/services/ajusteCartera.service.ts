import { api } from '@/lib/api'
import { getTenantId } from '@/services/auth.service'
import type { ApiResponse } from '@/types'

const base = () => `/${getTenantId()}`

export interface AjusteCartera {
  id: string
  numero: string
  fecha: string
  tipo: string
  concepto: string
  valor: number
  estado: 'borrador' | 'aplicado' | 'anulado'
  tercero: { razon_social: string; identificacion: string }
  created_at: string
}

export const ajusteCarteraService = {
  getAll: async (): Promise<ApiResponse<AjusteCartera[]>> => {
    const { data } = await api.get<ApiResponse<AjusteCartera[]>>(`${base()}/ajustes-cartera`)
    return data
  },
  create: async (payload: Record<string, unknown>): Promise<ApiResponse<AjusteCartera>> => {
    const { data } = await api.post<ApiResponse<AjusteCartera>>(`${base()}/ajustes-cartera`, payload)
    return data
  },
  destroy: async (id: string): Promise<ApiResponse<null>> => {
    const { data } = await api.delete<ApiResponse<null>>(`${base()}/ajustes-cartera/${id}`)
    return data
  },
}
