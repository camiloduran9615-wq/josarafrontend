import { api } from '@/lib/api'
import { getTenantId } from '@/services/auth.service'

const base = () => `/${getTenantId()}`

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface Bodega {
  id: string
  sucursal_id: string
  codigo: string
  nombre: string
  tipo: 'mercancia' | 'materia_prima' | 'producto_proceso' | 'producto_terminado' | 'consignacion' | 'devoluciones' | 'transito'
  es_principal: boolean
  activa: boolean
  sucursal?: { id: string; nombre: string }
  inventario_cuenta?: { id: string; codigo: string; nombre: string }
}

export interface CentroCosto {
  id:          string
  codigo:      string
  nombre:      string
  activo:      boolean
  parent_id:   string | null
  nivel:       number          // 1 = raíz, 2 = subcentro, 3 = sub-subcentro
  sucursal_id: string | null
  sucursal?:   { id: string; nombre: string } | null
  parent?:     { id: string; codigo: string; nombre: string } | null
  children?:   CentroCosto[]  // solo presente en modo tree=true
}

export interface ProductoStockBodega {
  sucursal: string
  bodega: string
  bodega_tipo: string
  producto_codigo: string
  producto_nombre: string
  categoria: string
  saldo_unidades: number
  costo_promedio: number
  saldo_valor: number
  cuenta_puc: string
}

export interface KardexLinea {
  id: string
  fecha: string
  tipo: string
  concepto: string
  entrada_unidades: number | null
  entrada_valor: number | null
  salida_unidades: number | null
  salida_valor: number | null
  saldo_unidades: number
  saldo_valor: number
  costo_promedio: number
  tercero: string | null
  documento_ref: string | null
}

export interface CreateBodegaPayload {
  sucursal_id: string
  codigo: string
  nombre: string
  tipo: Bodega['tipo']
  inventario_cuenta_id?: string
  responsable_user_id?: string
  es_principal?: boolean
}

// ── Bodegas ────────────────────────────────────────────────────────────────

export const bodegasService = {
  getAll: async (sucursalId?: string): Promise<Bodega[]> => {
    const params = sucursalId ? `?sucursal_id=${sucursalId}` : ''
    const { data } = await api.get(`${base()}/bodegas${params}`)
    return data.data
  },

  getById: async (id: string): Promise<Bodega> => {
    const { data } = await api.get(`${base()}/bodegas/${id}`)
    return data.data
  },

  create: async (payload: CreateBodegaPayload): Promise<Bodega> => {
    const { data } = await api.post(`${base()}/bodegas`, payload)
    return data.data
  },

  update: async (id: string, payload: Partial<CreateBodegaPayload>): Promise<Bodega> => {
    const { data } = await api.put(`${base()}/bodegas/${id}`, payload)
    return data.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`${base()}/bodegas/${id}`)
  },
}

// ── Centros de costo ───────────────────────────────────────────────────────

export interface CentrosCostoPayload {
  codigo?:      string
  nombre?:      string
  sucursal_id?: string
  parent_id?:   string | null
  activo?:      boolean
}

export const centrosCostoService = {
  /** Todos los centros (activos + inactivos) — para el panel de gestión */
  getAll: async (): Promise<CentroCosto[]> => {
    const { data } = await api.get(`${base()}/centros-costo?activos=false`)
    return data.data
  },

  /** Solo los activos — para los selectores en documentos */
  getAllActivos: async (): Promise<CentroCosto[]> => {
    const { data } = await api.get(`${base()}/centros-costo`)
    return data.data
  },

  create: async (payload: CentrosCostoPayload): Promise<CentroCosto> => {
    const { data } = await api.post(`${base()}/centros-costo`, payload)
    return data.data
  },

  update: async (id: string, payload: CentrosCostoPayload): Promise<CentroCosto> => {
    const { data } = await api.put(`${base()}/centros-costo/${id}`, payload)
    return data.data
  },

  destroy: async (id: string): Promise<void> => {
    await api.delete(`${base()}/centros-costo/${id}`)
  },
}

// ── KARDEX ─────────────────────────────────────────────────────────────────

export const kardexService = {
  getKardex: async (params: {
    producto_id: string
    bodega_id: string
    desde: string
    hasta: string
  }): Promise<KardexLinea[]> => {
    const q = new URLSearchParams(params).toString()
    const { data } = await api.get(`${base()}/kardex?${q}`)
    return data.data
  },

  getValorizacion: async (params?: {
    sucursal_id?: string
    categoria_id?: string
    bodega_id?: string
  }): Promise<ProductoStockBodega[]> => {
    const q = params ? '?' + new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v))
    ).toString() : ''
    const { data } = await api.get(`${base()}/kardex/valorizacion${q}`)
    return data.data
  },

  getStockTotal: async (productoId: string): Promise<ProductoStockBodega[]> => {
    const { data } = await api.get(`${base()}/kardex/stock/${productoId}`)
    return data.data
  },
}
