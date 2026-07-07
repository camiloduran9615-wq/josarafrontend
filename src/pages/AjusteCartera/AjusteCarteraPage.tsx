import { useState, useEffect } from 'react'
import { ajusteCarteraService, type AjusteCartera } from '@/services/ajusteCartera.service'
import { Plus, RefreshCcw, Search, Sliders } from 'lucide-react'
import NuevoAjusteCarteraModal from './NuevoAjusteCarteraModal'

const TIPO_LABEL: Record<string, string> = {
  castigo_cartera: 'Castigo de Cartera',
  descuento_pronto_pago: 'Descuento P. Pago',
  provision_cartera: 'Provisión',
  recuperacion_cartera: 'Recuperación',
  abono_parcial: 'Abono Parcial',
  diferencia_cambio: 'Diferencia Cambio',
  otro: 'Otro',
}

export default function AjusteCarteraPage() {
  const [ajustes, setAjustes] = useState<AjusteCartera[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [search, setSearch] = useState('')

  const fetchAjustes = async () => {
    try { setLoading(true); const r = await ajusteCarteraService.getAll(); setAjustes(r.data || []) }
    catch (e) { console.error(e) } finally { setLoading(false) }
  }

  useEffect(() => { fetchAjustes() }, [])

  const filtered = ajustes.filter(a =>
    a.numero?.toLowerCase().includes(search.toLowerCase()) ||
    a.tercero.razon_social.toLowerCase().includes(search.toLowerCase()) ||
    a.concepto?.toLowerCase().includes(search.toLowerCase())
  )

  const getStatusBadge = (e: string) => {
    const m: Record<string, string> = { aplicado: 'badge-success', borrador: 'badge-warning', anulado: 'badge-muted' }
    return <span className={`badge ${m[e] ?? 'badge-muted'}`}>{e}</span>
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Ajuste de Cartera</h1>
          <p className="page-subtitle">Castigos, descuentos, provisiones y abonos sobre cuentas por cobrar.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={fetchAjustes} disabled={loading}><RefreshCcw size={18} className={loading ? 'spinner' : ''} /></button>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}><Plus size={18} /> Nuevo Ajuste</button>
        </div>
      </div>
      <div className="card mb-6">
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" className="input" style={{ paddingLeft: '40px' }} placeholder="Buscar por número, cliente o concepto..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading && ajustes.length === 0 ? (
          <div className="spinner-center"><span className="spinner" style={{ width: '32px', height: '32px' }} /></div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr><th>Fecha</th><th>Número</th><th>Tercero</th><th>Tipo</th><th>Concepto</th><th>Valor</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id}>
                    <td>{new Date(a.fecha).toLocaleDateString()}</td>
                    <td className="font-semibold">{a.numero}</td>
                    <td><div>{a.tercero.razon_social}</div><div className="text-xs text-muted">{a.tercero.identificacion}</div></td>
                    <td><span className="badge badge-info">{TIPO_LABEL[a.tipo] ?? a.tipo}</span></td>
                    <td className="text-muted" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.concepto}</td>
                    <td className="font-semibold">${Number(a.valor).toLocaleString()}</td>
                    <td>{getStatusBadge(a.estado)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Sliders size={32} style={{ margin: '0 auto 12px' }} /><div>No hay ajustes de cartera registrados.</div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <NuevoAjusteCarteraModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchAjustes} />
    </div>
  )
}
