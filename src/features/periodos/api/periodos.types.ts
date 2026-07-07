export type EstadoPeriodo =
  | 'abierto'
  | 'en_revision'
  | 'cerrado'
  | 'bloqueado_fiscal'

export type TipoPeriodo = 'mensual' | 'anual'

export interface PeriodoContable {
  id:             string
  codigo:         string          // 'YYYY-MM' o 'YYYY'
  tipo:           TipoPeriodo
  estado:         EstadoPeriodo
  fecha_inicio:   string
  fecha_fin:      string
  cerrado_at:     string | null
  cerrado_por_id: string | null
  motivo_cierre:  string | null
  created_at:     string
}

export interface ChecklistItem {
  id:       string
  ok:       boolean | null
  detalle:  string
  items?:   unknown[]
  diferencia?: number
}

export interface ChecklistCierre {
  periodo:   PeriodoContable
  checklist: ChecklistItem[]
}

export interface CerrarPeriodoForm {
  confirmar: boolean   // must be true (accepted)
  motivo?:   string
}

export interface SolicitarReaperturaForm {
  motivo: string  // min 20 chars
}

export interface AprobarReaperturaForm {
  token?: string  // si se requiere
}
