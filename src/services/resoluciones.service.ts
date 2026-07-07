import { api } from '@/lib/api'
import { getTenantId } from '@/services/auth.service'

const base = () => `/${getTenantId()}`

export interface Resolucion {
  id: string
  nombre: string
  prefijo: string | null
  desde: number
  hasta: number
  numero_resolucion: string
  fecha_inicio: string
  fecha_fin: string
  factus_id: number | null
  is_local?: boolean
  activa: boolean
  created_at: string
}

export const resolucionesService = {
  getAll: async (): Promise<Resolucion[]> => {
    const { data } = await api.get(`${base()}/resoluciones`)
    return data.data || []
  },

  create: async (payload: Partial<Resolucion>): Promise<Resolucion> => {
    const { data } = await api.post(`${base()}/resoluciones`, payload)
    return data.data
  },

  update: async (id: string, payload: Partial<Resolucion>): Promise<Resolucion> => {
    const { data } = await api.put(`${base()}/resoluciones/${id}`, payload)
    return data.data
  },

  toggle: async (id: string): Promise<void> => {
    await api.delete(`${base()}/resoluciones/${id}`)
  },

  syncFromFactus: async (): Promise<{ message: string }> => {
    const { data } = await api.post(`${base()}/resoluciones/sync`)
    return data
  },
}
