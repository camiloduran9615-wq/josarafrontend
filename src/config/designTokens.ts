import type { Appearance, ResolvedAppearance } from './theme'

export interface BrandTokens {
  primary: string
  secondary: string
  neutral: string
  light: string
  dark: string
}

export type DesignTokenMap = Record<string, string>

const STATUS = {
  success: '#059669',
  warning: '#d97706',
  danger: '#dc2626',
  info: '#0284c7',
} as const

function hexToRgb(hex: string): string {
  const normalized = hex.replace('#', '').trim()
  const expanded = normalized.length === 3
    ? normalized.split('').map(char => char + char).join('')
    : normalized

  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
    return '13, 27, 42'
  }

  const value = Number.parseInt(expanded, 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255

  return `${r}, ${g}, ${b}`
}

function themePalette(appearance: ResolvedAppearance, brand: BrandTokens): DesignTokenMap {
  const isLight = appearance === 'light'
  const background = isLight ? brand.light : brand.dark
  const surface = isLight ? brand.light : '#111827'
  const card = isLight ? brand.light : '#1a2236'
  const elevated = isLight ? '#f1f5f9' : '#202a42'
  const hover = isLight ? '#eef2f7' : '#1e2d45'
  const inset = isLight ? '#f1f5f9' : '#0b1220'
  const foreground = isLight ? '#0f172a' : '#f1f5f9'
  const secondaryText = isLight ? '#475569' : '#94a3b8'
  const muted = brand.neutral
  const disabled = isLight ? '#94a3b8' : '#475569'
  const border = isLight ? 'rgba(15,23,42,0.11)' : 'rgba(255,255,255,0.08)'
  const borderStrong = isLight ? 'rgba(15,23,42,0.18)' : 'rgba(255,255,255,0.14)'
  const overlay = isLight ? 'rgba(15,23,42,0.42)' : 'rgba(0,0,0,0.7)'
  const navbar = isLight ? 'rgba(255,255,255,0.84)' : 'rgba(15,15,26,0.85)'
  const accentGlow = `color-mix(in srgb, ${brand.primary} ${isLight ? '20%' : '15%'}, transparent)`
  const borderAccent = `color-mix(in srgb, ${brand.primary} ${isLight ? '36%' : '30%'}, transparent)`
  const surfaceAccent = `color-mix(in srgb, ${brand.primary} ${isLight ? '9%' : '14%'}, transparent)`
  const emphasisSoft = `color-mix(in srgb, ${brand.secondary} 8%, transparent)`
  const emphasisBorder = `color-mix(in srgb, ${brand.secondary} 24%, transparent)`

  const chart = [
    brand.primary,
    brand.secondary,
    STATUS.success,
    STATUS.warning,
    STATUS.info,
    muted,
  ]

  return {
    '--color-background': background,
    '--color-foreground': foreground,
    '--color-primary': brand.primary,
    '--color-secondary': brand.secondary,
    '--color-accent': brand.primary,
    '--color-border': border,
    '--color-input': surface,
    '--color-card': card,
    '--color-popover': card,
    '--color-sidebar': surface,
    '--color-success': STATUS.success,
    '--color-warning': STATUS.warning,
    '--color-danger': STATUS.danger,
    '--color-info': STATUS.info,
    '--success-color': STATUS.success,
    '--warning-color': STATUS.warning,
    '--danger-color': STATUS.danger,
    '--info-color': STATUS.info,
    '--color-muted': muted,
    '--color-hover': hover,
    '--color-focus': accentGlow,
    '--color-disabled': disabled,
    '--color-chart-1': chart[0],
    '--color-chart-2': chart[1],
    '--color-chart-3': chart[2],
    '--color-chart-4': chart[3],
    '--color-chart-5': chart[4],
    '--color-chart-6': chart[5],
    '--color-table-header-bg': elevated,
    '--color-table-row-hover-bg': hover,
    '--color-modal-overlay': overlay,
    '--color-button-primary-bg': brand.primary,
    '--color-button-primary-fg': '#ffffff',
    '--color-button-secondary-bg': hover,
    '--color-button-secondary-fg': foreground,
    '--color-button-danger-bg': 'rgba(220,38,38,0.15)',
    '--color-button-danger-fg': STATUS.danger,
    '--color-badge-success-bg': 'rgba(16,185,129,0.15)',
    '--color-badge-warning-bg': 'rgba(245,158,11,0.15)',
    '--color-badge-danger-bg': 'rgba(239,68,68,0.15)',
    '--color-badge-info-bg': surfaceAccent,
    '--color-badge-muted-bg': elevated,
    '--color-badge-emphasis-bg': emphasisSoft,
    '--color-badge-emphasis-fg': `color-mix(in srgb, ${brand.secondary} 82%, ${foreground})`,
    '--color-badge-emphasis-border': emphasisBorder,
    '--color-tooltip-bg': card,
    '--color-tooltip-fg': foreground,
    '--color-pagination-bg': card,
    '--color-pagination-fg': secondaryText,
    '--color-pagination-active-bg': brand.primary,
    '--color-pagination-active-fg': '#ffffff',
    '--color-pagination-border': border,
    '--color-sidebar-bg': surface,
    '--color-sidebar-fg': foreground,
    '--color-sidebar-hover-bg': hover,
    '--color-sidebar-active-bg': surfaceAccent,
    '--color-sidebar-active-fg': brand.primary,
    '--color-sidebar-border': border,
    '--color-sidebar-accent': borderAccent,
    '--color-chart-grid': border,
    '--color-chart-axis': secondaryText,
    '--color-chart-tooltip-border': border,
    '--color-chart-tooltip-bg': card,
    '--color-chart-tooltip-fg': foreground,
    '--color-chart-line': brand.primary,
    '--color-chart-fill': `color-mix(in srgb, ${brand.primary} 28%, transparent)`,
    '--color-chart-positive': STATUS.success,
    '--color-chart-negative': STATUS.danger,
    '--color-chart-neutral': muted,
    '--color-border-strong': borderStrong,
    '--color-surface-accent': surfaceAccent,
    '--color-emphasis': brand.secondary,
    '--color-emphasis-soft': emphasisSoft,
    '--color-emphasis-border': emphasisBorder,
    '--browser-theme-color': background,
    '--navbar-bg': navbar,
    '--login-branding-bg': isLight
      ? 'linear-gradient(145deg, var(--color-background) 0%, color-mix(in srgb, var(--color-primary) 8%, var(--color-background)) 100%)'
      : 'linear-gradient(145deg, color-mix(in srgb, var(--color-primary) 16%, var(--color-background)) 0%, color-mix(in srgb, var(--color-primary) 8%, var(--color-background)) 100%)',
    '--text-primary': foreground,
    '--text-secondary': secondaryText,
    '--text-muted': muted,
    '--text-disabled': disabled,
    '--bg-base': background,
    '--bg-surface': surface,
    '--bg-card': card,
    '--bg-elevated': elevated,
    '--bg-hover': hover,
    '--bg-subtle': background,
    '--bg-inset': inset,
    '--border': border,
    '--border-strong': borderStrong,
    '--glass-bg': isLight ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.04)',
    '--modal-overlay': overlay,
    '--surface-accent': surfaceAccent,
    '--shadow-glow': isLight
      ? `0 18px 48px color-mix(in srgb, ${brand.primary} 14%, transparent)`
      : `0 0 40px color-mix(in srgb, ${brand.primary} 15%, transparent)`,
    '--shadow-card': isLight ? '0 12px 32px rgba(15,23,42,0.08)' : '0 4px 24px rgba(0,0,0,0.4)',
    '--shadow-dropdown': isLight ? '0 18px 48px rgba(15,23,42,0.16)' : '0 16px 48px rgba(0,0,0,0.5)',
    '--accent': brand.primary,
    '--primary-rgb': hexToRgb(brand.primary),
    '--accent-light': `color-mix(in srgb, ${brand.primary} 72%, var(--color-white))`,
    '--accent-strong': `color-mix(in srgb, ${brand.primary} 82%, var(--color-black))`,
    '--accent-glow': accentGlow,
    '--border-accent': borderAccent,
    '--success': STATUS.success,
    '--warning': STATUS.warning,
    '--danger': STATUS.danger,
    '--info': STATUS.info,
  }
}

export function buildThemeTokenMap(
  appearance: ResolvedAppearance,
  brand: BrandTokens,
): DesignTokenMap {
  return themePalette(appearance, brand)
}

export function getDefaultBrandTokens(): BrandTokens {
  return {
    primary: '#0D1B2A',
    secondary: '#D4AF37',
    neutral: '#6B7280',
    light: '#FFFFFF',
    dark: '#0B0F14',
  }
}

export function setCssVars(target: HTMLElement, tokens: DesignTokenMap): void {
  for (const [key, value] of Object.entries(tokens)) {
    target.style.setProperty(key, value)
  }
}

export function normalizeAppearance(value: Appearance): ResolvedAppearance {
  return value === 'dark' ? 'dark' : 'light'
}
