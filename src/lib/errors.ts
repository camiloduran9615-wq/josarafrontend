/**
 * Helpers para extraer mensajes legibles de errores de la API Laravel.
 *
 * Laravel responde 422 con:
 *   { message: "Validación fallida.", errors: { campo: ["msg1", "msg2"] } }
 *
 * Estos helpers convierten esa estructura en un string concatenado que el
 * usuario pueda entender — en vez de mostrar solo "Validación fallida".
 */

interface LaravelValidationError {
  message?: string
  errors?: Record<string, unknown>
}

/** Normaliza un valor de errors[campo] a un string legible. */
function flattenErrorValue(v: unknown): string {
  if (v == null)                              return ''
  if (typeof v === 'string')                  return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (Array.isArray(v))                       return v.map(flattenErrorValue).filter(Boolean).join(' · ')
  // Objetos anidados (ej: Factus devuelve { code, message, fields })
  if (typeof v === 'object') {
    const obj = v as Record<string, unknown>
    // Heurística: si tiene "message", usarlo
    if (typeof obj.message === 'string') return obj.message
    if (typeof obj.error   === 'string') return obj.error
    // Fallback: aplanar valores legibles
    return Object.values(obj).map(flattenErrorValue).filter(Boolean).join(' · ')
  }
  return ''
}

/**
 * Extrae un mensaje legible de cualquier error de Axios.
 *
 * Formatos soportados:
 *   1. Error de validación Laravel (422):
 *      { message: "...", errors: { campo: ["msg1"] } }
 *      → "Validación fallida → campo: msg1"
 *   2. Error simple con message:
 *      { message: "..." } → ese mensaje
 *   3. Error de red sin response:
 *      → fallback
 *
 * Uso:
 *   try { ... } catch (err) { setError(extractApiError(err)) }
 */
export function extractApiError(err: unknown, fallback = 'Ocurrió un error inesperado.'): string {
  // axios pone el body en err.response.data
  const data = (err as { response?: { data?: LaravelValidationError } })?.response?.data

  if (!data) {
    // Sin respuesta = error de red / servidor caído
    const msg = (err as { message?: string })?.message
    return msg ? `Error de conexión: ${msg}` : fallback
  }

  // Si hay errores de validación, los unimos al mensaje
  if (data.errors && Object.keys(data.errors).length > 0) {
    const detalles = Object.entries(data.errors)
      // Saltar claves que repiten el message del top-level (success/message/data)
      .filter(([campo]) => !['success', 'message', 'data'].includes(campo))
      .map(([campo, msgs]) => {
        const texto = flattenErrorValue(msgs)
        if (!texto) return ''
        return `${formatCampo(campo)}: ${texto}`
      })
      .filter(Boolean)
      .join(' | ')

    if (detalles) {
      return data.message
        ? `${data.message} → ${detalles}`
        : detalles
    }
  }

  return data.message ?? fallback
}

/** Convierte snake_case a Capitalizado legible: "fecha_vencimiento" → "Fecha vencimiento". */
function formatCampo(campo: string): string {
  return campo
    .replace(/_/g, ' ')
    .replace(/\./g, ' › ')
    .replace(/^./, c => c.toUpperCase())
}

/** Forma mínima del body que Laravel devuelve en errores de API (subconjunto de LaravelValidationError + status/errores). */
interface AxiosErrorLike {
  response?: {
    status?: number
    data?: { message?: string; errors?: unknown }
  }
  message?: string
}

/**
 * Extrae de forma segura y tipada el objeto `response.data` de un error de
 * Axios, sin la lógica de formateo de extractApiError(). Pensado para los
 * `catch` que hoy acceden a `err.response?.data?.X` con `err: any` — permite
 * quitar el `any` sin cambiar el comportamiento existente.
 */
export function getAxiosErrorData(err: unknown): AxiosErrorLike['response'] {
  return (err as AxiosErrorLike)?.response
}

/** Mensaje crudo del backend (`response.data.message`), o el `message` nativo del error si no hay respuesta. */
export function getErrorMessage(err: unknown): string | undefined {
  return (err as AxiosErrorLike)?.response?.data?.message ?? (err as AxiosErrorLike)?.message
}
