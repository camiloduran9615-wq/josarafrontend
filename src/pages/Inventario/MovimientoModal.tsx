import { useState } from 'react'
import { createPortal } from 'react-dom'
import { api } from '@/lib/api'
import { getTenantId } from '@/services/auth.service'
import { X, ArrowUpRight, ArrowDownLeft, Loader2, AlertCircle } from 'lucide-react'
import { extractApiError } from '@/lib/errors'
import type { ProductoInventario } from './InventarioPage'

interface MovimientoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  producto: ProductoInventario | null
}

export default function MovimientoModal({ isOpen, onClose, onSuccess, producto }: MovimientoModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    tipo: 'entrada',
    cantidad: 1,
    precio_unitario: 0,
    concepto: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!producto) return
    setLoading(true)
    setError('')
    try {
      await api.post(`/${getTenantId()}/productos/movimiento`, {
        ...formData,
        producto_id: producto.id,
        precio_unitario: formData.precio_unitario || (formData.tipo === 'entrada' ? producto.precio_compra : producto.precio_venta)
      })
      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(extractApiError(err, 'No se pudo registrar el movimiento.'))
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !producto) return null

  return createPortal(
    <div className="modal-overlay">
      <div className="modal inventory-movement-modal">
        <div className="modal-header">
          <h2 className="modal-title">Registrar Movimiento</h2>
          <button onClick={onClose} className="btn-icon" aria-label="Cerrar modal de movimiento"><X size={20} /></button>
        </div>

        <div className="modal-body inventory-modal-body">
        <div className="inventory-movement-summary">
          <div className="inventory-movement-summary-icon">
            <ArrowUpRight size={20} className={formData.tipo === 'entrada' ? 'tone-success' : 'text-muted'} />
          </div>
          <div>
            <div className="inventory-movement-product">{producto.nombre}</div>
            <div className="inventory-product-unit">Stock actual: {producto.stock_actual}</div>
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={16} />{error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="inventory-modal-form compact">
          <div className="input-group">
            <label>Tipo de Movimiento</label>
            <div className="inventory-movement-type">
              <button 
                type="button" 
                className={`btn inventory-movement-type-button ${formData.tipo === 'entrada' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFormData({...formData, tipo: 'entrada'})}
              >
                <ArrowUpRight size={16} /> Entrada
              </button>
              <button 
                type="button" 
                className={`btn inventory-movement-type-button ${formData.tipo === 'salida' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFormData({...formData, tipo: 'salida'})}
              >
                <ArrowDownLeft size={16} /> Salida
              </button>
            </div>
          </div>

          <div className="inventory-modal-grid two">
            <div className="input-group">
              <label>Cantidad</label>
              <input 
                type="number" className="input" required min="0.01" step="0.01"
                value={formData.cantidad} onChange={e => setFormData({...formData, cantidad: Number(e.target.value)})}
              />
            </div>
            <div className="input-group">
              <label>Precio Unit.</label>
              <input 
                type="number" className="input" 
                placeholder={String(formData.tipo === 'entrada' ? producto.precio_compra : producto.precio_venta)}
                value={formData.precio_unitario} onChange={e => setFormData({...formData, precio_unitario: Number(e.target.value)})}
              />
            </div>
          </div>

          <div className="input-group">
            <label>Concepto / Observación</label>
            <input 
              type="text" className="input" required 
              placeholder="Ej: Compra según factura #123"
              value={formData.concepto} onChange={e => setFormData({...formData, concepto: e.target.value})}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar Movimiento'}
          </button>
        </form>
        </div>
      </div>
    </div>,
    document.body,
  )
}
