import { useState, useEffect } from 'react'
import { cotizacionService, type Cotizacion } from '@/services/cotizacion.service'
import { Plus, RefreshCcw, Search, ClipboardList } from 'lucide-react'
import NuevaCotizacionModal from './NuevaCotizacionModal'

export default function CotizacionPage() {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [search, setSearch] = useState('')

  const fetchCotizaciones = async () => {
    try { setLoading(true); const r = await cotizacionService.getAll(); setCotizaciones(r.data || []) }
    catch (e) { console.error(e) } finally { setLoading(false) }
  }

  useEffect(() => { fetchCotizaciones() }, [])

  const filtered = cotizaciones.filter(c =>
    c.numero?.toLowerCase().includes(search.toLowerCase()) ||
    c.tercero.razon_social.toLowerCase().includes(search.toLowerCase())
  )

  const getStatusBadge = (e: string) => {
    const m: Record<string, string> = {
      borrador: 'badge-warning', enviada: 'badge-info', aceptada: 'badge-success',
      rechazada: 'badge-danger', vencida: 'badge-muted', facturada: 'badge-success',
    }
    return <span className={`badge ${m[e] ?? 'badge-muted'}`}>{e}</span>
  }

  const isVencida = (c: Cotizacion) => new Date(c.fecha_validez) < new Date() && !['aceptada', 'facturada'].includes(c.estado)

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cotizaciones</h1>
          <p className="page-subtitle">Crea y envía propuestas comerciales a tus clientes.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={fetchCotizaciones} disabled={loading}><RefreshCcw size={18} className={loading ? 'spinner' : ''} /></button>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}><Plus size={18} /> Nueva Cotización</button>
        </div>
      </div>
      <div className="card mb-6">
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" className="input" style={{ paddingLeft: '40px' }} placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading && cotizaciones.length === 0 ? (
          <div className="spinner-center"><span className="spinner" style={{ width: '32px', height: '32px' }} /></div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr><th>Fecha</th><th>Número</th><th>Cliente</th><th>Válida Hasta</th><th>Total</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} style={isVencida(c) ? { opacity: 0.6 } : {}}>
                    <td>{new Date(c.fecha).toLocaleDateString()}</td>
                    <td className="font-semibold">{c.numero}</td>
                    <td><div>{c.tercero.razon_social}</div><div className="text-xs text-muted">{c.tercero.identificacion}</div></td>
                    <td style={{ color: isVencida(c) ? 'var(--danger)' : 'inherit' }}>{new Date(c.fecha_validez).toLocaleDateString()}</td>
                    <td className="font-semibold">${Number(c.valor_total).toLocaleString()}</td>
                    <td>{getStatusBadge(isVencida(c) ? 'vencida' : c.estado)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <ClipboardList size={32} style={{ margin: '0 auto 12px' }} /><div>No hay cotizaciones registradas.</div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <NuevaCotizacionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchCotizaciones} />
    </div>
  )
}
