/**
 * AuthContext — gestión de sesión optimista.
 *
 * Estrategia:
 *  1. Lee user / sucursales / sucursal-seleccionada de localStorage de forma
 *     SINCRÓNICA en los initializers de useState → no hay flash de login.
 *  2. Cuando hay token, verifica en SEGUNDO PLANO con /auth/me:
 *     - Si responde OK  → actualiza el user con los datos frescos del servidor.
 *     - Si responde 401 → token expirado; cierra sesión y navega a /login.
 *     - Si hay error de RED → mantiene la sesión; el usuario sigue logueado.
 *  3. El interceptor de Axios dispara el evento 'auth:unauthorized' ante
 *     cualquier 401 que ocurra mientras el usuario usa la app (token revocado,
 *     etc.). AuthContext escucha ese evento y cierra la sesión limpiamente.
 */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/services/auth.service'
import { getToken, clearToken, clearTenantId } from '@/lib/api'
import { useAuthStore } from '@/shared/stores/auth.store'
import type { LoginSession, Sucursal, User } from '@/types'

/** Sincroniza el AuthStore (Zustand, usado por features nuevos) con el user del sistema legacy. */
function syncAuthStore(user: User | null, token: string | null) {
  if (user && token) {
    useAuthStore.getState().setAuth(
      {
        id:    user.id,
        name:  `${user.nombre ?? ''} ${user.apellido ?? ''}`.trim() || user.email,
        email: user.email,
        role:  user.role,
      },
      token,
    )
  } else {
    useAuthStore.getState().logout()
  }
}

// ── Claves localStorage ────────────────────────────────────────────────────
const AUTH_USER_KEY       = 'auth_user'
const AUTH_SUCURSALES_KEY = 'auth_sucursales'
const SUCURSAL_KEY        = 'selected_sucursal'

// ── Helpers de persistencia ────────────────────────────────────────────────
function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function saveJSON(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* cuota llena */ }
}

function removeKeys(...keys: string[]) {
  keys.forEach(k => localStorage.removeItem(k))
}

// ── Tipos ──────────────────────────────────────────────────────────────────
interface AuthContextType {
  user:                User | null
  sucursal:            Sucursal | null
  availableSucursales: Sucursal[]
  isLoading:           boolean
  login:    (tenantSlug: string, email: string, password: string) => Promise<LoginSession>
  logout:   () => Promise<void>
  setSucursal: (sucursal: Sucursal) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

// ── Provider ───────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  // ── Estado — cargado síncronamente de localStorage ─────────────────────
  const [user, setUser] = useState<User | null>(
    () => loadJSON<User | null>(AUTH_USER_KEY, null),
  )
  const [sucursal, setSucursalState] = useState<Sucursal | null>(
    () => loadJSON<Sucursal | null>(SUCURSAL_KEY, null),
  )
  const [availableSucursales, setAvailableSucursales] = useState<Sucursal[]>(
    () => loadJSON<Sucursal[]>(AUTH_SUCURSALES_KEY, []),
  )

  // isLoading = true solo mientras verificamos el token en background y
  // todavía NO tenemos datos cacheados (primera carga real sin caché).
  const [isLoading, setIsLoading] = useState<boolean>(
    () => !!getToken() && !loadJSON<User | null>(AUTH_USER_KEY, null),
  )

  const navigate = useNavigate()

  // ── Limpia toda la sesión (local + estado) ──────────────────────────────
  const clearSession = useCallback(() => {
    clearToken()
    clearTenantId()
    setUser(null)
    setSucursalState(null)
    setAvailableSucursales([])
    removeKeys(AUTH_USER_KEY, AUTH_SUCURSALES_KEY, SUCURSAL_KEY)
    syncAuthStore(null, null)
  }, [])

  // ── Escucha 401 del interceptor de Axios ────────────────────────────────
  useEffect(() => {
    const onUnauthorized = () => {
      clearSession()
      navigate('/login', { replace: true })
    }
    window.addEventListener('auth:unauthorized', onUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized)
  }, [clearSession, navigate])

  // ── Verificación de token en segundo plano ──────────────────────────────
  useEffect(() => {
    if (!getToken()) {
      // Sin token → no hay sesión que verificar
      return
    }

    let cancelled = false

    authService.me()
      .then(freshUser => {
        if (cancelled) return
        // Actualiza con datos frescos del servidor
        setUser(freshUser)
        saveJSON(AUTH_USER_KEY, freshUser)
        syncAuthStore(freshUser, getToken())
      })
      .catch(err => {
        if (cancelled) return
        // 401 → token expirado; el interceptor ya disparó 'auth:unauthorized'
        // Aquí solo manejamos el caso de error de RED (sin respuesta):
        // en ese caso NO cerramos sesión; mantenemos el user cacheado.
        if (err.response?.status === 401) {
          // El interceptor ya limpió token y disparó el evento;
          // solo nos aseguramos de limpiar estado local si aún no se hizo.
          clearSession()
          navigate('/login', { replace: true })
        }
        // Cualquier otro error (red, timeout) → silencioso; sesión intacta.
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Solo al montar

  // ── login ───────────────────────────────────────────────────────────────
  const login = async (tenantSlug: string, email: string, password: string) => {
    const res = await authService.login({ tenant_slug: tenantSlug, email, password })
    const freshUser      = res.data.user
    const sucursales     = res.data.sucursales ?? []

    setUser(freshUser)
    setAvailableSucursales(sucursales)

    saveJSON(AUTH_USER_KEY, freshUser)
    saveJSON(AUTH_SUCURSALES_KEY, sucursales)
    syncAuthStore(freshUser, res.data.token)

    return res.data
  }

  // ── logout ──────────────────────────────────────────────────────────────
  const logout = async () => {
    try { await authService.logout() } catch { /* si falla el servidor, continúa */ }
    clearSession()
    navigate('/login', { replace: true })
  }

  // ── setSucursal ─────────────────────────────────────────────────────────
  const setSucursal = (s: Sucursal) => {
    setSucursalState(s)
    saveJSON(SUCURSAL_KEY, s)
  }

  return (
    <AuthContext.Provider
      value={{ user, sucursal, availableSucursales, isLoading, login, logout, setSucursal }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// ── Hook ───────────────────────────────────────────────────────────────────
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
