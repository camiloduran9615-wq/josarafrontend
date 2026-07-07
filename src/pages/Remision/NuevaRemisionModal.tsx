import CentroCostoSelect from '@/components/CentroCostoSelect'
import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Loader2, Save } from 'lucide-react'
import { remisionService } from '@/services/remision.service'
import { tercerosService, type Tercero } from '@/services/terceros.service'
import { api } from '@/lib/api'
import { getErrorMessage } from '@/lib/errors'
import { getTenantId } from '@/services/auth.service'

interface Props { isOpen: boolean; onClose: () => void; onSuccess: () => void }
interface ItemLine { nombre: string; cantidad: number; precio_unitario: number; unidad_medida: string; producto_id: string }

export default function NuevaRemisionModal({ isOpen, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [terceros, setTerceros] = useState<Tercero[]>([])
  const [productos, setProductos] = useState<any[]>([])
  const [error, setError] = useState('')
  const [items, setItems] = useState<ItemLine[]>([{ nombre: '', cantidad: 1, precio_unitario: 0, unidad_medida: 'Unidad', producto_id: '' }])
  const [form, setForm] = useState({
    centro_costo_id: '', tercero_id: '', fecha: new Date().toISOString().split('T')[0],
    fecha_entrega: '', direccion_entrega: '', transportista: '', numero_guia: '', observaciones: '',
  })

  useEffect(() => {
    if (isOpen) {
      tercerosService.getAll().then(r => setTerceros(r.data || []))
      api.get(`/${getTenantId()}/productos`).then(r => setProductos(r.data.data || []))
    }
  }, [isOpen])

  const onSelectProducto = (i: number, id: string) => {
    const p = productos.find(p => p.id === id)
    if (p) { const n = [...items]; n[i] = { ...n[i], producto_id: id, nombre: p.nombre, precio_unitario: parseFloat(p.precio_venta) }; setItems(n) }
  }

  const addItem = () => setItems([...items, { nombre: '', cantidad: 1, precio_unitario: 0, unidad_medida: 'Unidad', producto_id: '' }])
  const removeItem = (i: number) => items.length > 1 && setItems(items.filter((_, idx) => idx !== i))
  const updateItem = (i: number, f: keyof ItemLine, v: string | number) => { const n = [...items]; n[i] = { ...n[i], [f]: v }; setItems(n) }

  const total = items.reduce((acc, item) => acc + item.cantidad * item.precio_unitario, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('')
    try {
      await remisionService.create({ ...form, items })
      onSuccess(); onClose()
      setForm({ centro_costo_id: '', tercero_id: '', fecha: new Date().toISOString().split('T')[0], fecha_entrega: '', direccion_entrega: '', transportista: '', numero_guia: '', observaciones: '' })
      setItems([{ nombre: '', cantidad: 1, precio_unitario: 0, unidad_medida: 'Unidad', producto_id: '' }])
    } catch (err) { setError(getErrorMessage(err) || 'Error al crear la remisión') }
    finally { setLoading(false) }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '860px', maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2 className="page-title">Nueva Remisión</h2>
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
              <label>Fecha</label>
              <input type="date" className="input" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} required />
            </div>
            <div className="input-group">
              <label>Fecha de Entrega</label>
              <input type="date" className="input" value={form.fecha_entrega} onChange={e => setForm({ ...form, fecha_entrega: e.target.value })} />
            </div>
            <div className="input-group">
              <label>Dirección de Entrega</label>
              <input type="text" className="input" placeholder="Dirección donde se entrega..." value={form.direccion_entrega} onChange={e => setForm({ ...form, direccion_entrega: e.target.value })} />
            </div>
            <div className="input-group">
              <label>Transportista</label>
              <input type="text" className="input" placeholder="Nombre del transportista" value={form.transportista} onChange={e => setForm({ ...form, transportista: e.target.value })} />
            </div>
            <div className="input-group">
              <label>Número de Guía</label>
              <input type="text" className="input" placeholder="Ej: 1234567890" value={form.numero_guia} onChange={e => setForm({ ...form, numero_guia: e.target.value })} />
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold">Productos / Mercancía</h3>
              <button type="button" onClick={addItem} className="btn btn-secondary btn-sm"><Plus size={14} /> Agregar</button>
            </div>
            {items.map((item, i) => (
              <div key={i} className="flex gap-3 items-end mb-3">
                <div className="input-group" style={{ flex: 2 }}>
                  <label className="text-xs">Producto</label>
                  <select className="input" value={item.producto_id} onChange={e => onSelectProducto(i, e.target.value)}>
                    <option value="">Producto libre...</option>
                    {productos.map(p => <option key={p.id} value={p.id}>{p.nombre} (Stock: {p.stock_actual})</option>)}
                  </select>
                </div>
                <div className="input-group" style={{ flex: 2 }}>
                  <label className="text-xs">Nombre</label>
                  <input type="text" className="input" value={item.nombre} onChange={e => updateItem(i, 'nombre', e.target.value)} required />
                </div>
                <div className="input-group" style={{ width: '80px' }}>
                  <label className="text-xs">Cant.</label>
                  <input type="number" className="input" value={item.cantidad} onChange={e => updateItem(i, 'cantidad', parseFloat(e.target.value))} />
                </div>
                <div className="input-group" style={{ width: '110px' }}>
                  <label className="text-xs">Precio</label>
                  <input type="number" className="input" value={item.precio_unitario} onChange={e => updateItem(i, 'precio_unitario', parseFloat(e.target.value))} />
                </div>
                <button type="button" onClick={() => removeItem(i)} className="btn-icon btn-icon-danger" style={{ marginBottom: '6px' }}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
          <div className="input-group">
            <label>Observaciones</label>
            <input type="text" className="input" placeholder="Notas de envío..." value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} />
          </div>
          <div className="flex justify-between items-center pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <span className="font-bold text-lg">Valor Total: <span className="text-accent">${total.toLocaleString()}</span></span>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="btn btn-secondary">Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <Loader2 size={18} className="spinner" /> : <><Save size={18} /> Crear Remisión</>}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
