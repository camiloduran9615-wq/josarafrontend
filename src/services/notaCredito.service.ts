import { api } from '@/lib/api'
import { getTenantId } from '@/services/auth.service'
import type { ApiResponse } from '@/types'

const base = () => `/${getTenantId()}/notas-credito`

export interface FacturaAnulable {
  id:              string
  numero_completo: string
  fecha_emision:   string
  valor_total:     number
  tercero: {
    id:             string | null
    razon_social:   string | null
    identificacion: string | null
  }
  tiene_factus:    boolean
}

export interface NotaCredito {
  id:                                string
  factura_id:                        string
  numero:                            string
  numero_completo:                   string
  valor_total:                       number
  reference_code:                    string
  cufe:                              string | null
  public_url:                        string | null
  discrepancy_response_code:         string
  discrepancy_response_description:  string
  estado:                            'validado' | 'error'
  created_at:                        string
  factura?: {
    numero_completo: string | null
    tercero?: { razon_social: string | null }
  }
}

export interface CreateNotaCreditoPayload {
  factura_id:   string
  concept_code: string  // 1-4
  description:  string
}

export const notaCreditoService = {
  list: async (): Promise<ApiResponse<NotaCredito[]>> => {
    const { data } = await api.get<ApiResponse<NotaCredito[]>>(base())
    return data
  },
  facturasAnulables: async (): Promise<ApiResponse<FacturaAnulable[]>> => {
    const { data } = await api.get<ApiResponse<FacturaAnulable[]>>(`${base()}/facturas-anulables`)
    return data
  },
  create: async (payload: CreateNotaCreditoPayload): Promise<ApiResponse<NotaCredito>> => {
    const { data } = await api.post<ApiResponse<NotaCredito>>(base(), payload)
    return data
  },
  show: async (id: string): Promise<ApiResponse<NotaCredito>> => {
    const { data } = await api.get<ApiResponse<NotaCredito>>(`${base()}/${id}`)
    return data
  },
}

/** Códigos DIAN UN/EDIFACT 4451 — concepto de corrección para Notas Crédito */
export const NC_CONCEPTS = [
  { code: '1', label: '1 — Devolución parcial de bienes / no aceptación parcial del servicio' },
  { code: '2', label: '2 — Anulación de factura electrónica' },
  { code: '3', label: '3 — Rebaja o descuento parcial o total' },
  { code: '4', label: '4 — Ajuste de precio' },
  { code: '5', label: '5 — Otros' },
] as const
