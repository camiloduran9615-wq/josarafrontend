import { api } from '@/lib/api'
import { getTenantId } from '@/services/auth.service'
import type { ApiResponse } from '@/types'

const base = () => `/${getTenantId()}`

export interface Tercero {
  id: string
  identificacion_documento_id: string
  identificacion: string
  dv?: string | null
  organizacion_juridica_id?: string | null
  tributo_id?: string | null
  razon_social: string
  nombre_comercial?: string | null
  direccion?: string | null
  email?: string | null
  telefono?: string | null
  municipio_id?: string | null
  es_cliente: boolean
  es_proveedor: boolean
  es_empleado: boolean
  activo: boolean
  tipo_persona?: string
  sucursal?: string
  nombres?: string
  apellidos?: string
  regimen_iva?: string
  responsabilidades_fiscales?: string[]
  codigo_ciiu?: string
  codigo_postal?: string
  nombre_contacto?: string
  vendedor_id?: string
  cobrador_id?: string
  observaciones?: string
  contactos_adicionales?: unknown[]
}

export type CreateTerceroPayload = Omit<Tercero, 'id' | 'activo'>

/** Resultado de la consulta DIAN por identificación (razón social + email, cuando existen). */
export interface DianSearchResult {
  name?: string
  email?: string
}

export const tercerosService = {
  getAll: async (): Promise<ApiResponse<Tercero[]>> => {
    const { data } = await api.get<ApiResponse<Tercero[]>>(`${base()}/terceros`)
    return data
  },

  create: async (payload: CreateTerceroPayload): Promise<ApiResponse<Tercero>> => {
    const { data } = await api.post<ApiResponse<Tercero>>(`${base()}/terceros`, payload)
    return data
  },

  update: async (id: string, payload: Partial<Tercero>): Promise<ApiResponse<Tercero>> => {
    const { data } = await api.put<ApiResponse<Tercero>>(`${base()}/terceros/${id}`, payload)
    return data
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    const { data } = await api.delete<ApiResponse<void>>(`${base()}/terceros/${id}`)
    return data
  },

  /**
   * Consulta datos de un adquiriente en la DIAN.
   */
  searchDian: async (tipo_documento_id: string, identificacion: string): Promise<ApiResponse<DianSearchResult>> => {
    const { data } = await api.get<ApiResponse<DianSearchResult>>(`${base()}/terceros/search-dian`, {
      params: { tipo_documento_id, identificacion }
    })
    return data
  }
}
