import { useState, useEffect, useMemo } from 'react'
import { X, Loader2, Save, Receipt, AlertCircle } from 'lucide-react'
import { reciboCajaService, type FacturaCartera } from '@/services/reciboCaja.service'
import TerceroAutocomplete from '@/components/TerceroAutocomplete'
import CentroCostoSelect from '@/components/CentroCostoSelect'
import { extractApiError } from '@/lib/errors'

interface Props { isOpen: boolean; onClose: () => void; onSuccess: () => void }

const FORMAS_PAGO = [
  { value: 'efectivo',        label: 'Efectivo' },
  { value: 'cheque',          label: 'Cheque' },
  { value: 'transferencia',   label: 'Transferencia bancaria (PSE/ACH)' },
  { value: 'consignacion',    label: 'Consignación bancaria' },
  { value: 'tarjeta_debito',  label: 'Tarjeta débito' },
  { value: 'tarjeta_credito', label: 'Tarjeta crédito' },
  { value: 'otro',            label: 'Otro' },
]

const fmt = (n: number) => n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
const today = () => new Date().toISOString().split('T')[0]

interface AplicacionLinea {
  factura_id:        string
  numero_completo:   string
  saldo:             number
  valor_aplicado:    number
}

export default function NuevoReciboCajaModal({ isOpen, onClose, onSuccess }: Props) {
  const [loading, setLoading]               = useState(false)
  const [loadingCartera, setLoadingCartera] = useState(false)
  const [error, setError]                   = useState('')
  const [facturas, setFacturas]             = useState<FacturaCartera[]>([])
  const [aplicaciones, setAplicaciones]     = useState<Record<string, number>>({})

  const [form, setForm] = useState({
    centro_costo_id: '',
    tercero_id:      '',
    fecha:           today(),
    concepto:        '',
    forma_pago:      'transferencia',
    banco:           '',
    numero_cheque:   '',
    referencia_pago: '',
    observaciones:   '',
  })

  // Reset al abrir/cerrar
  useEffect(() => {
    if (!isOpen) return
    setForm({
      centro_costo_id: '', tercero_id: '', fecha: today(),
      concepto: '', forma_pago: 'transferencia',
      banco: '', numero_cheque: '', referencia_pago: '', observaciones: '',
    })
    setFacturas([])
    setAplicaciones({})
    setError('')
  }, [isOpen])

  // Cargar facturas del cliente cuando lo seleccione
  useEffect(() => {
    if (!form.tercero_id) {
      setFacturas([])
      setAplicaciones({})
      return
    }
    setLoadingCartera(true)
    reciboCajaService.cartera(form.tercero_id)
      .then(r => setFacturas(r.data || []))
      .catch(() => setFacturas([]))
      .finally(() => setLoadingCartera(false))
  }, [form.tercero_id])

  const totalAplicado = useMemo(
    () => Object.values(aplicaciones).reduce((s, v) => s + (Number(v) || 0), 0),
    [aplicaciones],
  )

  const aplicacionesArr: AplicacionLinea[] = useMemo(() => {
    return facturas
      .map(f => ({
        factura_id:      f.id,
        numero_completo: f.numero_completo,
        saldo:           f.saldo,
        valor_aplicado:  aplicaciones[f.id] ?? 0,
      }))
      .filter(a => a.valor_aplicado > 0)
  }, [facturas, aplicaciones])

  const aplicarTotal = (f: FacturaCartera) => {
    setAplicaciones(prev => ({ ...prev, [f.id]: f.saldo }))
  }
  const limpiarLinea = (id: string) => {
    setAplicaciones(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }
  const setMonto = (id: string, valor: number, maxSaldo: number) => {
    const v = Math.max(0, Math.min(valor, maxSaldo))
    setAplicaciones(prev => v > 0 ? { ...prev, [id]: v } : (() => { const n = { ...prev }; delete n[id]; return n })())
  }

  const showBancoFields = ['cheque', 'transferencia', 'consignacion'].includes(form.forma_pago)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (totalAplicado <= 0) {
      setError('Aplica el cobro a al menos una factura (o ingresa un valor manual si es un anticipo).')
      return
    }
    setLoading(true); setError('')
    try {
      await reciboCajaService.create({
        ...form,
        valor_recibido:      totalAplicado,
        facturas_aplicadas:  aplicacionesArr.map(a => ({
          factura_id:     a.factura_id,
          numero:         a.numero_completo,
          valor_aplicado: a.valor_aplicado,
        })),
      })
      onSuccess(); onClose()
    } catch (err) {
      setError(extractApiError(err, 'Error al registrar el recibo.'))
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '880px' }}>
        <div className="modal-header">
          <h2 className="page-title">
            <Receipt size={20} style={{ display: 'inline', marginRight: 8, verticalAlign: '-3px' }} />
            Nuevo Recibo de Caja
          </h2>
          <button onClick={onClose} className="btn-icon"><X size={20} /></button>
        </div>

        {error && (
          <div className="alert alert-error mb-4" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* ── Cliente + fecha + centro costo ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px', gap: 14 }}>
            <div className="input-group">
              <label>Cliente</label>
              <TerceroAutocomplete
                value={form.tercero_id}
                onChange={(id) => setForm({ ...form, tercero_id: id })}
                filtro="clientes"
                placeholder="Busca por NIT o nombre..."
                required
              />
            </div>
            <div className="input-group">
              <label>Fecha</label>
              <input
                type="date"
                className="input"
                value={form.fecha}
                onChange={e => setForm({ ...form, fecha: e.target.value })}
                required
              />
            </div>
          </div>

          <CentroCostoSelect
            value={form.centro_costo_id}
            onChange={v => setForm({ ...form, centro_costo_id: v })}
          />

          {/* ── Facturas pendientes del cliente ── */}
          {form.tercero_id && (
            <div style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '10px 14px',
                background: 'var(--bg-surface)',
                fontWeight: 700,
                fontSize: '0.85rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span>Facturas pendientes</span>
                {loadingCartera && <Loader2 size={14} className="spinner" />}
              </div>

              {!loadingCartera && facturas.length === 0 && (
                <div style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                }}>
                  Este cliente no tiene facturas pendientes de pago.
                </div>
              )}

              {facturas.length > 0 && (
                <table style={{ width: '100%', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-surface)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px', fontWeight: 600 }}>Nº Factura</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600 }}>Fecha</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'right' }}>Total</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'right' }}>Abonado</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'right' }}>Saldo</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'right', width: 130 }}>Aplicar $</th>
                      <th style={{ padding: '8px 10px', width: 50 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {facturas.map(f => {
                      const aplicado = aplicaciones[f.id] ?? 0
                      const esParcial = f.estado_pago === 'parcial'
                      return (
                        <tr key={f.id} style={{ borderTop: '1px solid var(--border)' }}>
                          <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>
                            {f.numero_completo}
                            {esParcial && (
                              <span style={{
                                marginLeft: 6,
                                fontSize: '0.65rem',
                                padding: '1px 6px',
                                background: '#f59e0b22',
                                color: '#f59e0b',
                                borderRadius: 10,
                                fontWeight: 700,
                              }}>parcial</span>
                            )}
                          </td>
                          <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>
                            {f.fecha_emision}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>${fmt(f.valor_total)}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: f.valor_abonado > 0 ? '#f59e0b' : 'var(--text-muted)' }}>
                            ${fmt(f.valor_abonado)}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#34d399' }}>
                            ${fmt(f.saldo)}
                          </td>
                          <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                            <input
                              type="number"
                              className="input"
                              style={{ padding: '4px 6px', fontSize: '0.8rem', textAlign: 'right' }}
                              value={aplicado || ''}
                              placeholder="0"
                              min={0}
                              max={f.saldo}
                              step={100}
                              onChange={e => setMonto(f.id, parseFloat(e.target.value) || 0, f.saldo)}
                            />
                          </td>
                          <td style={{ padding: '6px 6px', textAlign: 'center' }}>
                            {aplicado > 0 ? (
                              <button
                                type="button"
                                onClick={() => limpiarLinea(f.id)}
                                title="Quitar"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.85rem' }}
                              >
                                ✕
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => aplicarTotal(f)}
                                title="Pagar saldo total"
                                style={{
                                  fontSize: '0.7rem', padding: '2px 6px',
                                  background: 'var(--accent)20', color: 'var(--accent)',
                                  border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 700,
                                }}
                              >
                                Total
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                    <tr style={{ background: 'var(--bg-surface)', fontWeight: 700 }}>
                      <td colSpan={5} style={{ padding: '10px', textAlign: 'right' }}>
                        Total a recibir:
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#34d399', fontSize: '0.95rem' }}>
                        ${fmt(totalAplicado)}
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Forma de pago + concepto ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="input-group">
              <label>Forma de pago</label>
              <select
                className="input"
                value={form.forma_pago}
                onChange={e => setForm({ ...form, forma_pago: e.target.value })}
              >
                {FORMAS_PAGO.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label>Concepto</label>
              <input
                type="text"
                className="input"
                placeholder="Pago factura..."
                value={form.concepto}
                onChange={e => setForm({ ...form, concepto: e.target.value })}
                required
              />
            </div>
          </div>

          {showBancoFields && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="input-group">
                <label>Banco</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Bancolombia, Davivienda..."
                  value={form.banco}
                  onChange={e => setForm({ ...form, banco: e.target.value })}
                />
              </div>
              <div className="input-group">
                <label>{form.forma_pago === 'cheque' ? 'Número de cheque' : 'Referencia / Nº comprobante'}</label>
                <input
                  type="text"
                  className="input"
                  value={form.forma_pago === 'cheque' ? form.numero_cheque : form.referencia_pago}
                  onChange={e => setForm({
                    ...form,
                    [form.forma_pago === 'cheque' ? 'numero_cheque' : 'referencia_pago']: e.target.value,
                  })}
                />
              </div>
            </div>
          )}

          <div className="input-group">
            <label>Observaciones</label>
            <input
              type="text"
              className="input"
              placeholder="Notas adicionales (opcional)"
              value={form.observaciones}
              onChange={e => setForm({ ...form, observaciones: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading || totalAplicado <= 0}>
              {loading ? <Loader2 size={18} className="spinner" /> : <><Save size={18} /> Registrar ${fmt(totalAplicado)}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
