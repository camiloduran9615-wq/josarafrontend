import CentroCostoSelect from '@/components/CentroCostoSelect'
import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Loader2, Save } from 'lucide-react'
import { cotizacionService } from '@/services/cotizacion.service'
import { tercerosService, type Tercero } from '@/services/terceros.service'
import { api } from '@/lib/api'
import { getErrorMessage } from '@/lib/errors'
import { getTenantId } from '@/services/auth.service'

interface Props { isOpen: boolean; onClose: () => void; onSuccess: () => void }
interface ItemLine { nombre: string; cantidad: number; precio_unitario: number; porcentaje_descuento: number; porcentaje_iva: number; producto_id: string }

const today = () => new Date().toISOString().split('T')[0]
const inDays = (d: number) => new Date(Date.now() + d * 86400000).toISOString().split('T')[0]

export default function NuevaCotizacionModal({ isOpen, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [terceros, setTerceros] = useState<Tercero[]>([])
  const [productos, setProductos] = useState<any[]>([])
  const [error, setError] = useState('')
  const [items, setItems] = useState<ItemLine[]>([{ nombre: '', cantidad: 1, precio_unitario: 0, porcentaje_descuento: 0, porcentaje_iva: 19, producto_id: '' }])
  const [form, setForm] = useState({ centro_costo_id: '', tercero_id: '', fecha: today(), fecha_validez: inDays(30), condiciones_comerciales: '', observaciones: '' })

  useEffect(() => {
    if (isOpen) {
      tercerosService.getAll().then(r => setTerceros(r.data || []))
      api.get(`/${getTenantId()}/productos`).then(r => setProductos(r.data.data || []))
    }
  }, [isOpen])

  const onSelectProducto = (i: number, id: string) => {
    const p = productos.find(p => p.id === id)
    if (p) { const n = [...items]; n[i] = { ...n[i], producto_id: id, nombre: p.nombre, precio_unitario: parseFloat(p.precio_venta), porcentaje_iva: parseFloat(p.porcentaje_iva) }; setItems(n) }
  }

  const addItem = () => setItems([...items, { nombre: '', cantidad: 1, precio_unitario: 0, porcentaje_descuento: 0, porcentaje_iva: 19, producto_id: '' }])
  const removeItem = (i: number) => items.length > 1 && setItems(items.filter((_, idx) => idx !== i))
  const updateItem = (i: number, f: keyof ItemLine, v: string | number) => { const n = [...items]; n[i] = { ...n[i], [f]: v }; setItems(n) }

  const totals = items.reduce((acc, item) => {
    const sub = item.cantidad * item.precio_unitario
    const desc = sub * (item.porcentaje_descuento / 100)
    const base = sub - desc
    return { bruto: acc.bruto + sub, descuento: acc.descuento + desc, iva: acc.iva + base * (item.porcentaje_iva / 100) }
  }, { bruto: 0, descuento: 0, iva: 0 })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('')
    try {
      await cotizacionService.create({ ...form, items })
      onSuccess(); onClose()
      setForm({ centro_costo_id: '', tercero_id: '', fecha: today(), fecha_validez: inDays(30), condiciones_comerciales: '', observaciones: '' })
      setItems([{ nombre: '', cantidad: 1, precio_unitario: 0, porcentaje_descuento: 0, porcentaje_iva: 19, producto_id: '' }])
    } catch (err) { setError(getErrorMessage(err) || 'Error al crear la cotización') }
    finally { setLoading(false) }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '920px', maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2 className="page-title">Nueva Cotización</h2>
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
            <div className="grid-cols-2" style={{ gap: '12px' }}>
              <div className="input-group">
                <label>Fecha</label>
                <input type="date" className="input" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} required />
              </div>
              <div className="input-group">
                <label>Válida Hasta</label>
                <input type="date" className="input" value={form.fecha_validez} onChange={e => setForm({ ...form, fecha_validez: e.target.value })} required />
              </div>
            </div>
          </div>
          <div className="input-group">
            <label>Condiciones Comerciales</label>
            <input type="text" className="input" placeholder="Ej: Pago a 30 días, entrega inmediata..." value={form.condiciones_comerciales} onChange={e => setForm({ ...form, condiciones_comerciales: e.target.value })} />
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold">Productos / Servicios</h3>
              <button type="button" onClick={addItem} className="btn btn-secondary btn-sm"><Plus size={14} /> Agregar</button>
            </div>
            {items.map((item, i) => (
              <div key={i} className="flex gap-2 items-end mb-3">
                <div className="input-group" style={{ flex: 2 }}>
                  <label className="text-xs">Producto</label>
                  <select className="input" value={item.producto_id} onChange={e => onSelectProducto(i, e.target.value)}>
                    <option value="">Libre...</option>
                    {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div className="input-group" style={{ flex: 2 }}>
                  <label className="text-xs">Nombre</label>
                  <input type="text" className="input" value={item.nombre} onChange={e => updateItem(i, 'nombre', e.target.value)} required />
                </div>
                <div className="input-group" style={{ width: '70px' }}>
                  <label className="text-xs">Cant.</label>
                  <input type="number" className="input" value={item.cantidad} onChange={e => updateItem(i, 'cantidad', parseFloat(e.target.value))} />
                </div>
                <div className="input-group" style={{ width: '110px' }}>
                  <label className="text-xs">Precio</label>
                  <input type="number" className="input" value={item.precio_unitario} onChange={e => updateItem(i, 'precio_unitario', parseFloat(e.target.value))} />
                </div>
                <div className="input-group" style={{ width: '80px' }}>
                  <label className="text-xs">Desc. %</label>
                  <input type="number" className="input" value={item.porcentaje_descuento} min={0} max={100} onChange={e => updateItem(i, 'porcentaje_descuento', parseFloat(e.target.value))} />
                </div>
                <div className="input-group" style={{ width: '80px' }}>
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
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-muted">Subtotal: <strong>${totals.bruto.toLocaleString()}</strong></span>
              {totals.descuento > 0 && <span className="text-warning">Descuento: <strong>-${totals.descuento.toLocaleString()}</strong></span>}
              <span className="text-muted">IVA: <strong>${totals.iva.toLocaleString()}</strong></span>
              <span className="font-bold text-lg">Total: <span className="text-accent">${(totals.bruto - totals.descuento + totals.iva).toLocaleString()}</span></span>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="btn btn-secondary">Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <Loader2 size={18} className="spinner" /> : <><Save size={18} /> Crear Cotización</>}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
