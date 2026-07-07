import { createContext, useContext } from 'react'
import { defaultPlatform, type PlatformConfig } from './platform'

/**
 * Contexto y hook del branding de plataforma.
 *
 * `usePlatform()` devuelve SIEMPRE una configuración válida: arranca con los
 * defaults del build y se actualiza cuando GET /api/platform responde (ver
 * PlatformProvider). Los componentes nunca reciben null, así no necesitan
 * lógica de carga ni textos de marca hardcodeados.
 */
export const PlatformContext = createContext<PlatformConfig>(defaultPlatform)

export function usePlatform(): PlatformConfig {
  return useContext(PlatformContext)
}
