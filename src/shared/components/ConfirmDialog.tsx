/**
 * Dialog de confirmación genérico con soporte para input de texto
 * (motivo de anulación, reverso, cierre de periodo).
 *
 * UX: el botón de confirmar se deshabilita mientras la mutación está
 * en curso (isPending) para prevenir dobles envíos.
 */
import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { AlertTriangle, Info } from 'lucide-react'
import { Button, Modal } from '@/components/ui'

interface Props {
  open:      boolean
  onClose:   () => void
  onConfirm: () => void
  title:     string
  children:  ReactNode
  variant?:  'danger' | 'warning' | 'default'
  confirmLabel?: string
  isPending?:    boolean
}

const variantConfig = {
  danger:  { icon: AlertTriangle, iconClass: 'confirm-dialog__icon danger', buttonVariant: 'danger' as const },
  warning: { icon: AlertTriangle, iconClass: 'confirm-dialog__icon warning', buttonVariant: 'warning' as const },
  default: { icon: Info,          iconClass: 'confirm-dialog__icon default', buttonVariant: 'primary' as const },
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, children,
  variant = 'default', confirmLabel = 'Confirmar', isPending = false,
}: Props) {
  const { icon: Icon, iconClass, buttonVariant } = variantConfig[variant]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button variant={buttonVariant} onClick={onConfirm} loading={isPending}>
            {confirmLabel}
          </Button>
        </>
      )}
    >
      <div className="confirm-dialog">
        <div className={cn(iconClass)}>
          <Icon size={18} aria-hidden="true" />
        </div>
        <div>{children}</div>
      </div>
    </Modal>
  )
}
