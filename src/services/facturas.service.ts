import { api } from '@/lib/api'
import { getTenantId } from '@/services/auth.service'
import type { ApiResponse } from '@/types'

const base = () => `/${getTenantId()}`

export interface Factura {
  id: string
  numero_completo: string
  tercero: {
    razon_social: string
    identificacion: string
  }
  valor_total: number
  estado: 'borrador' | 'validado' | 'error' | 'anulado'
  payment_form?: string
  payment_due_date?: string | null
  public_url?: string
  cufe?: string
  created_at: string
}

export interface NumberingRange {
  id: string
  factus_id?: number
  name: string
  prefix: string | null
  from: number
  to: number
  number: string
  start_date: string
  expiration_date: string
  is_local?: boolean
}

export const facturasService = {
  getAll: async (): Promise<ApiResponse<Factura[]>> => {
    const { data } = await api.get<ApiResponse<Factura[]>>(`${base()}/facturas`)
    return data
  },

  getRanges: async (): Promise<ApiResponse<NumberingRange[]>> => {
    const { data } = await api.get<ApiResponse<NumberingRange[]>>(`${base()}/facturas/ranges`)
    return data
  },

  create: async (payload: Record<string, unknown>): Promise<ApiResponse<Factura>> => {
    const { data } = await api.post<ApiResponse<Factura>>(`${base()}/facturas`, payload)
    return data
  },

  enviar: async (id: string, body?: { payment_due_date?: string }): Promise<ApiResponse<Factura>> => {
    const { data } = await api.post<ApiResponse<Factura>>(`${base()}/facturas/${id}/enviar`, body ?? {})
    return data
  },

  createCreditNote: async (payload: { factura_id: string, concept_code: string, description: string }): Promise<ApiResponse<unknown>> => {
    const { data } = await api.post<ApiResponse<unknown>>(`${base()}/notas-credito`, payload)
    return data
  }
}
