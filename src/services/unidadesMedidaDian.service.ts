import { api } from '@/lib/api'
import { getTenantId } from '@/services/auth.service'

export interface UnidadMedidaDian {
  codigo: string
  nombre: string
  descripcion?: string | null
  activo: boolean
  sistema: boolean
}

export interface UnidadMedidaOption {
  code: string
  label: string
}

export const UNIDADES_DIAN_FALLBACK: UnidadMedidaOption[] = [
  { code: '94',  label: 'Unidad' },
  { code: '70',  label: 'Actividad' },
  { code: 'KGM', label: 'Kilogramo' },
  { code: 'GRM', label: 'Gramo' },
  { code: 'TNE', label: 'Tonelada métrica' },
  { code: 'LTR', label: 'Litro' },
  { code: 'MLT', label: 'Mililitro' },
  { code: 'MTR', label: 'Metro' },
  { code: 'CMT', label: 'Centímetro' },
  { code: 'MMT', label: 'Milímetro' },
  { code: 'MTK', label: 'Metro cuadrado' },
  { code: 'CMK', label: 'Centímetro cuadrado' },
  { code: 'MTQ', label: 'Metro cúbico' },
  { code: 'CMQ', label: 'Centímetro cúbico' },
  { code: 'HUR', label: 'Hora' },
  { code: 'MIN', label: 'Minuto' },
  { code: 'DAY', label: 'Día' },
  { code: 'WEE', label: 'Semana' },
  { code: 'MON', label: 'Mes' },
  { code: 'ANN', label: 'Año' },
  { code: 'SET', label: 'Kit / Conjunto' },
  { code: 'PAR', label: 'Par' },
  { code: 'DZN', label: 'Docena' },
  { code: 'GLL', label: 'Galón americano' },
  { code: 'BX',  label: 'Caja' },
  { code: 'BG',  label: 'Bolsa' },
  { code: 'BO',  label: 'Botella' },
  { code: 'PK',  label: 'Paquete' },
  { code: 'RL',  label: 'Rollo' },
  { code: 'ST',  label: 'Hoja' },
  { code: 'GL',  label: 'Galón' },
  { code: 'E48', label: 'Servicio' },
  { code: 'ZZ',  label: 'Ítem mutuamente definido' },
]

const CACHE_TTL_MS = 5 * 60 * 1000

let cachedTenant: string | null = null
let cachedAt = 0
let cachedOptions: UnidadMedidaOption[] | null = null
let inFlight: Promise<UnidadMedidaOption[]> | null = null

function mapUnidad(unidad: UnidadMedidaDian): UnidadMedidaOption {
  return {
    code: unidad.codigo,
    label: unidad.nombre,
  }
}

function cacheIsFresh(tenantId: string) {
  return cachedTenant === tenantId && cachedOptions !== null && Date.now() - cachedAt < CACHE_TTL_MS
}

export const unidadesMedidaDianService = {
  getActivas: async (): Promise<UnidadMedidaOption[]> => {
    const tenantId = getTenantId()
    if (!tenantId) return []

    if (cacheIsFresh(tenantId)) return cachedOptions ?? []
    if (inFlight) return inFlight

    inFlight = api.get(`/${tenantId}/unidades-medida-dian`, {
      params: { limit: 300, estado: 'activos' },
    }).then(res => {
      const options = (res.data.data ?? []).map(mapUnidad)
      cachedTenant = tenantId
      cachedAt = Date.now()
      cachedOptions = options
      return options
    }).finally(() => {
      inFlight = null
    })

    return inFlight
  },

  invalidate: () => {
    cachedTenant = null
    cachedAt = 0
    cachedOptions = null
    inFlight = null
  },
}
