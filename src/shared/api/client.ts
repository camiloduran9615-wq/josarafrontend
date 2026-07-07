/**
 * Axios client configurado para:
 *  - Tenant path-based: /api/v1/{tenantId}/...
 *  - Bearer token Sanctum desde Zustand auth store
 *  - Respuesta JSend: { success, data, meta, message, errors }
 *  - Interceptor de errores con toast vía sonner
 */
import axios, { type AxiosError, type AxiosResponse } from 'axios'
import { toast } from 'sonner'

// ── El tenantId se inyecta dinámicamente desde el store ──────────────
let _tenantId: string | null = null
let _token: string | null = null

export function setApiTenant(tenantId: string): void {
  _tenantId = tenantId
}

export function setApiToken(token: string | null): void {
  _token = token
}

// ── Instancia base ───────────────────────────────────────────────────
export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  timeout: 30_000,
})

// Fallback: si los stores Zustand aún no inyectaron los valores, leemos del
// localStorage que usa el sistema "legacy" de auth (/lib/api.ts + auth.service).
// Esto permite que ambos sistemas convivan sin requerir migración masiva.
function resolveTenant(): string | null {
  return _tenantId ?? localStorage.getItem('tenant_slug') ?? localStorage.getItem('tenant_id')
}
function resolveToken(): string | null {
  return _token ?? localStorage.getItem('auth_token')
}

// ── Request interceptor: añade tenant path + Bearer token ────────────
apiClient.interceptors.request.use((config) => {
  const tenant = resolveTenant()
  if (tenant && config.url && !config.url.startsWith(`/${tenant}/`)) {
    config.url = `/${tenant}${config.url.startsWith('/') ? '' : '/'}${config.url}`
  }
  const token = resolveToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor: toast en errores, extrae data de JSend ─────
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<{ message?: string; errors?: Record<string, string[]> }>) => {
    const status = error.response?.status
    const msg    = error.response?.data?.message

    if (status === 401) {
      toast.error('Sesión expirada. Por favor, vuelve a iniciar sesión.')
    } else if (status === 403) {
      toast.error(msg ?? 'No tienes permisos para esta acción.')
    } else if (status === 409) {
      toast.error(msg ?? 'Operación no permitida en el estado actual.')
    } else if (status === 422) {
      // Errores de validación — los maneja el formulario
    } else if (status && status >= 500) {
      toast.error('Error del servidor. Contacta soporte técnico.')
    }

    return Promise.reject(error)
  },
)

// ── Helper para extraer `data` de JSend ─────────────────────────────
export function extractData<T>(response: AxiosResponse<{ data: T }>): T {
  return response.data.data
}
