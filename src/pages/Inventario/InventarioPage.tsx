import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { extractApiError } from '@/lib/errors'
import { getTenantId } from '@/services/auth.service'
import { Package, Plus, Search, AlertTriangle, History, Edit2 } from 'lucide-react'
import ProductoModal from './ProductoModal'
import MovimientoModal from './MovimientoModal'

export interface ProductoInventario {
  id: number | string
  codigo: string
  nombre: string
  descripcion?: string
  unidad_medida: string
  precio_venta: number | string
  precio_compra: number | string
  stock_actual: number
  stock_minimo: number
  porcentaje_iva?: number
  inicial_stock?: number
  inventario_cuenta_id?: string | number
  ventas_cuenta_id?: string | number
  costos_cuenta_id?: string | number
  categoria?: { nombre?: string }
}

export default function InventarioPage() {
  const [productos, setProductos] = useState<ProductoInventario[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  
  const [isProdModalOpen, setIsProdModalOpen] = useState(false)
  const [isMovModalOpen, setIsMovModalOpen] = useState(false)
  const [selectedProd, setSelectedProd] = useState<ProductoInventario | null>(null)

  async function fetchProductos() {
    try {
      setLoading(true)
      setError('')
      const res = await api.get(`/${getTenantId()}/productos`)
      setProductos(res.data.data)
    } catch (err: unknown) {
      setError(extractApiError(err, 'No se pudo cargar el inventario. Intenta nuevamente.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProductos()
  }, [])

  const handleEdit = (prod: ProductoInventario) => {
    setSelectedProd(prod)
    setIsProdModalOpen(true)
  }

  const handleNew = () => {
    setSelectedProd(null)
    setIsProdModalOpen(true)
  }

  const handleMov = (prod: ProductoInventario) => {
    setSelectedProd(prod)
    setIsMovModalOpen(true)
  }

  const filtered = productos.filter(p =>
    p.nombre.toLowerCase().includes(search.toLowerCase()) || 
    p.codigo.toLowerCase().includes(search.toLowerCase())
  )

  const lowStockCount = productos.filter(p => p.stock_actual <= p.stock_minimo).length
  const inventoryValue = productos.reduce(
    (acc, p) => acc + (p.stock_actual * Number(p.precio_compra || 0)),
    0,
  )

  return (
    <div className="inventory-page page-container">
      <div className="page-header inventory-header">
        <div className="inventory-title-row">
          <div className="inventory-icon">
            <Package size={20} aria-hidden="true" />
          </div>
          <div>
          <h1 className="page-title">Inventario y Productos</h1>
          <p className="page-subtitle">Gestiona tu catálogo de productos, servicios y controla existencias en tiempo real.</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleNew}>
          <Plus size={18} /> Nuevo Producto
        </button>
      </div>

      <div className="inventory-metrics">
        <div className="card inventory-metric-card">
          <div className="stat-label">Total productos</div>
          <div className="stat-value">{productos.length}</div>
        </div>
        <div className="card inventory-metric-card">
          <div className="stat-label">Stock bajo</div>
          <div className="stat-value tone-danger">
            {lowStockCount}
          </div>
        </div>
        <div className="card inventory-metric-card">
          <div className="stat-label">Valorización inventario</div>
          <div className="stat-value tone-emphasis">
            ${inventoryValue.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="card inventory-toolbar">
        <div className="input-group inventory-search">
          <label htmlFor="inventory-search">Buscar productos</label>
          <div className="inventory-search-field">
            <Search size={16} aria-hidden="true" />
            <input 
              id="inventory-search"
              type="text" className="input"
              placeholder="Buscar por código o nombre..." 
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error inventory-alert">{error}</div>}

      <div className="card inventory-table-card">
        <table className="table inventory-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Producto / Servicio</th>
              <th>Categoría</th>
              <th className="text-right">Precio Venta</th>
              <th className="text-center">Stock</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="inventory-loading"><span className="spinner" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="inventory-empty">No se encontraron productos.</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id}>
                <td className="inventory-code">{p.codigo}</td>
                <td>
                  <div className="inventory-product-name">{p.nombre}</div>
                  <div className="inventory-product-unit">{p.unidad_medida === '94' ? 'Unidad' : p.unidad_medida}</div>
                </td>
                <td>{p.categoria?.nombre || 'General'}</td>
                <td className="inventory-money">${Number(p.precio_venta || 0).toLocaleString()}</td>
                <td className="text-center">
                  <span className={`badge ${p.stock_actual <= p.stock_minimo ? 'badge-danger' : 'badge-success'}`}>
                    {p.stock_actual}
                  </span>
                  {p.stock_actual <= p.stock_minimo && <AlertTriangle size={14} className="inventory-stock-warning" aria-label="Stock bajo" />}
                </td>
                <td className="text-right">
                  <div className="inventory-actions">
                    <button className="btn-icon" title="Entrada/Salida" aria-label={`Registrar entrada o salida de ${p.nombre}`} onClick={() => handleMov(p)}>
                      <History size={14} className="tone-emphasis" />
                    </button>
                    <button className="btn-icon" title="Editar" aria-label={`Editar ${p.nombre}`} onClick={() => handleEdit(p)}>
                      <Edit2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ProductoModal 
        isOpen={isProdModalOpen} 
        onClose={() => setIsProdModalOpen(false)}
        onSuccess={fetchProductos}
        producto={selectedProd}
      />

      <MovimientoModal 
        isOpen={isMovModalOpen}
        onClose={() => setIsMovModalOpen(false)}
        onSuccess={fetchProductos}
        producto={selectedProd}
      />
    </div>
  )
}
