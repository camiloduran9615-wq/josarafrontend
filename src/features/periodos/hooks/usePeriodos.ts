import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { periodosApi } from '../api/periodos.api'
import type {
  CerrarPeriodoForm,
  SolicitarReaperturaForm,
} from '../api/periodos.types'

export const periodoKeys = {
  all:      () => ['periodos'] as const,
  list:     () => [...periodoKeys.all(), 'list'] as const,
  detail:   (id: string) => [...periodoKeys.all(), 'detail', id] as const,
  checklist:(id: string) => [...periodoKeys.all(), 'checklist', id] as const,
}

export function usePeriodos() {
  return useQuery({
    queryKey: periodoKeys.list(),
    queryFn:  () => periodosApi.list(),
    staleTime: 60_000,
  })
}

export function usePeriodo(id: string) {
  return useQuery({
    queryKey: periodoKeys.detail(id),
    queryFn:  () => periodosApi.get(id),
    enabled:  Boolean(id),
  })
}

export function useChecklistCierre(id: string) {
  return useQuery({
    queryKey: periodoKeys.checklist(id),
    queryFn:  () => periodosApi.checklistCierre(id),
    enabled:  Boolean(id),
    staleTime: 0,  // siempre fresco antes de cerrar
  })
}

export function useCerrarPeriodo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CerrarPeriodoForm }) =>
      periodosApi.cerrar(id, data),
    onSuccess: (periodo) => {
      qc.invalidateQueries({ queryKey: periodoKeys.list() })
      qc.setQueryData(periodoKeys.detail(periodo.id), periodo)
      toast.success(`Periodo ${periodo.codigo} cerrado correctamente.`)
    },
  })
}

export function useSolicitarReapertura() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SolicitarReaperturaForm }) =>
      periodosApi.solicitarReapertura(id, data),
    onSuccess: ({ expires_at }) => {
      toast.success(`Solicitud enviada. Expira a las ${new Date(expires_at).toLocaleTimeString('es-CO')}.`)
    },
  })
}

export function useAprobarReapertura() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => periodosApi.aprobarReapertura(id),
    onSuccess: (periodo) => {
      qc.invalidateQueries({ queryKey: periodoKeys.list() })
      qc.setQueryData(periodoKeys.detail(periodo.id), periodo)
      toast.success(`Periodo ${periodo.codigo} reabierto.`)
    },
  })
}

export function useBloquearFiscal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => periodosApi.bloquearFiscal(id),
    onSuccess: (periodo) => {
      qc.invalidateQueries({ queryKey: periodoKeys.list() })
      toast.warning(`Periodo ${periodo.codigo} bloqueado fiscalmente. Esta acción es irreversible.`)
    },
  })
}
