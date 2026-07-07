import { api } from '@/lib/api'
import { getTenantId } from '@/services/auth.service'
import type { PaginatedResponse, ApiResponse, User, CreateUserPayload, UpdateUserPayload } from '@/types'

const base = () => `/${getTenantId()}`

export const userService = {
  list: async (): Promise<User[]> => {
    const { data } = await api.get<PaginatedResponse<User>>(`${base()}/users`)
    return data.data
  },

  get: async (id: string): Promise<User> => {
    const { data } = await api.get<ApiResponse<User>>(`${base()}/users/${id}`)
    return data.data
  },

  create: async (payload: CreateUserPayload): Promise<User> => {
    const { data } = await api.post<ApiResponse<User>>(`${base()}/users`, payload)
    return data.data
  },

  update: async (id: string, payload: UpdateUserPayload): Promise<User> => {
    const { data } = await api.put<ApiResponse<User>>(`${base()}/users/${id}`, payload)
    return data.data
  },

  deactivate: async (id: string): Promise<void> => {
    await api.delete(`${base()}/users/${id}`)
  },

  changePassword: async (id: string, payload: { current_password: string; password: string; password_confirmation: string }): Promise<void> => {
    await api.put(`${base()}/users/${id}/password`, payload)
  },
}
