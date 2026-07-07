import { apiClient } from '@/shared/api/client'
import type { JSendPaginated, JSendResponse } from '@/shared/types/common.types'
import type { AuditFilters, AuditLog, ChainVerificationResult } from './audit.types'

// Ruta relativa: el interceptor de apiClient inyecta el tenant.
const base = () => `/audit-logs`

export const auditApi = {
  list(filters: AuditFilters = {}) {
    return apiClient
      .get<JSendPaginated<AuditLog>>(base(), { params: filters })
      .then((r) => r.data)
  },

  get(id: string) {
    return apiClient
      .get<JSendResponse<AuditLog>>(`${base()}/${id}`)
      .then((r) => r.data.data)
  },

  /** POST /audit-logs/export — descarga CSV */
  export(filters: AuditFilters = {}) {
    return apiClient.post(
      `${base()}/export`,
      filters,
      { responseType: 'blob' },
    )
  },

  /** POST /audit-logs/verify-chain */
  verifyChain() {
    return apiClient
      .post<JSendResponse<ChainVerificationResult>>(`${base()}/verify-chain`)
      .then((r) => r.data.data)
  },
}
