/** Respuesta JSend estándar del backend */
export interface JSendResponse<T> {
  success: boolean
  data: T
  message?: string
  errors?: Record<string, string[]>
}

export interface JSendPaginated<T> {
  success: boolean
  data: T[]
  meta: {
    total:        number
    per_page:     number
    current_page: number
    last_page:    number
  }
}

/** Roles del sistema — espejo del backend */
export type UserRole = 'admin' | 'contador' | 'auxiliar' | 'auditor' | 'readonly'

export interface AuthUser {
  id:    string
  name:  string
  email: string
  role:  UserRole
}

/** Parámetros de paginación del servidor */
export interface PaginationParams {
  page?:     number
  per_page?: number
  sort?:     string
}

/** Tipo de error de validación 422 */
export interface ValidationErrors {
  message: string
  errors:  Record<string, string[]>
}

/** Extrae el primer error de cada campo */
export function firstError(
  errors: Record<string, string[]> | undefined,
  field: string,
): string | undefined {
  return errors?.[field]?.[0]
}
