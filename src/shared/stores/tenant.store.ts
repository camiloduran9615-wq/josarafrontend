/**
 * Store del Tenant activo — Zustand.
 * Se inicializa desde la URL path: /app/{tenantId}/...
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { setApiTenant } from '../api/client'

interface TenantState {
  tenantId:   string | null
  tenantName: string | null
  setTenant:  (id: string, name?: string) => void
  clearTenant:() => void
}

export const useTenantStore = create<TenantState>()(
  persist(
    (set) => ({
      tenantId:   null,
      tenantName: null,

      setTenant(id, name) {
        setApiTenant(id)
        set({ tenantId: id, tenantName: name ?? null })
      },

      clearTenant() {
        set({ tenantId: null, tenantName: null })
      },
    }),
    {
      name: 'saas-tenant',
      onRehydrateStorage: () => (state) => {
        if (state?.tenantId) setApiTenant(state.tenantId)
      },
    },
  ),
)
