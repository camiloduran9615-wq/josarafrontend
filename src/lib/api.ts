import axios from 'axios'

const TOKEN_KEY = 'auth_token'
const TENANT_KEY = 'tenant_slug'
const LEGACY_TENANT_KEY = 'tenant_id'

export const setToken     = (t: string | null) => t ? localStorage.setItem(TOKEN_KEY,  t) : localStorage.removeItem(TOKEN_KEY)
export const getToken     = () => localStorage.getItem(TOKEN_KEY)
export const clearToken   = () => localStorage.removeItem(TOKEN_KEY)

export const setTenantId = (id: string | null) => {
  if (id) {
    localStorage.setItem(TENANT_KEY, id)
    localStorage.setItem(LEGACY_TENANT_KEY, id)
  } else {
    localStorage.removeItem(TENANT_KEY)
    localStorage.removeItem(LEGACY_TENANT_KEY)
  }
}
export const getTenantId = () => localStorage.getItem(TENANT_KEY) ?? localStorage.getItem(LEGACY_TENANT_KEY)
export const clearTenantId = () => {
  localStorage.removeItem(TENANT_KEY)
  localStorage.removeItem(LEGACY_TENANT_KEY)
}

export const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
})

// Adjunta el token en cada request
api.interceptors.request.use(config => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Si el token expira (401) limpia credenciales y notifica a AuthContext
// mediante un CustomEvent; AuthContext se encarga de la navegación.
// Los errores de red (sin respuesta) NO cierran sesión automáticamente.
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      clearToken()
      clearTenantId()
      // Notifica a AuthContext sin importar el componente activo
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))
      return Promise.reject(err)
    }

    // Sin respuesta = problema de red o servidor caído; solo loguea
    if (!err.response) {
      console.warn(
        '[API] Sin respuesta del servidor. ' +
        'Verifica que el backend (Docker) esté corriendo.',
        err.message,
      )
    }

    return Promise.reject(err)
  }
)
