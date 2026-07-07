import { api } from '@/lib/api'
import { getTenantId } from '@/services/auth.service'
import type { ApiResponse } from '@/types'

const base = () => `/${getTenantId()}`

export interface CuentaContable {
  id: string
  codigo: string
  nombre: string
  naturaleza: 'debito' | 'credito'
  nivel: 'clase' | 'grupo' | 'cuenta' | 'subcuenta' | 'auxiliar'
  parent_id?: string | null
  acepta_movimientos: boolean
  exige_tercero: boolean
  exige_centro_costo: boolean
  exige_base_impuesto: boolean
  activo: boolean
  children?: CuentaContable[]
}

export interface CreateAuxiliarPayload {
  parent_id?: string | null
  codigo: string
  nombre: string
  naturaleza?: 'debito' | 'credito'
  acepta_movimientos?: boolean
  exige_tercero?: boolean
  exige_centro_costo?: boolean
  exige_base_impuesto?: boolean
}

export const pucService = {
  getTree: async (): Promise<ApiResponse<CuentaContable[]>> => {
    const { data } = await api.get<ApiResponse<CuentaContable[]>>(`${base()}/cuentas-contables`)
    return data
  },

  createAuxiliar: async (payload: CreateAuxiliarPayload): Promise<ApiResponse<CuentaContable>> => {
    const { data } = await api.post<ApiResponse<CuentaContable>>(`${base()}/cuentas-contables`, payload)
    return data
  },

  update: async (id: string, payload: Partial<CuentaContable>): Promise<ApiResponse<CuentaContable>> => {
    const { data } = await api.put<ApiResponse<CuentaContable>>(`${base()}/cuentas-contables/${id}`, payload)
    return data
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    const { data } = await api.delete<ApiResponse<void>>(`${base()}/cuentas-contables/${id}`)
    return data
  }
}
