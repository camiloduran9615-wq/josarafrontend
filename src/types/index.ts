// Tipos compartidos del sistema

export interface User {
  id: string
  nombre: string
  apellido: string
  nombre_completo: string
  email: string
  role: Role
  role_label: string
  activo: boolean
  last_login: string | null
  created_at: string
  can: {
    approve: boolean
    void: boolean
    close_period: boolean
    manage_users: boolean
  }
}

export type Role = 'admin' | 'contador' | 'auxiliar' | 'auditor' | 'readonly'

export interface Sucursal {
  id: string
  nombre: string
  ciudad?: string | null
  direccion?: string | null
  telefono?: string | null
  activa?: boolean
  es_principal?: boolean
}

export interface LoginSession {
  token: string
  token_type: string
  tenant_slug: string
  tenant_id?: string
  user: User
  sucursales?: Sucursal[]
}

export interface LoginPayload {
  tenant_slug?: string
  company_code?: string
  tenant_id?: string
  email: string
  password: string
}

export interface LoginResponse {
  success: boolean
  data: LoginSession
}

export interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T
}

export interface PaginatedResponse<T> {
  success: boolean
  total: number
  data: T[]
}

export interface CreateUserPayload {
  nombre: string
  apellido: string
  email: string
  password: string
  password_confirmation: string
  role: Role
}

export interface UpdateUserPayload {
  nombre?: string
  apellido?: string
  email?: string
  role?: Role
}
