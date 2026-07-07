import axios from 'axios'

const ADMIN_TOKEN_KEY = 'platform_admin_token'

export type PlatformAdminRole = 'super_admin' | 'support_admin' | 'billing_admin' | 'readonly_admin'

export interface PlatformAdmin {
  id: string
  name: string
  email: string
  role: PlatformAdminRole
  active: boolean
  last_login_at: string | null
}

export interface AdminLoginResponse {
  success: boolean
  data: {
    token: string
    admin: PlatformAdmin
  }
}

export interface AdminMetricPayload {
  tenants_total: number
  tenants_active: number
  tenants_suspended: number
  tenants_trial: number
  tenants_expired: number
  new_tenants_this_month: number
  mrr: number
  arr: number
  churn: number
  trial_conversion_rate: number
  active_users: number | null
  plans_total: number
  plans_active: number
  pending_payments: number
  plans_usage: Array<{ plan_id: string | null; total: number; plan?: AdminPlan | null }>
  critical_alerts: unknown[]
  near_limit_tenants: unknown[]
}

export interface OperationHealth {
  api: { status: string; checked_at: string }
  database: { status: string; latency_ms: number | null }
  cache: { status: string }
  queue: { status: string; pending: number; failed: number }
}

export interface OperationEvent {
  id: string
  category: string
  severity: string
  title: string
  message: string | null
  source: string | null
  created_at: string
  resolved_at: string | null
}

export interface OperationsOverview {
  business: Record<string, number>
  operations: Record<string, number>
  security: Record<string, number>
  support: Record<string, number>
  health: OperationHealth
  recent_events: OperationEvent[]
}

export interface ObservabilityPayload {
  health: OperationHealth
  status_checks: Array<Record<string, unknown>>
  queue: Record<string, number | string>
  database: Record<string, number | string | null>
  events: OperationEvent[]
}

export interface SecurityPayload {
  summary: Record<string, number>
  admins: PlatformAdmin[]
  recent_audit_logs: Array<Record<string, unknown>>
  security_events: OperationEvent[]
}

export interface SupportPayload {
  summary: Record<string, number>
  tickets: Array<Record<string, unknown>>
  at_risk_tenants: AdminTenantSummary[]
}

export interface SettingsPayload {
  settings: Array<{
    id: string
    key: string
    group: string
    type: string
    value: unknown
    is_sensitive: boolean
    description: string | null
    updated_at: string
  }>
  runtime: Record<string, string | boolean | null>
}

export interface AdminTenantSummary {
  id: string
  tenant_slug: string
  company_code: string
  razon_social: string
  nit: string
  status: string
  activo: boolean
  plan_actual: string | null
  plan_code: string | null
  created_at: string
  last_access_at: string | null
  users_count: number | null
  documents_count: number | null
  storage_bytes_used: number
  payment_status: string | null
  electronic_invoicing_status: string | null
  ciudad: string | null
  country: string | null
  contact_name: string | null
  email_contacto: string
  telefono: string | null
}

export interface AdminPlanFeature {
  id?: string
  feature_key: string
  feature_label?: string | null
  limit_value?: number | null
  enabled?: boolean
}

export interface AdminPlan {
  id: string
  name: string
  code: string
  description: string | null
  monthly_price: string | number
  annual_price: string | number
  currency: string
  status: string
  is_recommended: boolean
  is_free: boolean
  display_order: number
  trial_allowed: boolean
  trial_days: number
  features?: AdminPlanFeature[]
  subscriptions_count?: number
}

export interface Paginated<T> {
  data: T[]
  current_page: number
  last_page: number
  total: number
}

interface ApiEnvelope<T> {
  success: boolean
  data: T
}

export const setAdminToken = (token: string | null) => {
  if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token)
  else localStorage.removeItem(ADMIN_TOKEN_KEY)
}

export const getAdminToken = () => localStorage.getItem(ADMIN_TOKEN_KEY)

export const adminApi = axios.create({
  baseURL: '/api/v1/admin',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
})

adminApi.interceptors.request.use(config => {
  const token = getAdminToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

adminApi.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      setAdminToken(null)
      window.dispatchEvent(new CustomEvent('admin:unauthorized'))
    }

    return Promise.reject(error)
  },
)

export const adminService = {
  login: async (email: string, password: string) => {
    const { data } = await adminApi.post<AdminLoginResponse>('/auth/login', { email, password })
    setAdminToken(data.data.token)
    return data.data
  },

  logout: async () => {
    try {
      await adminApi.post('/auth/logout')
    } finally {
      setAdminToken(null)
    }
  },

  me: async () => {
    const { data } = await adminApi.get<ApiEnvelope<PlatformAdmin>>('/auth/me')
    return data.data
  },

  dashboard: async () => {
    const { data } = await adminApi.get<ApiEnvelope<AdminMetricPayload>>('/dashboard')
    return data.data
  },

  tenants: async () => {
    const { data } = await adminApi.get<ApiEnvelope<Paginated<AdminTenantSummary>>>('/tenants')
    return data.data
  },

  tenant: async (id: string) => {
    const { data } = await adminApi.get<ApiEnvelope<{ tenant: AdminTenantSummary; usage: Record<string, number | boolean> }>>(`/tenants/${id}`)
    return data.data
  },

  plans: async () => {
    const { data } = await adminApi.get<ApiEnvelope<Paginated<AdminPlan>>>('/plans')
    return data.data
  },

  operationsOverview: async () => {
    const { data } = await adminApi.get<ApiEnvelope<OperationsOverview>>('/operations/overview')
    return data.data
  },

  observability: async () => {
    const { data } = await adminApi.get<ApiEnvelope<ObservabilityPayload>>('/operations/observability')
    return data.data
  },

  security: async () => {
    const { data } = await adminApi.get<ApiEnvelope<SecurityPayload>>('/operations/security')
    return data.data
  },

  support: async () => {
    const { data } = await adminApi.get<ApiEnvelope<SupportPayload>>('/operations/support')
    return data.data
  },

  settings: async () => {
    const { data } = await adminApi.get<ApiEnvelope<SettingsPayload>>('/operations/settings')
    return data.data
  },
}
