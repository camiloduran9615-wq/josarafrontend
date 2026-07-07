/** ── Tipos del módulo Asientos (espejo del backend) ────────────────── */

export type EstadoAsiento =
  | 'borrador'
  | 'aprobado'
  | 'anulado'
  | 'reversado'

export type TipoMovimiento =
  | 'normal'
  | 'reverso'
  | 'cierre'
  | 'apertura'

export interface AsientoLinea {
  id:                   string
  cuenta_contable_id:   string
  cuenta_codigo?:       string
  cuenta_nombre?:       string
  tercero_id:           string | null
  centro_costo_id:      string | null
  debito:               string   // DECIMAL(18,4) viene como string
  credito:              string
  descripcion_item:     string | null
  documento_referencia: string | null
}

export interface Asiento {
  id:                   string
  numero:               string | null
  año_fiscal:           number | null
  tipo_comprobante:     string
  estado:               EstadoAsiento
  tipo_movimiento:      TipoMovimiento
  fecha:                string   // YYYY-MM-DD
  periodo_id:           string | null
  sucursal_id:          string | null
  descripcion:          string
  numero_documento:     string | null
  soportes_urls:        string[] | null
  created_by_id:        string | null
  last_modified_by_id:  string | null
  approved_by_id:       string | null
  approved_at:          string | null
  voided_by_id:         string | null
  voided_at:            string | null
  motivo_anulacion:     string | null
  motivo_reverso:       string | null
  created_at:           string
  updated_at:           string
  lineas:               AsientoLinea[]
  periodo?:             { id: string; codigo: string; estado: string } | null
}

// ── Formularios ──────────────────────────────────────────────────────

export interface LineaForm {
  cuenta_contable_id:   string
  tercero_id?:          string
  centro_costo_id?:     string
  debito:               number
  credito:              number
  descripcion?:         string
  documento_referencia?: string
}

export interface StoreAsientoForm {
  fecha:            string
  tipo_comprobante: string
  descripcion:      string
  sucursal_id?:     string
  numero_documento?: string
  soportes_urls?:   string[]
  lineas:           LineaForm[]
}

export type UpdateAsientoForm = Partial<StoreAsientoForm>

export interface VoidAsientoForm {
  motivo: string  // min 20 chars
}

export interface ReverseAsientoForm {
  motivo:        string  // min 20 chars
  fecha_reverso: string  // date in open period
}

// ── Filtros de listado ───────────────────────────────────────────────
export interface AsientoFilters {
  estado?:          EstadoAsiento
  fecha_desde?:     string
  fecha_hasta?:     string
  tipo_comprobante?: string
  periodo_id?:      string
  page?:            number
  per_page?:        number
  sort?:            string
}
