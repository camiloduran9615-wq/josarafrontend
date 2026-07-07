export type CriticidadAudit = 'info' | 'warning' | 'critical'

export interface AuditLog {
  id:                   string
  tenant_id:            string
  user_id:              string | null
  user_email_snapshot:  string | null
  user_role_snapshot:   string | null
  action:               string
  criticidad:           CriticidadAudit
  auditable_type:       string | null
  auditable_id:         string | null
  old_values:           Record<string, unknown> | null
  new_values:           Record<string, unknown> | null
  motivo:               string | null
  metadata:             Record<string, unknown> | null
  ip_address:           string
  user_agent:           string
  request_id:           string | null
  sucursal_id:          string | null
  hash_anterior:        string | null
  hash_actual:          string
  created_at:           string
}

export interface AuditFilters {
  action?:         string
  criticidad?:     CriticidadAudit
  user_id?:        string
  auditable_type?: string
  from?:           string
  to?:             string
  page?:           number
  per_page?:       number
}

export interface ChainVerificationResult {
  tenant_id:        string
  integrity_ok:     boolean
  first_invalid_id: string | null
}
