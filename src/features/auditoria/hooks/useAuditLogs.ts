import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { auditApi } from '../api/audit.api'
import type { AuditFilters } from '../api/audit.types'

export const auditKeys = {
  all:    () => ['audit-logs'] as const,
  lists:  () => [...auditKeys.all(), 'list'] as const,
  list:   (f: AuditFilters) => [...auditKeys.lists(), f] as const,
  detail: (id: string) => [...auditKeys.all(), 'detail', id] as const,
}

export function useAuditLogs(filters: AuditFilters = {}) {
  return useQuery({
    queryKey: auditKeys.list(filters),
    queryFn:  () => auditApi.list(filters),
    staleTime: 60_000,
  })
}

export function useAuditLog(id: string) {
  return useQuery({
    queryKey: auditKeys.detail(id),
    queryFn:  () => auditApi.get(id),
    enabled:  Boolean(id),
  })
}

export function useExportAuditLogs() {
  return useMutation({
    mutationFn: (filters: AuditFilters) => auditApi.export(filters),
    onSuccess: (response) => {
      // Descargar el blob como archivo
      const blob   = new Blob([response.data as BlobPart], { type: 'text/csv' })
      const url    = window.URL.createObjectURL(blob)
      const link   = document.createElement('a')
      const fname  = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
      link.href    = url
      link.download = fname
      link.click()
      window.URL.revokeObjectURL(url)
      toast.success('Exportación descargada correctamente.')
    },
  })
}

export function useVerifyChain() {
  return useMutation({
    mutationFn: () => auditApi.verifyChain(),
    onSuccess: (result) => {
      if (result.integrity_ok) {
        toast.success('Cadena de hashes íntegra. No se detectó tampering.')
      } else {
        toast.error(
          `¡Integridad comprometida! Primer registro inválido: ${result.first_invalid_id}`,
        )
      }
    },
  })
}
