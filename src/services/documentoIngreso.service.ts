import { api } from '@/lib/api'
import { getTenantId } from '@/services/auth.service'
import type { ApiResponse } from '@/types'

const base = () => `/${getTenantId()}`

export interface DocumentoIngreso {
  id: string
  numero: string
  tipo: 'factura_compra' | 'cuenta_cobro' | 'gasto' | 'otro'
  fecha: string
  fecha_vencimiento?: string
  concepto: string
  forma_pago: 'contado' | 'credito'
  valor_bruto: number
  valor_iva: number
  valor_total: number
  estado: 'borrador' | 'registrado' | 'anulado'
  tercero: { razon_social: string; identificacion: string }
  created_at: string
}

export const documentoIngresoService = {
  getAll: async (): Promise<ApiResponse<DocumentoIngreso[]>> => {
    const { data } = await api.get<ApiResponse<DocumentoIngreso[]>>(`${base()}/facturas-compra`)
    return data
  },
  create: async (payload: Record<string, unknown>): Promise<ApiResponse<DocumentoIngreso>> => {
    const { data } = await api.post<ApiResponse<DocumentoIngreso>>(`${base()}/facturas-compra`, payload)
    return data
  },
  destroy: async (id: string): Promise<ApiResponse<null>> => {
    const { data } = await api.delete<ApiResponse<null>>(`${base()}/facturas-compra/${id}`)
    return data
  },
}
