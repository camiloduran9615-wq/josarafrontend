import { api } from '@/lib/api'
import { getTenantId } from '@/services/auth.service'
import type { ApiResponse } from '@/types'

const base = () => `/${getTenantId()}`

// ── Tipos ──────────────────────────────────────────────────────────────────

export type FormaPagoEgreso = 'efectivo' | 'transferencia' | 'cheque' | 'consignacion' | 'otro'

export interface ComprobanteEgreso {
  id:                  string
  numero:              string
  fecha:               string
  concepto:            string
  forma_pago:          FormaPagoEgreso
  banco?:              string
  numero_cheque?:      string
  referencia_pago?:    string
  cuenta_debito_id:    string
  cuenta_credito_id:   string
  valor_pagado:        number
  facturas_aplicadas?: string[]
  estado:              'borrador' | 'registrado' | 'anulado'
  observaciones?:      string
  tercero: {
    id:            string
    razon_social:  string
    identificacion: string
  }
  cuenta_debito?:  { id: string; codigo: string; nombre: string }
  cuenta_credito?: { id: string; codigo: string; nombre: string }
  created_at: string
}

export interface CreateComprobanteEgresoPayload {
  centro_costo_id?:    string
  tercero_id:          string
  fecha:               string
  concepto:            string
  forma_pago:          FormaPagoEgreso
  banco?:              string
  numero_cheque?:      string
  referencia_pago?:    string
  cuenta_debito_id:    string
  cuenta_credito_id:   string
  valor_pagado:        number
  facturas_aplicadas?: string[]
  observaciones?:      string
}

// ── Service ────────────────────────────────────────────────────────────────

export const comprobanteEgresoService = {
  getAll: async (): Promise<ApiResponse<ComprobanteEgreso[]>> => {
    const { data } = await api.get<ApiResponse<ComprobanteEgreso[]>>(`${base()}/comprobantes-egreso`)
    return data
  },

  create: async (payload: CreateComprobanteEgresoPayload): Promise<ApiResponse<ComprobanteEgreso>> => {
    const { data } = await api.post<ApiResponse<ComprobanteEgreso>>(`${base()}/comprobantes-egreso`, payload)
    return data
  },

  destroy: async (id: string): Promise<ApiResponse<null>> => {
    const { data } = await api.delete<ApiResponse<null>>(`${base()}/comprobantes-egreso/${id}`)
    return data
  },
}
