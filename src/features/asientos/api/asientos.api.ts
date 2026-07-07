import { apiClient } from '@/shared/api/client'
import type { JSendPaginated, JSendResponse } from '@/shared/types/common.types'
import type {
  Asiento,
  AsientoFilters,
  ReverseAsientoForm,
  StoreAsientoForm,
  UpdateAsientoForm,
  VoidAsientoForm,
} from './asientos.types'

// Ruta relativa: el interceptor de apiClient inyecta el tenant al request.
// Mantener un único lugar (interceptor) que conozca el tenantId evita race
// conditions cuando React Query monta antes de que getTenantId() esté listo.
const base = () => `/asientos`

export const asientosApi = {
  /** GET /asientos — listado paginado */
  list(filters: AsientoFilters = {}) {
    return apiClient
      .get<JSendPaginated<Asiento>>(base(), { params: filters })
      .then((r) => r.data)
  },

  /** GET /asientos/{id} */
  get(id: string) {
    return apiClient
      .get<JSendResponse<Asiento>>(`${base()}/${id}`)
      .then((r) => r.data.data)
  },

  /** POST /asientos */
  create(data: StoreAsientoForm) {
    return apiClient
      .post<JSendResponse<Asiento>>(base(), data)
      .then((r) => r.data.data)
  },

  /** PUT /asientos/{id} */
  update(id: string, data: UpdateAsientoForm) {
    return apiClient
      .put<JSendResponse<Asiento>>(`${base()}/${id}`, data)
      .then((r) => r.data.data)
  },

  /** DELETE /asientos/{id} — descarta borrador */
  discard(id: string) {
    return apiClient.delete(`${base()}/${id}`).then((r) => r.data)
  },

  /** POST /asientos/{id}/aprobar */
  approve(id: string) {
    return apiClient
      .post<JSendResponse<Asiento>>(`${base()}/${id}/aprobar`)
      .then((r) => r.data.data)
  },

  /** POST /asientos/{id}/anular */
  void(id: string, data: VoidAsientoForm) {
    return apiClient
      .post<JSendResponse<Asiento>>(`${base()}/${id}/anular`, data)
      .then((r) => r.data.data)
  },

  /** POST /asientos/{id}/reversar */
  reverse(id: string, data: ReverseAsientoForm) {
    return apiClient
      .post<JSendResponse<Asiento>>(`${base()}/${id}/reversar`, data)
      .then((r) => r.data.data)
  },
}
