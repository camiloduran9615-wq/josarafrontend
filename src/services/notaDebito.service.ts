import { api } from '@/lib/api'
import { getTenantId } from '@/services/auth.service'
import type { ApiResponse } from '@/types'

const base = () => `/${getTenantId()}`

export interface NotaDebito {
  id: string
  numero: string
  fecha: string
  descripcion: string
  valor_bruto: number
  valor_iva: number
  valor_total: number
  estado: 'borrador' | 'validado' | 'error' | 'anulado'
  tercero: { razon_social: string; identificacion: string }
  created_at: string
}

export const notaDebitoService = {
  getAll: async (): Promise<ApiResponse<NotaDebito[]>> => {
    const { data } = await api.get<ApiResponse<NotaDebito[]>>(`${base()}/notas-debito`)
    return data
  },
  create: async (payload: Record<string, unknown>): Promise<ApiResponse<NotaDebito>> => {
    const { data } = await api.post<ApiResponse<NotaDebito>>(`${base()}/notas-debito`, payload)
    return data
  },
  destroy: async (id: string): Promise<ApiResponse<null>> => {
    const { data } = await api.delete<ApiResponse<null>>(`${base()}/notas-debito/${id}`)
    return data
  },
}
