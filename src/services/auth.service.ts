import { api, setToken, clearToken, setTenantId, getTenantId, clearTenantId } from '@/lib/api'
import type { LoginPayload, LoginResponse, User, ApiResponse } from '@/types'

// Re-exportar para que el resto del código que importa desde auth.service siga funcionando
export { setTenantId, getTenantId, clearTenantId }

/**
 * Base URL del tenant actual.
 * Login es central (/auth/login).
 * Me y Logout son del tenant (/{tenantId}/auth/...) porque el token Sanctum
 * se almacena en la DB del tenant, no en la DB central.
 */
const tenantBase = () => `/${getTenantId()}`

export const authService = {
  /** POST /api/v1/auth/login — central, no requiere tenant en URL */
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const { data } = await api.post<LoginResponse>('/auth/login', payload)
    setToken(data.data.token)
    setTenantId(data.data.tenant_slug)
    return data
  },

  /** POST /api/v1/{tenant}/auth/logout — token en DB del tenant */
  logout: async (): Promise<void> => {
    await api.post(`${tenantBase()}/auth/logout`)
    clearToken()
    clearTenantId()
  },

  /** GET /api/v1/{tenant}/auth/me — token en DB del tenant */
  me: async (): Promise<User> => {
    const { data } = await api.get<ApiResponse<User>>(`${tenantBase()}/auth/me`)
    return data.data
  },
}
