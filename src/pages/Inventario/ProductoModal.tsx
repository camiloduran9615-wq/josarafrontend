import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { api } from '@/lib/api'
import { getAxiosErrorData } from '@/lib/errors'
import { getTenantId } from '@/services/auth.service'
import { X, Save, Loader2, Package } from 'lucide-react'
import UnidadMedidaInput from '@/components/UnidadMedidaInput'
import type { ProductoInventario } from './InventarioPage'

interface CuentaContableOption {
  id: number | string
  codigo: string
  nombre: string
  children?: CuentaContableOption[]
}

type ProductoFormData = {
  codigo: string
  nombre: string
  descripcion: string
  unidad_medida: string
  precio_venta: number | string
  precio_compra: number | string
  stock_minimo: number
  porcentaje_iva: number
  inicial_stock: number
  inventario_cuenta_id: string | number
  ventas_cuenta_id: string | number
  costos_cuenta_id: string | number
}

interface ProductoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  onCreated?: (prod: ProductoInventario) => void
  producto?: ProductoInventario | null
  overlayZIndex?: number
}

export default function ProductoModal({
  isOpen, onClose, onSuccess, onCreated, producto, overlayZIndex = 100,
}: ProductoModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cuentas, setCuentas] = useState<CuentaContableOption[]>([])
  const [formData, setFormData] = useState<ProductoFormData>({
    codigo:               '',
    nombre:               '',
    descripcion:          '',
    unidad_medida:        '94',
    precio_venta:         0,
    precio_compra:        0,
    stock_minimo:         0,
    porcentaje_iva:       19,
    inicial_stock:        0,
    inventario_cuenta_id: '',
    ventas_cuenta_id:     '',
    costos_cuenta_id:     '',
  })

  async function fetchCuentas() {
    try {
      const res = await api.get(`/${getTenantId()}/cuentas-contables`)
      const flatten = (nodes: CuentaContableOption[]): CuentaContableOption[] =>
        nodes.flatMap((n) => [n, ...flatten(n.children || [])])
      setCuentas(flatten(res.data.data || []))
    } catch { /* sin cuentas */ }
  }

  useEffect(() => {
    if (!isOpen) return
    /* eslint-disable react-hooks/set-state-in-effect */
    setError('')
    fetchCuentas()
    if (producto) {
      setFormData({
        codigo: producto.codigo,
        nombre: producto.nombre,
        descripcion: producto.descripcion || '',
        unidad_medida: producto.unidad_medida || '94',
        precio_venta: producto.precio_venta || 0,
        precio_compra: producto.precio_compra || 0,
        stock_minimo: producto.stock_minimo || 0,
        porcentaje_iva: producto.porcentaje_iva || 19,
        inicial_stock: 0,
        inventario_cuenta_id: producto.inventario_cuenta_id || '',
        ventas_cuenta_id: producto.ventas_cuenta_id || '',
        costos_cuenta_id: producto.costos_cuenta_id || '',
      })
    } else {
      setFormData({
        codigo: '', nombre: '', descripcion: '', unidad_medida: '94',
        precio_venta: 0, precio_compra: 0, stock_minimo: 0, porcentaje_iva: 19,
        inicial_stock: 0, inventario_cuenta_id: '', ventas_cuenta_id: '', costos_cuenta_id: '',
      })
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [producto, isOpen])

  const set = (patch: Partial<typeof formData>) => setFormData(p => ({ ...p, ...patch }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (producto) {
        await api.put(`/${getTenantId()}/productos/${producto.id}`, formData)
        onSuccess()
        onClose()
      } else {
        const res = await api.post(`/${getTenantId()}/productos`, formData)
        onCreated?.(res.data.data)
        onSuccess()
        onClose()
      }
    } catch (err) {
      const data = getAxiosErrorData(err)?.data
      const msgs = data?.errors as Record<string, unknown> | undefined
      setError(msgs ? Object.values(msgs).flat().join(' ') : (data?.message || 'Error al guardar'))
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div className="modal-overlay" style={{ zIndex: overlayZIndex }}>
      <div className="modal inventory-product-modal">
        <div className="modal-header">
          <h2 className="modal-title inventory-modal-title">
            <Package size={20} className="tone-emphasis" aria-hidden="true" />
            {producto ? 'Editar Producto' : 'Nuevo Producto'}
          </h2>
          <button onClick={onClose} className="btn-icon" aria-label="Cerrar modal de producto"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="inventory-modal-form">
          <div className="modal-body inventory-modal-body">

            {error && <div className="alert alert-error">{error}</div>}

            <div className="inventory-modal-grid two">
              <div className="input-group">
                <label>Código / SKU *</label>
                <input type="text" className="input" required
                  value={formData.codigo} onChange={e => set({ codigo: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Nombre del producto *</label>
                <input type="text" className="input" required
                  value={formData.nombre} onChange={e => set({ nombre: e.target.value })} />
              </div>
            </div>

            <div className="input-group">
              <label>Descripción <span className="inventory-optional-label">(opcional)</span></label>
              <textarea className="input inventory-textarea" rows={2}
                value={formData.descripcion || ''}
                onChange={e => set({ descripcion: e.target.value })} />
            </div>

            <div className="input-group">
              <label>Unidad de medida DIAN *</label>
              <UnidadMedidaInput
                value={formData.unidad_medida}
                onChange={code => set({ unidad_medida: code })}
              />
            </div>

            <div className="inventory-modal-grid three">
              <div className="input-group">
                <label>Precio compra</label>
                <input type="number" className="input" min={0} required
                  value={formData.precio_compra}
                  onChange={e => set({ precio_compra: Number(e.target.value) })} />
              </div>
              <div className="input-group">
                <label>Precio venta</label>
                <input type="number" className="input" min={0} required
                  value={formData.precio_venta}
                  onChange={e => set({ precio_venta: Number(e.target.value) })} />
              </div>
              <div className="input-group">
                <label>% IVA</label>
                <select className="input" value={formData.porcentaje_iva}
                  onChange={e => set({ porcentaje_iva: Number(e.target.value) })}>
                  <option value={19}>IVA 19%</option>
                  <option value={5}>IVA 5%</option>
                  <option value={0}>Exento (0%)</option>
                </select>
              </div>
            </div>

            <div className="inventory-modal-grid two">
              <div className="input-group">
                <label>Stock mínimo</label>
                <input type="number" className="input" min={0} required
                  value={formData.stock_minimo}
                  onChange={e => set({ stock_minimo: Number(e.target.value) })} />
              </div>
              {!producto && (
                <div className="input-group">
                  <label>Stock inicial</label>
                  <input type="number" className="input" min={0}
                    value={formData.inicial_stock}
                    onChange={e => set({ inicial_stock: Number(e.target.value) })} />
                </div>
              )}
            </div>

            <div className="inventory-accounting-section">
              <div className="inventory-accounting-title">
                Configuración Contable (PUC)
              </div>
              <div className="inventory-accounting-fields">
                <div className="input-group">
                  <label>Cuenta de Inventario (Activo)</label>
                  <select className="input" value={formData.inventario_cuenta_id || ''}
                    onChange={e => set({ inventario_cuenta_id: e.target.value })}>
                    <option value="">Seleccione cuenta...</option>
                    {cuentas.filter(c => c.codigo.startsWith('14')).map(c => (
                      <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="inventory-modal-grid two">
                  <div className="input-group">
                    <label>Cuenta de Ventas (Ingresos)</label>
                    <select className="input" value={formData.ventas_cuenta_id || ''}
                      onChange={e => set({ ventas_cuenta_id: e.target.value })}>
                      <option value="">Seleccione cuenta...</option>
                      {cuentas.filter(c => c.codigo.startsWith('41')).map(c => (
                        <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Cuenta de Costos</label>
                    <select className="input" value={formData.costos_cuenta_id || ''}
                      onChange={e => set({ costos_cuenta_id: e.target.value })}>
                      <option value="">Seleccione cuenta...</option>
                      {cuentas.filter(c => c.codigo.startsWith('61')).map(c => (
                        <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading
                ? <><Loader2 size={16} className="animate-spin" /> Guardando...</>
                : <><Save size={16} /> {producto ? 'Actualizar' : 'Crear Producto'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
