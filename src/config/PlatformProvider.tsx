import { useEffect, useState, type ReactNode } from 'react'
import { PlatformContext } from './usePlatform'
import {
  applyPlatform,
  defaultPlatform,
  fetchPlatform,
  type PlatformConfig,
} from './platform'

/**
 * Provee el branding a toda la app. Aplica los defaults del build de inmediato
 * (title/favicon/meta) y luego consulta GET /api/platform para sobrescribir en
 * runtime — la base del futuro White Label. La carga degrada de forma segura.
 */
export function PlatformProvider({ children }: { children: ReactNode }) {
  const [platform, setPlatform] = useState<PlatformConfig>(defaultPlatform)

  useEffect(() => {
    applyPlatform(defaultPlatform)

    let active = true
    void fetchPlatform().then((cfg) => {
      if (!active) return
      setPlatform(cfg)
      applyPlatform(cfg)
    })

    return () => {
      active = false
    }
  }, [])

  return (
    <PlatformContext.Provider value={platform}>
      {children}
    </PlatformContext.Provider>
  )
}
