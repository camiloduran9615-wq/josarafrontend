import { api } from '@/lib/api'
import { getTenantId } from '@/services/auth.service'

const base = () => `/${getTenantId()}`

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface CuentaRef { id: string; codigo: string; nombre: string }

export interface TipoDocumentoIngreso {
  id:                      string
  codigo:                  string
  nombre:                  string
  descripcion:             string | null
  prefijo_numero:          string | null
  afecta_inventario:       boolean
  tipo_linea_default:      'producto' | 'gasto' | 'activo_fijo'
  cuenta_inventario_id:    string | null
  cuenta_gasto_id:         string | null
  cuenta_proveedor_id:     string | null
  cuenta_iva_descontable_id: string | null
  retefuente_concepto:     string | null
  retefuente_tasa:         number | null
  reteica_concepto:        string | null
  reteica_tasa:            number | null
  activo:                  boolean
  // Relaciones eager-loaded
  cuenta_inventario?:      CuentaRef | null
  cuenta_gasto?:           CuentaRef | null
  cuenta_proveedor?:       CuentaRef | null
  cuenta_iva_descontable?: CuentaRef | null
}

export interface TipoDocumentoIngresoPayload {
  codigo:                   string
  nombre:                   string
  descripcion?:             string
  prefijo_numero?:          string
  afecta_inventario?:       boolean
  tipo_linea_default:       'producto' | 'gasto' | 'activo_fijo'
  cuenta_inventario_id?:    string | null
  cuenta_gasto_id?:         string | null
  cuenta_proveedor_id?:     string | null
  cuenta_iva_descontable_id?: string | null
  retefuente_concepto?:     string | null
  retefuente_tasa?:         number | null
  reteica_concepto?:        string | null
  reteica_tasa?:            number | null
  activo?:                  boolean
}

// ── Service ────────────────────────────────────────────────────────────────

export const tipoDocumentoIngresoService = {
  getAll: async (): Promise<TipoDocumentoIngreso[]> => {
    const { data } = await api.get(`${base()}/tipos-documento-ingreso`)
    return data.data
  },

  getById: async (id: string): Promise<TipoDocumentoIngreso> => {
    const { data } = await api.get(`${base()}/tipos-documento-ingreso/${id}`)
    return data.data
  },

  create: async (payload: TipoDocumentoIngresoPayload): Promise<TipoDocumentoIngreso> => {
    const { data } = await api.post(`${base()}/tipos-documento-ingreso`, payload)
    return data.data
  },

  update: async (id: string, payload: Partial<TipoDocumentoIngresoPayload>): Promise<TipoDocumentoIngreso> => {
    const { data } = await api.put(`${base()}/tipos-documento-ingreso/${id}`, payload)
    return data.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`${base()}/tipos-documento-ingreso/${id}`)
  },
}
