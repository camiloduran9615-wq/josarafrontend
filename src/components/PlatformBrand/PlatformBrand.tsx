import PlatformLogo from '@/components/PlatformLogo/PlatformLogo'
import { usePlatform } from '@/config/usePlatform'
import './PlatformBrand.css'

interface PlatformBrandProps {
  variant?: 'inline' | 'hero'
  showTagline?: boolean
  showVersion?: boolean
  markSize?: number
  className?: string
}

export default function PlatformBrand({
  variant = 'inline',
  showTagline = false,
  showVersion = false,
  markSize = 40,
  className,
}: PlatformBrandProps) {
  const platform = usePlatform()

  return (
    <div className={`platform-brand platform-brand--${variant}${className ? ` ${className}` : ''}`}>
      <PlatformLogo variant={variant} size={markSize} />

      <span className="platform-brand__text">
        <span className="platform-brand__name">{platform.name}</span>
        {showTagline && <span className="platform-brand__tagline">{platform.tagline}</span>}
        {showVersion && <span className="platform-brand__version">v{platform.version}</span>}
      </span>
    </div>
  )
}
