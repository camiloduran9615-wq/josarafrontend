import { useLayoutEffect, type ReactNode } from 'react'
import { PlatformProvider } from './PlatformProvider'
import { ThemeProvider, useTheme } from './theme'
import { usePlatform } from './usePlatform'
import { applyPlatform } from './platform'
import {
  buildThemeTokenMap,
  getDefaultBrandTokens,
  normalizeAppearance,
  setCssVars,
} from './designTokens'

function ThemeTokensBridge() {
  const platform = usePlatform()
  const { resolvedAppearance } = useTheme()

  useLayoutEffect(() => {
    const root = document.documentElement
    const tokens = buildThemeTokenMap(
      normalizeAppearance(resolvedAppearance),
      {
        primary: platform.primaryColor ?? getDefaultBrandTokens().primary,
        secondary: platform.secondaryColor ?? getDefaultBrandTokens().secondary,
        neutral: getDefaultBrandTokens().neutral,
        light: getDefaultBrandTokens().light,
        dark: getDefaultBrandTokens().dark,
      },
    )

    root.dataset.theme = normalizeAppearance(resolvedAppearance)
    root.style.colorScheme = normalizeAppearance(resolvedAppearance)
    setCssVars(root, tokens)
    applyPlatform(platform)
  }, [platform, resolvedAppearance])

  return null
}

export function PlatformThemeProvider({ children }: { children: ReactNode }) {
  return (
    <PlatformProvider>
      <ThemeProvider>
        <ThemeTokensBridge />
        {children}
      </ThemeProvider>
    </PlatformProvider>
  )
}
