/**
 * Branding de Plataforma — Single Source of Truth (frontend).
 *
 * Jerarquía de resolución:
 *   1. Defaults del build (variables VITE_APP_* de .env) → disponibles al instante.
 *   2. GET /api/platform (backend config/platform.php) → sobrescribe en runtime.
 *      Es la base del futuro White Label (branding por tenant).
 *
 * Ningún componente debe escribir el nombre de la plataforma literalmente:
 * todos consumen esto vía el hook usePlatform() o el componente <PlatformBrand />.
 */

export interface PlatformConfig {
  name: string
  shortName: string
  tagline: string
  description: string
  version: string
  logo: string
  logoLight: string
  logoDark: string
  favicon: string
  website: string
  primaryColor: string
  secondaryColor: string
  copyright: string
}

const env = import.meta.env
const defaultFaviconPath = '/branding/favicon.ico?v=20260704-logo'

/** Configuración por defecto: se arma desde las variables del build. */
export const defaultPlatform: PlatformConfig = {
  name: env.VITE_APP_NAME ?? 'JOSARA CLOUD',
  shortName: env.VITE_APP_SHORT_NAME ?? 'JOSARA',
  tagline: env.VITE_APP_TAGLINE ?? 'Confianza y precisión en cada número.',
  description: env.VITE_APP_DESCRIPTION ?? 'ERP Contable SaaS Multiempresa',
  version: env.VITE_APP_VERSION ?? '1.0.0',
  logo: '/logo_claro.png',
  logoLight: '/logo_claro.png',
  logoDark: '/logo_oscuro.png',
  favicon: defaultFaviconPath,
  website: '',
  primaryColor: '#0D1B2A',
  secondaryColor: '#D4AF37',
  copyright: `© ${env.VITE_APP_NAME ?? 'JOSARA CLOUD'}`,
}

/** Forma (parcial) de la respuesta pública de GET /api/platform. */
interface PlatformApiResponse {
  name?: string
  short_name?: string
  tagline?: string
  description?: string
  version?: string
  logo?: string
  logo_light?: string
  logo_dark?: string
  favicon?: string
  website?: string
  primary_color?: string
  secondary_color?: string
  copyright?: string
}

/**
 * Carga el branding desde el backend. Ante cualquier fallo (red, 4xx/5xx)
 * degrada de forma segura devolviendo los defaults del build — nunca lanza.
 */
export async function fetchPlatform(): Promise<PlatformConfig> {
  try {
    const res = await fetch('/api/platform', {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return defaultPlatform

    const d = (await res.json()) as PlatformApiResponse
    return {
      name: d.name ?? defaultPlatform.name,
      shortName: d.short_name ?? defaultPlatform.shortName,
      tagline: d.tagline ?? defaultPlatform.tagline,
      description: d.description ?? defaultPlatform.description,
      version: d.version ?? defaultPlatform.version,
      logo: d.logo ?? d.logo_light ?? defaultPlatform.logo,
      logoLight: d.logo_light ?? defaultPlatform.logoLight,
      logoDark: d.logo_dark ?? defaultPlatform.logoDark,
      favicon: normalizeFaviconPath(d.favicon ?? defaultPlatform.favicon),
      website: d.website ?? defaultPlatform.website,
      primaryColor: d.primary_color ?? defaultPlatform.primaryColor,
      secondaryColor: d.secondary_color ?? defaultPlatform.secondaryColor,
      copyright: d.copyright ?? defaultPlatform.copyright,
    }
  } catch {
    return defaultPlatform
  }
}

/**
 * Aplica el branding a los elementos globales del documento (title, favicon,
 * meta description, theme-color y CSS custom properties de marca). Esto es lo
 * que permite un rebranding/white-label en runtime sin tocar el markup.
 */
export function applyPlatform(p: PlatformConfig): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement

  document.title = p.name

  const ensure = <T extends HTMLElement>(selector: string, create: () => T): T => {
    const found = document.head.querySelector<T>(selector)
    if (found) return found
    const el = create()
    document.head.appendChild(el)
    return el
  }

  const favicon = ensure<HTMLLinkElement>("link[rel~='icon']", () => {
    const l = document.createElement('link')
    l.rel = 'icon'
    return l
  })
  favicon.rel = 'icon'
  favicon.type = p.favicon.endsWith('.ico') ? 'image/x-icon' : 'image/svg+xml'
  favicon.href = normalizeFaviconPath(p.favicon)

  const desc = ensure<HTMLMetaElement>("meta[name='description']", () => {
    const m = document.createElement('meta')
    m.name = 'description'
    return m
  })
  desc.content = p.description

  const theme = ensure<HTMLMetaElement>("meta[name='theme-color']", () => {
    const m = document.createElement('meta')
    m.name = 'theme-color'
    return m
  })
  theme.content = getComputedStyle(root).getPropertyValue('--browser-theme-color').trim() || p.primaryColor

  // Hooks CSS para White Label: el primario alimenta el acento global;
  // el secundario queda restringido a énfasis visual.
  root.style.setProperty('--color-brand-primary', p.primaryColor)
  root.style.setProperty('--color-brand-emphasis', p.secondaryColor)
  root.style.setProperty('--brand-primary', p.primaryColor)
  root.style.setProperty('--brand-secondary', p.secondaryColor)
  root.style.setProperty('--accent', p.primaryColor)
  root.style.setProperty('--emphasis', p.secondaryColor)
  root.style.setProperty('--emphasis-soft', `color-mix(in srgb, ${p.secondaryColor} 8%, transparent)`)
  root.style.setProperty('--emphasis-border', `color-mix(in srgb, ${p.secondaryColor} 24%, transparent)`)
  root.style.setProperty('--accent-glow', `color-mix(in srgb, ${p.primaryColor} 28%, transparent)`)
  root.style.setProperty('--border-accent', `color-mix(in srgb, ${p.primaryColor} 38%, transparent)`)
}

function normalizeFaviconPath(favicon: string): string {
  if (favicon === '/favicon.ico' || favicon === '/branding/favicon.ico') {
    return defaultFaviconPath
  }
  return favicon
}
