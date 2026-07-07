/**
 * TanStack Query hooks para Asientos.
 *
 * Decisiones UX:
 *  - staleTime 30s: el libro diario no cambia en cada segundo → evitamos
 *    refetches innecesarios mientras el contador trabaja.
 *  - Invalidación optimista en aprobar/anular para actualizar la tabla
 *    sin necesidad de recargar la página.
 *  - onError con toast ya está en el interceptor Axios; aquí solo
 *    re-lanzamos para que React Query marque el estado como error.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { asientosApi } from '../api/asientos.api'
import type {
  Asiento,
  AsientoFilters,
  ReverseAsientoForm,
  StoreAsientoForm,
  UpdateAsientoForm,
  VoidAsientoForm,
} from '../api/asientos.types'

// ── Query keys ────────────────────────────────────────────────────────
export const asientoKeys = {
  all:     () => ['asientos'] as const,
  lists:   () => [...asientoKeys.all(), 'list'] as const,
  list:    (f: AsientoFilters) => [...asientoKeys.lists(), f] as const,
  detail:  (id: string) => [...asientoKeys.all(), 'detail', id] as const,
}

// ── Queries ───────────────────────────────────────────────────────────

export function useAsientos(
  filters: AsientoFilters = {},
  options?: Partial<UseQueryOptions<Awaited<ReturnType<typeof asientosApi.list>>>>,
) {
  return useQuery({
    queryKey: asientoKeys.list(filters),
    queryFn:  () => asientosApi.list(filters),
    staleTime: 30_000,
    ...options,
  })
}

export function useAsiento(id: string) {
  return useQuery({
    queryKey: asientoKeys.detail(id),
    queryFn:  () => asientosApi.get(id),
    staleTime: 30_000,
    enabled:   Boolean(id),
  })
}

// ── Mutations ─────────────────────────────────────────────────────────

export function useCreateAsiento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: StoreAsientoForm) => asientosApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: asientoKeys.lists() })
      toast.success('Borrador creado correctamente.')
    },
  })
}

export function useUpdateAsiento(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateAsientoForm) => asientosApi.update(id, data),
    onSuccess: (updated) => {
      qc.setQueryData(asientoKeys.detail(id), updated)
      qc.invalidateQueries({ queryKey: asientoKeys.lists() })
      toast.success('Asiento actualizado.')
    },
  })
}

export function useDiscardAsiento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => asientosApi.discard(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: asientoKeys.lists() })
      toast.success('Borrador descartado.')
    },
  })
}

export function useApproveAsiento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => asientosApi.approve(id),
    onSuccess: (approved) => {
      // Actualizar el cache directamente para feedback inmediato
      qc.setQueryData<Asiento>(asientoKeys.detail(approved.id), approved)
      qc.invalidateQueries({ queryKey: asientoKeys.lists() })
      toast.success(`Asiento ${approved.numero ?? ''} aprobado.`)
    },
  })
}

export function useVoidAsiento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: VoidAsientoForm }) =>
      asientosApi.void(id, data),
    onSuccess: (voided) => {
      qc.setQueryData<Asiento>(asientoKeys.detail(voided.id), voided)
      qc.invalidateQueries({ queryKey: asientoKeys.lists() })
      toast.success(`Asiento ${voided.numero ?? ''} anulado.`)
    },
  })
}

export function useReverseAsiento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReverseAsientoForm }) =>
      asientosApi.reverse(id, data),
    onSuccess: (reverso) => {
      qc.invalidateQueries({ queryKey: asientoKeys.lists() })
      toast.success(`Reverso ${reverso.numero ?? ''} creado en periodo abierto.`)
    },
  })
}
