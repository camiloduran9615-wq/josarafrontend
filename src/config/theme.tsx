import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type Appearance = 'light' | 'dark' | 'system'
export type ResolvedAppearance = 'light' | 'dark'

interface ThemeContextValue {
  appearance: Appearance
  resolvedAppearance: ResolvedAppearance
  setAppearance: (appearance: Appearance) => void
  toggleAppearance: () => void
}

const STORAGE_KEY = 'josara.appearance'

const ThemeContext = createContext<ThemeContextValue | null>(null)

function getStoredAppearance(): Appearance {
  if (typeof window === 'undefined') return 'system'

  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' || stored === 'system'
    ? stored
    : 'system'
}

function getSystemAppearance(): ResolvedAppearance {
  if (typeof window === 'undefined') return 'dark'

  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark'
}

function resolveAppearance(appearance: Appearance): ResolvedAppearance {
  return appearance === 'system' ? getSystemAppearance() : appearance
}

function applyAppearance(resolved: ResolvedAppearance): void {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  root.dataset.theme = resolved
  root.style.colorScheme = resolved

  const meta = document.head.querySelector<HTMLMetaElement>("meta[name='theme-color']")
  if (meta) {
    const value = getComputedStyle(root).getPropertyValue('--browser-theme-color').trim()
    meta.content = value || (resolved === 'dark' ? '#0a0e1a' : '#f8fafc')
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearanceState] = useState<Appearance>(() => getStoredAppearance())
  const [systemAppearance, setSystemAppearance] = useState<ResolvedAppearance>(() => getSystemAppearance())

  const resolvedAppearance = appearance === 'system' ? systemAppearance : appearance

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => setSystemAppearance(getSystemAppearance())

    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, appearance)
    applyAppearance(resolveAppearance(appearance))
  }, [appearance, systemAppearance])

  const value = useMemo<ThemeContextValue>(() => ({
    appearance,
    resolvedAppearance,
    setAppearance: setAppearanceState,
    toggleAppearance: () => {
      setAppearanceState(current => {
        const resolved = resolveAppearance(current)
        return resolved === 'dark' ? 'light' : 'dark'
      })
    },
  }), [appearance, resolvedAppearance])

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme debe usarse dentro de ThemeProvider')
  }

  return context
}
