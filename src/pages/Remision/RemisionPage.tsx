import { useState, useEffect } from 'react'
import { remisionService, type Remision } from '@/services/remision.service'
import { Plus, RefreshCcw, Search, Truck } from 'lucide-react'
import NuevaRemisionModal from './NuevaRemisionModal'

export default function RemisionPage() {
  const [remisiones, setRemisiones] = useState<Remision[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [search, setSearch] = useState('')

  const fetchRemisiones = async () => {
    try { setLoading(true); const r = await remisionService.getAll(); setRemisiones(r.data || []) }
    catch (e) { console.error(e) } finally { setLoading(false) }
  }

  useEffect(() => { fetchRemisiones() }, [])

  const filtered = remisiones.filter(r =>
    r.numero?.toLowerCase().includes(search.toLowerCase()) ||
    r.tercero.razon_social.toLowerCase().includes(search.toLowerCase())
  )

  const getStatusBadge = (e: string) => {
    const m: Record<string, string> = { enviada: 'badge-info', facturada: 'badge-success', borrador: 'badge-warning', anulada: 'badge-muted' }
    return <span className={`badge ${m[e] ?? 'badge-muted'}`}>{e}</span>
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Remisiones</h1>
          <p className="page-subtitle">Documenta el envío de mercancía antes de facturar.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={fetchRemisiones} disabled={loading}><RefreshCcw size={18} className={loading ? 'spinner' : ''} /></button>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}><Plus size={18} /> Nueva Remisión</button>
        </div>
      </div>
      <div className="card mb-6">
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" className="input" style={{ paddingLeft: '40px' }} placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading && remisiones.length === 0 ? (
          <div className="spinner-center"><span className="spinner" style={{ width: '32px', height: '32px' }} /></div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr><th>Fecha</th><th>Número</th><th>Cliente</th><th>Fecha Entrega</th><th>Transportista</th><th>Valor</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td>{new Date(r.fecha).toLocaleDateString()}</td>
                    <td className="font-semibold">{r.numero}</td>
                    <td><div>{r.tercero.razon_social}</div><div className="text-xs text-muted">{r.tercero.identificacion}</div></td>
                    <td>{r.fecha_entrega ? new Date(r.fecha_entrega).toLocaleDateString() : <span className="text-muted">—</span>}</td>
                    <td className="text-muted">{r.transportista ?? '—'}</td>
                    <td className="font-semibold">${Number(r.valor_total).toLocaleString()}</td>
                    <td>{getStatusBadge(r.estado)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Truck size={32} style={{ margin: '0 auto 12px' }} /><div>No hay remisiones registradas.</div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <NuevaRemisionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchRemisiones} />
    </div>
  )
}
