import { useState } from 'react'
import { Building2 } from 'lucide-react'
import { usePlatform } from '@/config/usePlatform'
import { useTheme } from '@/config/theme'
import './PlatformLogo.css'

interface PlatformLogoProps {
  variant?: 'inline' | 'hero'
  size?: number
  className?: string
}

export default function PlatformLogo({
  variant = 'inline',
  size = 40,
  className,
}: PlatformLogoProps) {
  const platform = usePlatform()
  const { resolvedAppearance } = useTheme()
  const [loadedLogos, setLoadedLogos] = useState<Record<string, boolean>>({})
  const [erroredLogos, setErroredLogos] = useState<Record<string, boolean>>({})

  const logo = resolvedAppearance === 'dark' ? platform.logoDark : platform.logoLight
  const boxSize = variant === 'hero' ? Math.max(size * 1.8, 120) : size
  const loaded = loadedLogos[logo] ?? false
  const error = erroredLogos[logo] ?? false

  return (
    <span
      className={`platform-logo platform-logo--${variant}${className ? ` ${className}` : ''}${error ? ' platform-logo--fallback' : ''}`}
      style={{ width: boxSize, height: boxSize }}
    >
      {error ? (
        <Building2 size={Math.round(boxSize * 0.42)} />
      ) : (
        <img
          key={`${resolvedAppearance}:${logo}`}
          src={logo}
          alt={platform.name}
          className={loaded ? 'is-loaded' : ''}
          width={Math.round(boxSize)}
          height={Math.round(boxSize)}
          onLoad={() => {
            setLoadedLogos(current => ({ ...current, [logo]: true }))
            setErroredLogos(current => ({ ...current, [logo]: false }))
          }}
          onError={() => {
            setErroredLogos(current => ({ ...current, [logo]: true }))
          }}
        />
      )}
    </span>
  )
}
