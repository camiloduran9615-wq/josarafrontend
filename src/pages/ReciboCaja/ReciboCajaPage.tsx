import { useState, useEffect } from 'react'
import { reciboCajaService, type ReciboCaja } from '@/services/reciboCaja.service'
import { Plus, RefreshCcw, Search, Wallet } from 'lucide-react'
import NuevoReciboCajaModal from './NuevoReciboCajaModal'

const FORMA_PAGO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo', cheque: 'Cheque', transferencia: 'Transferencia',
  tarjeta_debito: 'Tarjeta Débito', tarjeta_credito: 'Tarjeta Crédito',
  consignacion: 'Consignación', otro: 'Otro',
}

export default function ReciboCajaPage() {
  const [recibos, setRecibos] = useState<ReciboCaja[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [search, setSearch] = useState('')

  const fetchRecibos = async () => {
    try { setLoading(true); const r = await reciboCajaService.getAll(); setRecibos(r.data || []) }
    catch (e) { console.error(e) } finally { setLoading(false) }
  }

  useEffect(() => { fetchRecibos() }, [])

  const filtered = recibos.filter(r =>
    r.numero?.toLowerCase().includes(search.toLowerCase()) ||
    r.tercero.razon_social.toLowerCase().includes(search.toLowerCase())
  )

  const getStatusBadge = (e: string) => {
    const m: Record<string, string> = { registrado: 'badge-success', borrador: 'badge-warning', anulado: 'badge-muted' }
    return <span className={`badge ${m[e] ?? 'badge-muted'}`}>{e}</span>
  }

  const total = filtered.reduce((s, r) => s + Number(r.valor_recibido), 0)

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Recibos de Caja</h1>
          <p className="page-subtitle">Registra pagos recibidos de clientes y aplícalos a facturas.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={fetchRecibos} disabled={loading}><RefreshCcw size={18} className={loading ? 'spinner' : ''} /></button>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}><Plus size={18} /> Nuevo Recibo</button>
        </div>
      </div>

      {filtered.length > 0 && (
        <div className="card mb-4" style={{ padding: '16px 24px' }}>
          <div className="flex gap-8">
            <div><div className="text-xs text-muted">Total Recibido</div><div className="text-xl font-bold text-success">${total.toLocaleString()}</div></div>
            <div><div className="text-xs text-muted">Recibos</div><div className="text-xl font-bold">{filtered.length}</div></div>
          </div>
        </div>
      )}

      <div className="card mb-6">
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" className="input" style={{ paddingLeft: '40px' }} placeholder="Buscar por número o cliente..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading && recibos.length === 0 ? (
          <div className="spinner-center"><span className="spinner" style={{ width: '32px', height: '32px' }} /></div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr><th>Fecha</th><th>Número</th><th>Cliente</th><th>Concepto</th><th>Forma Pago</th><th>Valor Recibido</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td>{new Date(r.fecha).toLocaleDateString()}</td>
                    <td className="font-semibold">{r.numero}</td>
                    <td><div>{r.tercero.razon_social}</div><div className="text-xs text-muted">{r.tercero.identificacion}</div></td>
                    <td className="text-muted">{r.concepto}</td>
                    <td><span className="badge badge-info">{FORMA_PAGO_LABEL[r.forma_pago] ?? r.forma_pago}</span></td>
                    <td className="font-semibold text-success">${Number(r.valor_recibido).toLocaleString()}</td>
                    <td>{getStatusBadge(r.estado)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Wallet size={32} style={{ margin: '0 auto 12px' }} /><div>No hay recibos de caja registrados.</div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <NuevoReciboCajaModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchRecibos} />
    </div>
  )
}
