import { api } from '@/lib/api'
import type { ApiResponse } from '@/types'

export interface RegisterTenantPayload {
  razon_social: string
  nit: string
  tenant_slug?: string
  email_contacto: string
  telefono?: string
  direccion?: string
  ciudad?: string
  admin_nombre: string
  admin_apellido: string
  admin_email: string
  admin_password: string
}

export interface RegisterTenantResponse {
  tenant_slug: string
  razon_social: string
  nit: string
  email_contacto: string
  activo: boolean
  trial_ends_at: string
}

export const tenantService = {
  register: async (payload: RegisterTenantPayload): Promise<ApiResponse<RegisterTenantResponse>> => {
    const { data } = await api.post<ApiResponse<RegisterTenantResponse>>('/tenants', payload)
    return data
  },
}
