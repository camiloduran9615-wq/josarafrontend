/**
 * Store de autenticación — Zustand.
 * Persiste el token en localStorage para sobrevivir recargas.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '../types/common.types'
import { setApiToken } from '../api/client'

interface AuthState {
  user:    AuthUser | null
  token:   string | null
  isAuth:  boolean
  setAuth: (user: AuthUser, token: string) => void
  logout:  () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:   null,
      token:  null,
      isAuth: false,

      setAuth(user, token) {
        setApiToken(token)
        set({ user, token, isAuth: true })
      },

      logout() {
        setApiToken(null)
        set({ user: null, token: null, isAuth: false })
      },
    }),
    {
      name: 'saas-auth',
      onRehydrateStorage: () => (state) => {
        // Restaurar el token al Axios client tras un reload
        if (state?.token) setApiToken(state.token)
      },
    },
  ),
)

/** Helpers de rol */
export function useIsContador(): boolean {
  const role = useAuthStore((s) => s.user?.role)
  return role === 'contador' || role === 'admin'
}

export function useIsAuditor(): boolean {
  const role = useAuthStore((s) => s.user?.role)
  return role === 'auditor' || role === 'admin'
}

export function useCanEdit(): boolean {
  const role = useAuthStore((s) => s.user?.role)
  return role === 'admin' || role === 'contador' || role === 'auxiliar'
}
