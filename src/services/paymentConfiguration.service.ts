import { api, getTenantId } from '@/lib/api'

export type PaymentTerm = {
  id: string; code: string; name: string; description?: string | null
  timing: 'immediate' | 'credit'; default_credit_days: number
  maximum_installments: number; allows_partial_payment: boolean
  allows_mixed_payment: boolean; applies_to_sales: boolean
  applies_to_purchases: boolean; requires_due_date: boolean
  is_active: boolean; display_order: number; methods?: PaymentMethod[]
}

export type PaymentMethod = {
  id: string; code: string; name: string; description?: string | null
  type: 'cash' | 'bank' | 'card' | 'check' | 'credit' | 'advance' | 'compensation' | 'other'
  dian_code?: string | null; requires_cash_account: boolean
  requires_bank_account: boolean; requires_reference: boolean
  allows_sales: boolean; allows_purchases: boolean; is_active: boolean
  display_order: number
}

export type PaymentTermPayload = Omit<PaymentTerm, 'id' | 'methods'> & { method_ids: string[] }
export type PaymentMethodPayload = Omit<PaymentMethod, 'id'>

const base = () => `/${getTenantId()}`

export const paymentConfigurationService = {
  async terms(includeInactive = true): Promise<PaymentTerm[]> {
    const { data } = await api.get(`${base()}/payment-terms`, { params: { include_inactive: includeInactive } })
    return data.data ?? []
  },
  async methods(includeInactive = true): Promise<PaymentMethod[]> {
    const { data } = await api.get(`${base()}/payment-methods`, { params: { include_inactive: includeInactive } })
    return data.data ?? []
  },
  async saveTerm(payload: PaymentTermPayload, id?: string): Promise<PaymentTerm> {
    const { data } = id
      ? await api.put(`${base()}/payment-terms/${id}`, payload)
      : await api.post(`${base()}/payment-terms`, payload)
    return data.data
  },
  async saveMethod(payload: PaymentMethodPayload, id?: string): Promise<PaymentMethod> {
    const { data } = id
      ? await api.put(`${base()}/payment-methods/${id}`, payload)
      : await api.post(`${base()}/payment-methods`, payload)
    return data.data
  },
  async termStatus(id: string, is_active: boolean): Promise<void> {
    await api.patch(`${base()}/payment-terms/${id}/status`, { is_active })
  },
  async methodStatus(id: string, is_active: boolean): Promise<void> {
    await api.patch(`${base()}/payment-methods/${id}/status`, { is_active })
  },
}
