import { api } from '@/lib/api'
import { getTenantId } from '@/services/auth.service'
import type { ApiResponse } from '@/types'

const base = () => `/${getTenantId()}`

export interface ReciboCaja {
  id: string
  numero: string
  fecha: string
  valor_recibido: number
  concepto: string
  forma_pago: string
  banco?: string
  referencia_pago?: string
  estado: 'borrador' | 'registrado' | 'anulado'
  tercero: { razon_social: string; identificacion: string }
  created_at: string
}

export interface FacturaCartera {
  id:                string
  numero_completo:   string
  fecha_emision:     string
  payment_due_date?: string | null
  valor_total:       number
  valor_abonado:     number
  saldo:             number
  payment_form:      string
  estado_pago:       'pagada' | 'parcial' | 'pendiente'
}

export const reciboCajaService = {
  getAll: async (): Promise<ApiResponse<ReciboCaja[]>> => {
    const { data } = await api.get<ApiResponse<ReciboCaja[]>>(`${base()}/recibos-caja`)
    return data
  },
  create: async (payload: Record<string, unknown>): Promise<ApiResponse<ReciboCaja>> => {
    const { data } = await api.post<ApiResponse<ReciboCaja>>(`${base()}/recibos-caja`, payload)
    return data
  },
  destroy: async (id: string): Promise<ApiResponse<null>> => {
    const { data } = await api.delete<ApiResponse<null>>(`${base()}/recibos-caja/${id}`)
    return data
  },
  /** Lista las facturas validadas con saldo pendiente de un cliente. */
  cartera: async (terceroId: string): Promise<ApiResponse<FacturaCartera[]>> => {
    const { data } = await api.get<ApiResponse<FacturaCartera[]>>(`${base()}/recibos-caja/cartera/${terceroId}`)
    return data
  },
}
