import CentroCostoSelect from '@/components/CentroCostoSelect'
import CuentaAutocomplete from '@/components/CuentaAutocomplete'
import TerceroAutocomplete from '@/components/TerceroAutocomplete'
import { useState, useEffect } from 'react'
import { X, Loader2, Save, CreditCard, Building, Banknote, ArrowRightLeft } from 'lucide-react'
import {
  comprobanteEgresoService,
  type CreateComprobanteEgresoPayload,
  type FormaPagoEgreso,
} from '@/services/comprobanteEgreso.service'
import { extractApiError } from '@/lib/errors'

interface Props {
  isOpen:    boolean
  onClose:   () => void
  onSuccess: () => void
}

const FORMAS_PAGO: { id: FormaPagoEgreso; label: string; icon: typeof CreditCard }[] = [
  { id: 'transferencia', label: 'Transferencia / ACH', icon: ArrowRightLeft },
  { id: 'consignacion',  label: 'Consignación',        icon: Building },
  { id: 'cheque',        label: 'Cheque',              icon: CreditCard },
  { id: 'efectivo',      label: 'Efectivo',            icon: Banknote },
  { id: 'otro',          label: 'Otro',                icon: CreditCard },
]

const fmt = (n: number) =>
  n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const emptyForm = () => ({
  centro_costo_id:  '',
  tercero_id:       '',
  fecha:            new Date().toISOString().split('T')[0],
  concepto:         '',
  forma_pago:       'transferencia' as FormaPagoEgreso,
  banco:            '',
  numero_cheque:    '',
  referencia_pago:  '',
  cuenta_debito_id: '',   // Cuentas por Pagar (clase 22)
  cuenta_credito_id:'',   // Banco / Caja (clase 11)
  valor_pagado:     0,
  observaciones:    '',
})

export default function NuevoComprobanteEgresoModal({ isOpen, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [form, setForm]       = useState(emptyForm())

  // Reset al abrir
  useEffect(() => {
    if (!isOpen) return
    setForm(emptyForm())
    setError('')
  }, [isOpen])

  const f = (field: keyof ReturnType<typeof emptyForm>, value: any) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const reset = () => { setForm(emptyForm()); setError('') }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.cuenta_debito_id)  return setError('Selecciona la cuenta de Cuentas por Pagar (clase 22).')
    if (!form.cuenta_credito_id) return setError('Selecciona la cuenta bancaria de donde sale el pago.')
    if (form.valor_pagado <= 0)  return setError('El valor a pagar debe ser mayor a cero.')

    setLoading(true)
    try {
      const payload: CreateComprobanteEgresoPayload = {
        centro_costo_id:   form.centro_costo_id || undefined,
        tercero_id:        form.tercero_id,
        fecha:             form.fecha,
        concepto:          form.concepto,
        forma_pago:        form.forma_pago,
        banco:             form.banco || undefined,
        numero_cheque:     form.numero_cheque || undefined,
        referencia_pago:   form.referencia_pago || undefined,
        cuenta_debito_id:  form.cuenta_debito_id,
        cuenta_credito_id: form.cuenta_credito_id,
        valor_pagado:      form.valor_pagado,
        observaciones:     form.observaciones || undefined,
      }
      await comprobanteEgresoService.create(payload)
      onSuccess(); onClose(); reset()
    } catch (err) {
      setError(extractApiError(err, 'Error al registrar el comprobante.'))
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 720, maxHeight: '92vh', overflowY: 'auto' }}>

        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="page-title" style={{ fontSize: '1.15rem' }}>Nuevo Comprobante de Egreso</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Registra un pago realizado a un proveedor
            </p>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={20} /></button>
        </div>

        {/* Diagrama visual del asiento */}
        <div style={{
          margin: '0 0 20px',
          padding: '12px 16px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex', alignItems: 'center', gap: 12,
          fontSize: '0.8rem',
        }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontWeight: 700, color: '#6366f1', marginBottom: 2 }}>DÉBITO</div>
            <div style={{ color: 'var(--text-muted)' }}>Cuentas por Pagar</div>
            <div style={{ fontSize: '0.72rem', opacity: 0.7 }}>Cancela la deuda (clase 22)</div>
          </div>
          <div style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>→</div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontWeight: 700, color: '#10b981', marginBottom: 2 }}>CRÉDITO</div>
            <div style={{ color: 'var(--text-muted)' }}>Banco / Caja</div>
            <div style={{ fontSize: '0.72rem', opacity: 0.7 }}>Sale el dinero (clase 11)</div>
          </div>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          <CentroCostoSelect value={form.centro_costo_id} onChange={v => f('centro_costo_id', v)} />

          {/* Proveedor + Fecha */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
            <div className="input-group">
              <label>Proveedor *</label>
              <TerceroAutocomplete
                value={form.tercero_id}
                onChange={id => f('tercero_id', id)}
                filtro="proveedores"
                placeholder="Busca por NIT o razón social..."
                required
              />
            </div>
            <div className="input-group">
              <label>Fecha *</label>
              <input type="date" className="input" value={form.fecha}
                onChange={e => f('fecha', e.target.value)} required />
            </div>
          </div>

          {/* Concepto */}
          <div className="input-group" style={{ margin: 0 }}>
            <label>Concepto *</label>
            <input type="text" className="input"
              placeholder="Ej: Pago factura de compra FCI-000023 — Materias Primas"
              value={form.concepto}
              onChange={e => f('concepto', e.target.value)} required />
          </div>

          {/* Forma de Pago */}
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 8 }}>
              Forma de Pago *
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {FORMAS_PAGO.map(fp => {
                const Icon = fp.icon
                const active = form.forma_pago === fp.id
                return (
                  <button
                    key={fp.id}
                    type="button"
                    onClick={() => f('forma_pago', fp.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 14px', borderRadius: 'var(--radius-md)',
                      border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                      background: active ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'var(--bg-surface)',
                      color: active ? 'var(--accent)' : 'var(--text-muted)',
                      fontWeight: active ? 700 : 400,
                      fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <Icon size={14} />
                    {fp.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Datos bancarios según forma de pago */}
          {(form.forma_pago === 'transferencia' || form.forma_pago === 'consignacion' || form.forma_pago === 'cheque') && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="input-group" style={{ margin: 0 }}>
                <label>Banco</label>
                <input type="text" className="input" placeholder="Ej: Bancolombia, Davivienda..."
                  value={form.banco} onChange={e => f('banco', e.target.value)} />
              </div>
              {form.forma_pago === 'cheque' ? (
                <div className="input-group" style={{ margin: 0 }}>
                  <label>Número de Cheque</label>
                  <input type="text" className="input" placeholder="00000001"
                    value={form.numero_cheque} onChange={e => f('numero_cheque', e.target.value)} />
                </div>
              ) : (
                <div className="input-group" style={{ margin: 0 }}>
                  <label>Referencia / Comprobante</label>
                  <input type="text" className="input" placeholder="Ej: TRF-20260511-001"
                    value={form.referencia_pago} onChange={e => f('referencia_pago', e.target.value)} />
                </div>
              )}
            </div>
          )}

          {/* Cuentas contables */}
          <div>
            <h3 style={{
              fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 10,
            }}>
              Cuentas Contables
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="input-group" style={{ margin: 0 }}>
                <label style={{ color: '#6366f1' }}>↑ DÉBITO — Cuentas por Pagar *</label>
                <CuentaAutocomplete
                  value={form.cuenta_debito_id}
                  onChange={id => f('cuenta_debito_id', id)}
                  prefixFilter={['22', '23']}
                  placeholder="Busca cuenta CxP (clase 22)..."
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Cancela la obligación con el proveedor
                </span>
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label style={{ color: '#10b981' }}>↓ CRÉDITO — Banco / Caja *</label>
                <CuentaAutocomplete
                  value={form.cuenta_credito_id}
                  onChange={id => f('cuenta_credito_id', id)}
                  prefixFilter={['11', '12']}
                  placeholder="Busca banco/caja (clase 11)..."
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  De donde sale el dinero efectivamente
                </span>
              </div>
            </div>
          </div>

          {/* Valor */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="input-group" style={{ margin: 0 }}>
              <label>Valor Pagado $ *</label>
              <input
                type="number" className="input" min={0.01} step={0.01}
                placeholder="0"
                value={form.valor_pagado || ''}
                onChange={e => f('valor_pagado', parseFloat(e.target.value) || 0)}
                required
              />
            </div>
            <div className="input-group" style={{ margin: 0 }}>
              <label>Observaciones</label>
              <input type="text" className="input"
                placeholder="Notas adicionales..."
                value={form.observaciones}
                onChange={e => f('observaciones', e.target.value)} />
            </div>
          </div>

          {/* Total visual */}
          {form.valor_pagado > 0 && (
            <div style={{
              padding: '14px 18px',
              background: 'color-mix(in srgb, var(--accent) 6%, transparent)',
              border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Total a registrar como pago
              </div>
              <div style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--accent)' }}>
                ${fmt(form.valor_pagado)}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{
            display: 'flex', justifyContent: 'flex-end', gap: 10,
            paddingTop: 16, borderTop: '1px solid var(--border)',
          }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {loading ? 'Registrando...' : 'Registrar Egreso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
