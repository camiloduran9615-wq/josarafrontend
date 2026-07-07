/**
 * Página de Periodos Contables.
 *
 * UX decisions:
 * - Cards por periodo (no tabla) — el número de periodos es pequeño (<24/año)
 *   y las cards permiten mostrar el estado con colores prominentes + CTA directo.
 * - Flujo Dual Approval en dos pasos visuales: primero "Solicitar reapertura"
 *   (aparece badge con countdown TTL 30min), luego "Aprobar" visible para
 *   otro usuario contador.
 * - El checklist de cierre se muestra en un panel expandible antes de cerrar.
 * - Bloqueo fiscal: requiere confirmación triple con texto "BLOQUEAR".
 */
import { useState } from 'react'
import {
  Lock, Unlock, CheckCircle, XCircle, AlertTriangle,
  ChevronDown, ChevronRight, Shield, Clock,
} from 'lucide-react'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  usePeriodos,
  useChecklistCierre,
  useCerrarPeriodo,
  useSolicitarReapertura,
  useAprobarReapertura,
  useBloquearFiscal,
} from '../hooks/usePeriodos'
import { useIsContador } from '@/shared/stores/auth.store'
import type { PeriodoContable } from '../api/periodos.types'
import { formatDate, cn } from '@/lib/utils'

// ── Schema de cierre ─────────────────────────────────────────────────
const cierreSchema = z.object({
  confirmar: z.literal(true, { error: 'Debes confirmar el cierre.' }),
  motivo:    z.string().max(500).optional(),
})

const reaperturaSchema = z.object({
  motivo: z.string().min(20, 'Mín. 20 caracteres.').max(500),
})

type CierreForm     = z.infer<typeof cierreSchema>
type ReaperturaForm = z.infer<typeof reaperturaSchema>

// ── Checklist panel ──────────────────────────────────────────────────
function ChecklistPanel({ periodoId }: { periodoId: string }) {
  const { data, isLoading } = useChecklistCierre(periodoId)

  if (isLoading) {
    return <div className="text-xs text-[var(--text-muted)] py-3 text-center">Cargando checklist…</div>
  }
  if (!data) return null

  const iconForStatus = (ok: boolean | null) => {
    if (ok === true)  return <CheckCircle size={14} className="text-emerald-400 shrink-0" />
    if (ok === false) return <XCircle     size={14} className="text-red-400 shrink-0" />
    return <Clock size={14} className="text-amber-400 shrink-0" />
  }

  return (
    <div className="space-y-2 mt-3">
      {data.checklist.map((item) => (
        <div
          key={item.id}
          className={cn(
            'flex items-start gap-2.5 p-2.5 rounded-lg border text-xs',
            item.ok === true  ? 'border-emerald-500/20 bg-emerald-500/5' :
            item.ok === false ? 'border-red-500/20 bg-red-500/5' :
                                'border-amber-500/20 bg-amber-500/5',
          )}
        >
          {iconForStatus(item.ok)}
          <div className="flex-1">
            <p className="font-medium text-[var(--text-primary)]">
              {item.id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </p>
            <p className="text-[var(--text-muted)] mt-0.5">{item.detalle}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Tarjeta de periodo ───────────────────────────────────────────────
function PeriodoCard({ periodo }: { periodo: PeriodoContable }) {
  const isContador    = useIsContador()
  // useAuthStore accessible if needed for user-specific logic

  const [showChecklist,    setShowChecklist]    = useState(false)
  const [showCierreDialog, setShowCierreDialog] = useState(false)
  const [showReaDialog,    setShowReaDialog]    = useState(false)
  const [showBloquearDlg,  setShowBloquearDlg]  = useState(false)
  const [bloquearText,     setBloquearText]     = useState('')

  const cerrar         = useCerrarPeriodo()
  const solicitarRea   = useSolicitarReapertura()
  const aprobarRea     = useAprobarReapertura()
  const bloquear       = useBloquearFiscal()

  const cierreForm = useForm<CierreForm>({
    resolver: zodResolver(cierreSchema),
    defaultValues: { confirmar: undefined as unknown as true },
  })

  const reaForm = useForm<ReaperturaForm>({ resolver: zodResolver(reaperturaSchema) })

  const isAbierto         = periodo.estado === 'abierto'
  const isCerrado         = periodo.estado === 'cerrado'
  const isBloqueado       = periodo.estado === 'bloqueado_fiscal'

  return (
    <div className={cn(
      'card transition-all',
      isBloqueado && 'border-red-500/30 bg-red-500/5',
      isAbierto   && 'border-emerald-500/20',
    )}>
      {/* Header del card */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-[var(--text-primary)]">{periodo.codigo}</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {formatDate(periodo.fecha_inicio)} — {formatDate(periodo.fecha_fin)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge value={periodo.estado} />
          {isBloqueado && <Shield size={16} className="text-red-400" />}
        </div>
      </div>

      {/* Info de cierre */}
      {periodo.cerrado_at && (
        <p className="text-xs text-[var(--text-muted)] mb-3">
          Cerrado: {formatDate(periodo.cerrado_at)}
          {periodo.motivo_cierre && ` — ${periodo.motivo_cierre}`}
        </p>
      )}

      {/* Acciones */}
      {isContador && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-[var(--border)]">

          {/* Cerrar periodo */}
          {isAbierto && (
            <>
              <button
                onClick={() => setShowChecklist((s) => !s)}
                className="btn btn-secondary btn-sm"
              >
                {showChecklist ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                Checklist
              </button>
              <button
                onClick={() => setShowCierreDialog(true)}
                className="btn btn-sm"
                style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent-light)', border: '1px solid rgba(99,102,241,0.3)' }}
              >
                <Lock size={13} /> Cerrar periodo
              </button>
            </>
          )}

          {/* Solicitar reapertura */}
          {isCerrado && (
            <button
              onClick={() => setShowReaDialog(true)}
              className="btn btn-secondary btn-sm"
            >
              <Unlock size={13} /> Solicitar reapertura
            </button>
          )}

          {/* Aprobar reapertura (otro usuario — misma UI simplificada) */}
          {isCerrado && (
            <button
              onClick={() => aprobarRea.mutate(periodo.id)}
              disabled={aprobarRea.isPending}
              className="btn btn-sm"
              style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.3)' }}
              title="Aprobar la solicitud de reapertura (requiere ser un usuario distinto al solicitante)"
            >
              <CheckCircle size={13} /> Aprobar reapertura
            </button>
          )}

          {/* Bloqueo fiscal — solo en cerrado, acción irreversible */}
          {isCerrado && (
            <button
              onClick={() => setShowBloquearDlg(true)}
              className="btn btn-danger btn-sm"
            >
              <Shield size={13} /> Bloqueo fiscal
            </button>
          )}
        </div>
      )}

      {/* Checklist expandible */}
      {showChecklist && <ChecklistPanel periodoId={periodo.id} />}

      {/* ── Dialog: Cerrar periodo ── */}
      <ConfirmDialog
        open={showCierreDialog}
        onClose={() => { setShowCierreDialog(false); cierreForm.reset() }}
        onConfirm={cierreForm.handleSubmit((data) => {
          cerrar.mutate(
            { id: periodo.id, data: { confirmar: data.confirmar as true, motivo: data.motivo } },
            { onSuccess: () => setShowCierreDialog(false) },
          )
        })}
        title={`Cerrar periodo ${periodo.codigo}`}
        variant="warning"
        confirmLabel="Cerrar periodo"
        isPending={cerrar.isPending}
      >
        <p className="text-sm text-[var(--text-secondary)]">
          El periodo quedará en estado <strong>cerrado</strong>. No se podrán crear ni aprobar
          asientos en este periodo. Solo se podrá reabrir con aprobación dual.
        </p>
        <div className="flex items-center gap-2 mt-3">
          <input
            id="confirmar-cierre"
            type="checkbox"
            {...cierreForm.register('confirmar')}
            className="w-4 h-4 accent-indigo-500"
          />
          <label htmlFor="confirmar-cierre" className="text-sm text-[var(--text-primary)] cursor-pointer">
            Confirmo que deseo cerrar este periodo contable.
          </label>
        </div>
        {cierreForm.formState.errors.confirmar && (
          <p className="text-xs text-red-400 mt-1">{cierreForm.formState.errors.confirmar.message}</p>
        )}
      </ConfirmDialog>

      {/* ── Dialog: Solicitar reapertura ── */}
      <ConfirmDialog
        open={showReaDialog}
        onClose={() => { setShowReaDialog(false); reaForm.reset() }}
        onConfirm={reaForm.handleSubmit((data) => {
          solicitarRea.mutate(
            { id: periodo.id, data },
            { onSuccess: () => setShowReaDialog(false) },
          )
        })}
        title={`Solicitar reapertura — ${periodo.codigo}`}
        variant="default"
        confirmLabel="Enviar solicitud"
        isPending={solicitarRea.isPending}
      >
        <p className="text-sm text-[var(--text-secondary)]">
          La solicitud de reapertura expira en <strong>30 minutos</strong> y debe ser aprobada
          por un contador distinto. Ingresa el motivo:
        </p>
        <textarea
          {...reaForm.register('motivo')}
          rows={3}
          placeholder="Ej: Se detectó un error en la distribución de costos del periodo, aprobado por Gerencia."
          className={cn(
            'w-full bg-[var(--bg-surface)] border rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] resize-none outline-none',
            reaForm.formState.errors.motivo ? 'border-red-500' : 'border-[var(--border)] focus:border-indigo-500',
          )}
        />
        {reaForm.formState.errors.motivo && (
          <p className="text-xs text-red-400">{reaForm.formState.errors.motivo.message}</p>
        )}
      </ConfirmDialog>

      {/* ── Dialog: Bloqueo fiscal ── */}
      <ConfirmDialog
        open={showBloquearDlg}
        onClose={() => { setShowBloquearDlg(false); setBloquearText('') }}
        onConfirm={() => {
          if (bloquearText !== 'BLOQUEAR') return
          bloquear.mutate(periodo.id, { onSuccess: () => setShowBloquearDlg(false) })
        }}
        title={`⚠️ Bloqueo fiscal — ${periodo.codigo}`}
        variant="danger"
        confirmLabel="Bloquear definitivamente"
        isPending={bloquear.isPending}
      >
        <div className="space-y-3">
          <div className="alert alert-error">
            <AlertTriangle size={16} />
            <span className="text-xs">
              <strong>Acción irreversible.</strong> El periodo quedará bloqueado fiscalmente y
              no podrá reabrirse bajo ninguna circunstancia. Solo para cierres de ejercicio fiscal definitivos.
            </span>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Para confirmar, escribe <strong className="text-red-400">BLOQUEAR</strong> en el campo:
          </p>
          <input
            type="text"
            value={bloquearText}
            onChange={(e) => setBloquearText(e.target.value)}
            placeholder="BLOQUEAR"
            className={cn('input', bloquearText !== 'BLOQUEAR' && bloquearText.length > 0 && 'error')}
          />
        </div>
      </ConfirmDialog>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────────
export function PeriodosPage() {
  const { data, isLoading } = usePeriodos()
  const periodos = data?.data ?? []

  return (
    <div className="main-content fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Periodos Contables</h1>
          <p className="page-subtitle">Gestión del ciclo contable mensual y anual</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid-cols-2 mt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card" style={{ height: 120 }}>
              <div className="skeleton" style={{ height: '100%', borderRadius: 8, background: 'var(--bg-hover)' }} />
            </div>
          ))}
        </div>
      ) : periodos.length === 0 ? (
        <div className="card text-center py-12 mt-4">
          <p className="text-[var(--text-muted)]">No hay periodos contables creados aún.</p>
        </div>
      ) : (
        <div className="grid-cols-2 mt-4">
          {periodos.map((p) => <PeriodoCard key={p.id} periodo={p} />)}
        </div>
      )}
    </div>
  )
}
