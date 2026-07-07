import CentroCostoSelect from '@/components/CentroCostoSelect'
import { useState, useEffect } from 'react'
import { X, Loader2, Save } from 'lucide-react'
import { ajusteCarteraService } from '@/services/ajusteCartera.service'
import { tercerosService, type Tercero } from '@/services/terceros.service'
import { facturasService, type Factura } from '@/services/facturas.service'
import { api } from '@/lib/api'
import { getErrorMessage } from '@/lib/errors'
import { getTenantId } from '@/services/auth.service'

interface Props { isOpen: boolean; onClose: () => void; onSuccess: () => void }
interface CuentaOption { id: string; codigo: string; nombre: string }

const TIPOS = [
  { value: 'abono_parcial', label: 'Abono Parcial' },
  { value: 'descuento_pronto_pago', label: 'Descuento por Pronto Pago' },
  { value: 'castigo_cartera', label: 'Castigo de Cartera' },
  { value: 'provision_cartera', label: 'Provisión de Cartera' },
  { value: 'recuperacion_cartera', label: 'Recuperación de Cartera' },
  { value: 'diferencia_cambio', label: 'Diferencia en Cambio' },
  { value: 'otro', label: 'Otro' },
]

export default function NuevoAjusteCarteraModal({ isOpen, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [terceros, setTerceros] = useState<Tercero[]>([])
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [cuentas, setCuentas] = useState<CuentaOption[]>([])
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    centro_costo_id: '', tercero_id: '', factura_id: '', fecha: new Date().toISOString().split('T')[0],
    tipo: 'abono_parcial', concepto: '', valor: '', cuenta_debito_id: '', cuenta_credito_id: '', observaciones: '',
  })

  useEffect(() => {
    if (isOpen) {
      tercerosService.getAll().then(r => setTerceros(r.data || []))
      facturasService.getAll().then(r => setFacturas((r.data || []).filter((f: Factura) => f.estado === 'validado')))
      api.get(`/${getTenantId()}/cuentas-contables`).then(r => setCuentas(r.data.data || []))
    }
  }, [isOpen])

  const facturasCliente = facturas.filter(f => !form.tercero_id || (f as any).tercero_id === form.tercero_id)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('')
    try {
      await ajusteCarteraService.create(form)
      onSuccess(); onClose()
      setForm({ centro_costo_id: '', tercero_id: '', factura_id: '', fecha: new Date().toISOString().split('T')[0], tipo: 'abono_parcial', concepto: '', valor: '', cuenta_debito_id: '', cuenta_credito_id: '', observaciones: '' })
    } catch (err) { setError(getErrorMessage(err) || 'Error al registrar el ajuste') }
    finally { setLoading(false) }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '680px' }}>
        <div className="modal-header">
          <h2 className="page-title">Nuevo Ajuste de Cartera</h2>
          <button onClick={onClose} className="btn-icon"><X size={20} /></button>
        </div>
        {error && <div className="alert alert-error mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <CentroCostoSelect value={form.centro_costo_id} onChange={v => setForm({ ...form, centro_costo_id: v })} />
          <div className="grid-cols-2">
            <div className="input-group">
              <label>Tercero</label>
              <select className="input" value={form.tercero_id} onChange={e => setForm({ ...form, tercero_id: e.target.value, factura_id: '' })} required>
                <option value="">Seleccione...</option>
                {terceros.map(t => <option key={t.id} value={t.id}>{t.razon_social}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label>Factura Relacionada (opcional)</label>
              <select className="input" value={form.factura_id} onChange={e => setForm({ ...form, factura_id: e.target.value })}>
                <option value="">Sin factura relacionada</option>
                {facturasCliente.map(f => <option key={f.id} value={f.id}>{f.numero_completo} — ${Number(f.valor_total).toLocaleString()}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label>Fecha</label>
              <input type="date" className="input" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} required />
            </div>
            <div className="input-group">
              <label>Tipo de Ajuste</label>
              <select className="input" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label>Cuenta Débito</label>
              <select className="input" value={form.cuenta_debito_id} onChange={e => setForm({ ...form, cuenta_debito_id: e.target.value })}>
                <option value="">Seleccione cuenta...</option>
                {cuentas.map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label>Cuenta Crédito</label>
              <select className="input" value={form.cuenta_credito_id} onChange={e => setForm({ ...form, cuenta_credito_id: e.target.value })}>
                <option value="">Seleccione cuenta...</option>
                {cuentas.map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}
              </select>
            </div>
          </div>
          <div className="input-group">
            <label>Valor del Ajuste ($)</label>
            <input type="number" className="input" placeholder="0.00" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} min="0.01" step="0.01" required />
          </div>
          <div className="input-group">
            <label>Concepto</label>
            <input type="text" className="input" placeholder="Descripción del ajuste..." value={form.concepto} onChange={e => setForm({ ...form, concepto: e.target.value })} required />
          </div>
          <div className="input-group">
            <label>Observaciones</label>
            <input type="text" className="input" placeholder="Notas adicionales..." value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Loader2 size={18} className="spinner" /> : <><Save size={18} /> Registrar Ajuste</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
