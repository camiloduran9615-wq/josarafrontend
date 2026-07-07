import { cn } from '@/lib/utils'

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'purple'

const variantMap: Record<string, Variant> = {
  // Asiento estados
  borrador:   'muted',
  aprobado:   'success',
  anulado:    'danger',
  reversado:  'warning',
  // Periodo estados
  abierto:          'success',
  en_revision:      'warning',
  cerrado:          'info',
  bloqueado_fiscal: 'danger',
  // Criticidad audit
  info:     'info',
  warning:  'warning',
  critical: 'danger',
}

const variantStyles: Record<Variant, string> = {
  success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  danger:  'bg-red-500/15 text-red-400 border-red-500/20',
  info:    'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
  muted:   'bg-slate-500/15 text-slate-400 border-slate-500/20',
  purple:  'bg-violet-500/15 text-violet-400 border-violet-500/20',
}

const labelMap: Record<string, string> = {
  borrador:         'Borrador',
  aprobado:         'Aprobado',
  anulado:          'Anulado',
  reversado:        'Reversado',
  abierto:          'Abierto',
  en_revision:      'En revisión',
  cerrado:          'Cerrado',
  bloqueado_fiscal: 'Bloq. Fiscal',
  info:             'Info',
  warning:          'Advertencia',
  critical:         'Crítico',
  normal:           'Normal',
  reverso:          'Reverso',
  cierre:           'Cierre',
  apertura:         'Apertura',
}

interface Props {
  value: string
  size?: 'sm' | 'md'
  className?: string
}

export function StatusBadge({ value, size = 'md', className }: Props) {
  const variant = variantMap[value] ?? 'muted'
  const label   = labelMap[value] ?? value

  return (
    <span
      className={cn(
        'inline-flex items-center border rounded-full font-medium tracking-wide',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs',
        variantStyles[variant],
        className,
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 shrink-0" />
      {label}
    </span>
  )
}
