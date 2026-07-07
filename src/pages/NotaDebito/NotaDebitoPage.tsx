import { useState, useEffect } from 'react'
import { notaDebitoService, type NotaDebito } from '@/services/notaDebito.service'
import { Plus, RefreshCcw, Search, TrendingUp } from 'lucide-react'
import NuevaNotaDebitoModal from './NuevaNotaDebitoModal'

export default function NotaDebitoPage() {
  const [notas, setNotas] = useState<NotaDebito[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [search, setSearch] = useState('')

  const fetchNotas = async () => {
    try { setLoading(true); const r = await notaDebitoService.getAll(); setNotas(r.data || []) }
    catch (e) { console.error(e) } finally { setLoading(false) }
  }

  useEffect(() => { fetchNotas() }, [])

  const filtered = notas.filter(n =>
    n.numero?.toLowerCase().includes(search.toLowerCase()) ||
    n.tercero.razon_social.toLowerCase().includes(search.toLowerCase())
  )

  const getStatusBadge = (e: string) => {
    const m: Record<string, string> = { validado: 'badge-success', borrador: 'badge-warning', error: 'badge-danger', anulado: 'badge-muted' }
    return <span className={`badge ${m[e] ?? 'badge-muted'}`}>{e}</span>
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Notas Débito</h1>
          <p className="page-subtitle">Aumenta el valor de cuentas por cobrar a tus clientes.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={fetchNotas} disabled={loading}><RefreshCcw size={18} className={loading ? 'spinner' : ''} /></button>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}><Plus size={18} /> Nueva Nota Débito</button>
        </div>
      </div>
      <div className="card mb-6">
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" className="input" style={{ paddingLeft: '40px' }} placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading && notas.length === 0 ? (
          <div className="spinner-center"><span className="spinner" style={{ width: '32px', height: '32px' }} /></div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr><th>Fecha</th><th>Número</th><th>Cliente</th><th>Descripción</th><th>Total</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {filtered.map(n => (
                  <tr key={n.id}>
                    <td>{new Date(n.fecha).toLocaleDateString()}</td>
                    <td className="font-semibold">{n.numero}</td>
                    <td><div>{n.tercero.razon_social}</div><div className="text-xs text-muted">{n.tercero.identificacion}</div></td>
                    <td className="text-muted">{n.descripcion}</td>
                    <td className="font-semibold">${Number(n.valor_total).toLocaleString()}</td>
                    <td>{getStatusBadge(n.estado)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <TrendingUp size={32} style={{ margin: '0 auto 12px' }} /><div>No hay notas débito registradas.</div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <NuevaNotaDebitoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchNotas} />
    </div>
  )
}
