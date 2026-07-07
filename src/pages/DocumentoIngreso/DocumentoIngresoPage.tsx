import { useState, useEffect } from 'react'
import { documentoIngresoService, type DocumentoIngreso } from '@/services/documentoIngreso.service'
import { Plus, RefreshCcw, Search, ShoppingCart } from 'lucide-react'
import NuevoDocumentoIngresoModal from './NuevoDocumentoIngresoModal'

export default function DocumentoIngresoPage() {
  const [documentos, setDocumentos] = useState<DocumentoIngreso[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [search, setSearch] = useState('')

  const fetchDocumentos = async () => {
    try {
      setLoading(true)
      const res = await documentoIngresoService.getAll()
      setDocumentos(res.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDocumentos() }, [])

  const filtered = documentos.filter(d =>
    d.numero?.toLowerCase().includes(search.toLowerCase()) ||
    d.tercero.razon_social.toLowerCase().includes(search.toLowerCase()) ||
    d.concepto?.toLowerCase().includes(search.toLowerCase())
  )

  const getStatusBadge = (estado: string) => {
    const map: Record<string, string> = {
      registrado: 'badge-success',
      borrador: 'badge-warning',
      anulado: 'badge-muted',
    }
    return <span className={`badge ${map[estado] ?? 'badge-muted'}`}>{estado}</span>
  }

  const getTipoBadge = (tipo: string) => {
    const labels: Record<string, string> = {
      factura_compra: 'Factura Compra',
      cuenta_cobro: 'Cuenta de Cobro',
      gasto: 'Gasto',
      otro: 'Otro',
    }
    return labels[tipo] ?? tipo
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <ShoppingCart size={26} className="text-accent" />
            Facturas de Compra
          </h1>
          <p className="page-subtitle">Registra facturas de proveedores, cuentas de cobro y gastos. Genera asiento contable y mueve inventario automáticamente.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={fetchDocumentos} disabled={loading}>
            <RefreshCcw size={18} className={loading ? 'spinner' : ''} />
          </button>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> Nueva Factura de Compra
          </button>
        </div>
      </div>

      <div className="card mb-6">
        <div className="input-group" style={{ maxWidth: '400px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text" className="input" style={{ paddingLeft: '40px' }}
              placeholder="Buscar por número, proveedor o concepto..."
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading && documentos.length === 0 ? (
          <div className="spinner-center"><span className="spinner" style={{ width: '32px', height: '32px' }} /></div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Número</th>
                  <th>Tipo</th>
                  <th>Proveedor</th>
                  <th>Concepto</th>
                  <th>Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.id}>
                    <td>{new Date(d.fecha).toLocaleDateString()}</td>
                    <td className="font-semibold">{d.numero}</td>
                    <td><span className="badge badge-info">{getTipoBadge(d.tipo)}</span></td>
                    <td>
                      <div>{d.tercero.razon_social}</div>
                      <div className="text-xs text-muted">{d.tercero.identificacion}</div>
                    </td>
                    <td className="text-muted" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.concepto}</td>
                    <td className="font-semibold">${Number(d.valor_total).toLocaleString()}</td>
                    <td>{getStatusBadge(d.estado)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <ShoppingCart size={32} style={{ margin: '0 auto 12px' }} />
                      <div>No hay facturas de compra registradas.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <NuevoDocumentoIngresoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchDocumentos}
      />
    </div>
  )
}
