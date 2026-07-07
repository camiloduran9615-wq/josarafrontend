import CentroCostoSelect from '@/components/CentroCostoSelect'
import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Loader2, Save } from 'lucide-react'
import { notaDebitoService } from '@/services/notaDebito.service'
import { tercerosService, type Tercero } from '@/services/terceros.service'
import { facturasService, type Factura } from '@/services/facturas.service'
import { getErrorMessage } from '@/lib/errors'

interface Props { isOpen: boolean; onClose: () => void; onSuccess: () => void }
interface ItemLine { nombre: string; cantidad: number; precio_unitario: number; porcentaje_iva: number }

const CONCEPTOS = [
  { code: '01', label: '01 - Intereses' }, { code: '02', label: '02 - Gastos' },
  { code: '03', label: '03 - Cambio de valor' }, { code: '04', label: '04 - Otros' },
]

export default function NuevaNotaDebitoModal({ isOpen, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [terceros, setTerceros] = useState<Tercero[]>([])
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [error, setError] = useState('')
  const [items, setItems] = useState<ItemLine[]>([{ nombre: '', cantidad: 1, precio_unitario: 0, porcentaje_iva: 19 }])
  const [form, setForm] = useState({
    centro_costo_id: '', tercero_id: '', factura_id: '', fecha: new Date().toISOString().split('T')[0],
    concepto_codigo: '01', descripcion: '',
  })

  useEffect(() => {
    if (isOpen) {
      tercerosService.getAll().then(r => setTerceros(r.data || []))
      facturasService.getAll().then(r => setFacturas((r.data || []).filter((f: Factura) => f.estado === 'validado')))
    }
  }, [isOpen])

  const addItem = () => setItems([...items, { nombre: '', cantidad: 1, precio_unitario: 0, porcentaje_iva: 19 }])
  const removeItem = (i: number) => items.length > 1 && setItems(items.filter((_, idx) => idx !== i))
  const updateItem = (i: number, f: keyof ItemLine, v: string | number) => { const n = [...items]; n[i] = { ...n[i], [f]: v }; setItems(n) }

  const totals = items.reduce((acc, item) => {
    const sub = item.cantidad * item.precio_unitario
    return { bruto: acc.bruto + sub, iva: acc.iva + sub * (item.porcentaje_iva / 100) }
  }, { bruto: 0, iva: 0 })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('')
    try {
      await notaDebitoService.create({ ...form, items })
      onSuccess(); onClose()
      setForm({ centro_costo_id: '', tercero_id: '', factura_id: '', fecha: new Date().toISOString().split('T')[0], concepto_codigo: '01', descripcion: '' })
      setItems([{ nombre: '', cantidad: 1, precio_unitario: 0, porcentaje_iva: 19 }])
    } catch (err) { setError(getErrorMessage(err) || 'Error al crear la nota débito') }
    finally { setLoading(false) }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '780px', maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2 className="page-title">Nueva Nota Débito</h2>
          <button onClick={onClose} className="btn-icon"><X size={20} /></button>
        </div>
        {error && <div className="alert alert-error mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <CentroCostoSelect value={form.centro_costo_id} onChange={v => setForm({ ...form, centro_costo_id: v })} />
          <div className="grid-cols-2">
            <div className="input-group">
              <label>Cliente</label>
              <select className="input" value={form.tercero_id} onChange={e => setForm({ ...form, tercero_id: e.target.value })} required>
                <option value="">Seleccione...</option>
                {terceros.filter(t => t.es_cliente).map(t => <option key={t.id} value={t.id}>{t.razon_social}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label>Factura Relacionada (opcional)</label>
              <select className="input" value={form.factura_id} onChange={e => setForm({ ...form, factura_id: e.target.value })}>
                <option value="">Sin factura relacionada</option>
                {facturas.map(f => <option key={f.id} value={f.id}>{f.numero_completo}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label>Fecha</label>
              <input type="date" className="input" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} required />
            </div>
            <div className="input-group">
              <label>Concepto</label>
              <select className="input" value={form.concepto_codigo} onChange={e => setForm({ ...form, concepto_codigo: e.target.value })}>
                {CONCEPTOS.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div className="input-group">
            <label>Descripción</label>
            <input type="text" className="input" placeholder="Detalle de la nota débito..." value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} required />
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold">Ítems</h3>
              <button type="button" onClick={addItem} className="btn btn-secondary btn-sm"><Plus size={14} /> Agregar</button>
            </div>
            {items.map((item, i) => (
              <div key={i} className="flex gap-3 items-end mb-3">
                <div className="input-group" style={{ flex: 3 }}>
                  <label className="text-xs">Nombre</label>
                  <input type="text" className="input" value={item.nombre} onChange={e => updateItem(i, 'nombre', e.target.value)} required />
                </div>
                <div className="input-group" style={{ width: '80px' }}>
                  <label className="text-xs">Cant.</label>
                  <input type="number" className="input" value={item.cantidad} onChange={e => updateItem(i, 'cantidad', parseFloat(e.target.value))} />
                </div>
                <div className="input-group" style={{ width: '120px' }}>
                  <label className="text-xs">Precio</label>
                  <input type="number" className="input" value={item.precio_unitario} onChange={e => updateItem(i, 'precio_unitario', parseFloat(e.target.value))} />
                </div>
                <div className="input-group" style={{ width: '90px' }}>
                  <label className="text-xs">IVA %</label>
                  <select className="input" value={item.porcentaje_iva} onChange={e => updateItem(i, 'porcentaje_iva', parseFloat(e.target.value))}>
                    <option value={19}>19%</option><option value={5}>5%</option><option value={0}>0%</option>
                  </select>
                </div>
                <button type="button" onClick={() => removeItem(i)} className="btn-icon btn-icon-danger" style={{ marginBottom: '6px' }}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="text-sm">
              <span className="text-muted">Subtotal: <strong>${totals.bruto.toLocaleString()}</strong></span>
              <span className="text-muted ml-4">IVA: <strong>${totals.iva.toLocaleString()}</strong></span>
              <span className="font-bold text-lg ml-4">Total: <span className="text-accent">${(totals.bruto + totals.iva).toLocaleString()}</span></span>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="btn btn-secondary">Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <Loader2 size={18} className="spinner" /> : <><Save size={18} /> Crear Nota Débito</>}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
