import { apiClient } from '@/shared/api/client'
import type { JSendPaginated, JSendResponse } from '@/shared/types/common.types'
import type {
  AprobarReaperturaForm,
  CerrarPeriodoForm,
  ChecklistCierre,
  PeriodoContable,
  SolicitarReaperturaForm,
} from './periodos.types'

// Ruta relativa: el interceptor de apiClient inyecta el tenant.
const BASE = () => `/periodos`

export const periodosApi = {
  list() {
    return apiClient
      .get<JSendPaginated<PeriodoContable>>(BASE())
      .then((r) => r.data)
  },

  get(id: string) {
    return apiClient
      .get<JSendResponse<PeriodoContable>>(`${BASE()}/${id}`)
      .then((r) => r.data.data)
  },

  checklistCierre(id: string) {
    return apiClient
      .get<JSendResponse<ChecklistCierre>>(`${BASE()}/${id}/checklist-cierre`)
      .then((r) => r.data.data)
  },

  cerrar(id: string, data: CerrarPeriodoForm) {
    return apiClient
      .post<JSendResponse<PeriodoContable>>(`${BASE()}/${id}/cerrar`, data)
      .then((r) => r.data.data)
  },

  solicitarReapertura(id: string, data: SolicitarReaperturaForm) {
    return apiClient
      .post<JSendResponse<{ expires_at: string }>>(`${BASE()}/${id}/reabrir/solicitar`, data)
      .then((r) => r.data.data)
  },

  aprobarReapertura(id: string, data?: AprobarReaperturaForm) {
    return apiClient
      .post<JSendResponse<PeriodoContable>>(`${BASE()}/${id}/reabrir/aprobar`, data ?? {})
      .then((r) => r.data.data)
  },

  bloquearFiscal(id: string) {
    return apiClient
      .post<JSendResponse<PeriodoContable>>(`${BASE()}/${id}/bloquear-fiscal`)
      .then((r) => r.data.data)
  },
}
