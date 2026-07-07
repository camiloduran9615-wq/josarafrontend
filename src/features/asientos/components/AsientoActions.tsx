/**
 * Diálogos de acción sobre un Asiento: Aprobar, Anular, Reversar.
 *
 * UX decisions:
 * - Aprobar: confirmación simple (no requiere texto, pero muestra advertencia
 *   de segregación: "Esta acción es irreversible").
 * - Anular: campo motivo obligatorio min 20 chars — el botón confirmar se
 *   habilita solo cuando se cumple el requisito (UX inline, sin esperar submit).
 * - Reversar: motivo + fecha del reverso en periodo abierto.
 */
import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle, XCircle, RotateCcw } from 'lucide-react'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/shared/stores/auth.store'
import type { Asiento } from '../api/asientos.types'
import {
  useApproveAsiento,
  useVoidAsiento,
  useReverseAsiento,
} from '../hooks/useAsientos'

// ── Schemas Zod (mismo contrato que el backend) ───────────────────────
const voidSchema = z.object({
  motivo: z.string().min(20, 'El motivo debe tener al menos 20 caracteres.').max(1000),
})

const reverseSchema = z.object({
  motivo:        z.string().min(20, 'El motivo debe tener al menos 20 caracteres.').max(1000),
  fecha_reverso: z.string().min(1, 'Selecciona la fecha del reverso.'),
})

type VoidForm    = z.infer<typeof voidSchema>
type ReverseForm = z.infer<typeof reverseSchema>

// ─────────────────────────────────────────────────────────────────────
// Botón Aprobar
// ─────────────────────────────────────────────────────────────────────
export function ApproveButton({ asiento, userId }: { asiento: Asiento; userId: string }) {
  const [open, setOpen] = useState(false)
  const { mutate, isPending } = useApproveAsiento()

  // Guard contra doble-click intra-tick: `isPending` se actualiza en el siguiente render,
  // así que dos clicks muy seguidos pueden disparar dos `mutate` antes de que el botón se
  // deshabilite. Esta ref bloquea sincrónicamente la segunda invocación.
  const inFlight = useRef(false)
  const handleConfirm = () => {
    if (inFlight.current) return
    inFlight.current = true
    mutate(asiento.id, {
      onSuccess: () => setOpen(false),
      onSettled: () => { inFlight.current = false },
    })
  }

  // Segregación de funciones (NIA 315 / COSO):
  // - auxiliar y contador NO pueden aprobar lo que ellos mismos digitaron.
  // - admin SÍ puede (override para modo PYME / un solo usuario).
  const role = useAuthStore((s) => s.user?.role)
  const isCreator = asiento.created_by_id === userId || asiento.last_modified_by_id === userId
  const segregacionBloquea = isCreator && role !== 'admin'

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={segregacionBloquea}
        title={segregacionBloquea
          ? 'Segregación de funciones: pide a otro usuario (contador) que apruebe tu asiento.'
          : isCreator
            ? 'Apruebas tu propio asiento (override admin — usar con criterio).'
            : 'Aprobar asiento'}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
          segregacionBloquea
            ? 'opacity-40 cursor-not-allowed bg-[var(--bg-surface)] text-[var(--text-muted)]'
            : 'bg-emerald-600 hover:bg-emerald-700 text-white',
        )}
      >
        <CheckCircle size={14} />
        Aprobar
      </button>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        title="Aprobar asiento"
        variant="default"
        confirmLabel="Sí, aprobar"
        isPending={isPending}
      >
        <p className="text-sm text-[var(--text-secondary)]">
          Esta acción asignará un número consecutivo permanente al asiento{' '}
          <span className="font-semibold text-[var(--text-primary)]">
            {asiento.descripcion}
          </span>{' '}
          y lo marcará como <strong>aprobado</strong>.
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-2">
          ⚠️ Esta operación es irreversible. Para corregir un error, usa <em>Anular</em> o <em>Reversar</em>.
        </p>
      </ConfirmDialog>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Botón Anular
// ─────────────────────────────────────────────────────────────────────
export function VoidButton({ asiento }: { asiento: Asiento }) {
  const [open, setOpen] = useState(false)
  const { mutate, isPending } = useVoidAsiento()
  const { register, handleSubmit, watch, formState: { errors } } = useForm<VoidForm>({
    resolver: zodResolver(voidSchema),
  })

  const motivo = watch('motivo', '')

  const onSubmit = (data: VoidForm) => {
    mutate({ id: asiento.id, data }, { onSuccess: () => setOpen(false) })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
      >
        <XCircle size={14} />
        Anular
      </button>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleSubmit(onSubmit)}
        title={`Anular ${asiento.numero ?? 'asiento'}`}
        variant="danger"
        confirmLabel="Anular definitivamente"
        isPending={isPending}
      >
        <p className="text-sm text-[var(--text-secondary)]">
          Ingresa el motivo de anulación (mínimo 20 caracteres). Quedará registrado en la auditoría.
        </p>
        <div>
          <textarea
            {...register('motivo')}
            rows={3}
            placeholder="Ej: Factura duplicada. La factura 001-0042 ya fue registrada el 2026-05-01."
            className={cn(
              'w-full bg-[var(--bg-surface)] border rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] resize-none outline-none transition-colors placeholder:text-[var(--text-muted)]',
              errors.motivo
                ? 'border-red-500 focus:ring-1 focus:ring-red-500'
                : 'border-[var(--border)] focus:border-indigo-500',
            )}
          />
          <div className="flex justify-between mt-1">
            {errors.motivo && <p className="text-xs text-red-400">{errors.motivo.message}</p>}
            <p className={cn('text-xs ml-auto', motivo.length >= 20 ? 'text-emerald-400' : 'text-[var(--text-muted)]')}>
              {motivo.length}/20 mín.
            </p>
          </div>
        </div>
      </ConfirmDialog>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Botón Reversar
// ─────────────────────────────────────────────────────────────────────
export function ReverseButton({ asiento }: { asiento: Asiento }) {
  const [open, setOpen] = useState(false)
  const { mutate, isPending } = useReverseAsiento()
  const { register, handleSubmit, formState: { errors } } = useForm<ReverseForm>({
    resolver: zodResolver(reverseSchema),
    defaultValues: { fecha_reverso: new Date().toISOString().slice(0, 10) },
  })

  const onSubmit = (data: ReverseForm) => {
    mutate({ id: asiento.id, data }, { onSuccess: () => setOpen(false) })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
      >
        <RotateCcw size={14} />
        Reversar
      </button>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleSubmit(onSubmit)}
        title={`Reversar ${asiento.numero ?? 'asiento'}`}
        variant="warning"
        confirmLabel="Crear reverso"
        isPending={isPending}
      >
        <p className="text-sm text-[var(--text-secondary)]">
          Se creará un asiento espejo con débitos y créditos invertidos en el periodo seleccionado.
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Fecha del reverso *
            </label>
            <input
              type="date"
              {...register('fecha_reverso')}
              className={cn(
                'w-full bg-[var(--bg-surface)] border rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors',
                errors.fecha_reverso ? 'border-red-500' : 'border-[var(--border)] focus:border-amber-500',
              )}
            />
            {errors.fecha_reverso && <p className="text-xs text-red-400 mt-1">{errors.fecha_reverso.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Motivo * (mín. 20 chars)
            </label>
            <textarea
              {...register('motivo')}
              rows={2}
              placeholder="Ej: Corrección de período. El asiento fue contabilizado en el período incorrecto."
              className={cn(
                'w-full bg-[var(--bg-surface)] border rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] resize-none outline-none transition-colors placeholder:text-[var(--text-muted)]',
                errors.motivo ? 'border-red-500' : 'border-[var(--border)] focus:border-amber-500',
              )}
            />
            {errors.motivo && <p className="text-xs text-red-400 mt-1">{errors.motivo.message}</p>}
          </div>
        </div>
      </ConfirmDialog>
    </>
  )
}
