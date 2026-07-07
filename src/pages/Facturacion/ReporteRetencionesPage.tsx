import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { getTenantId } from '@/services/auth.service'
import { Search, Download, Calendar, Filter, Scissors } from 'lucide-react'

export default function ReporteRetencionesPage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchReport = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/${getTenantId()}/reports/withholdings`, {
        params: { start_date: startDate, end_date: endDate }
      })
      setData(res.data.data || [])
    } catch (err) {
      console.error('Error fetching report:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReport()
  }, [])

  const totalRetenido = data.reduce((acc, curr) => acc + parseFloat(curr.valor), 0)

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Scissors size={28} className="text-accent" />
            Reporte de Retenciones
          </h1>
          <p className="page-subtitle">Consulta el detalle de retenciones aplicadas en tus facturas emitidas.</p>
        </div>
        <button className="btn btn-secondary" onClick={() => window.print()}>
          <Download size={18} />
          Exportar PDF
        </button>
      </div>

      <div className="card mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="input-group" style={{ width: '200px' }}>
            <label className="text-xs flex items-center gap-1"><Calendar size={12} /> Fecha Inicio</label>
            <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="input-group" style={{ width: '200px' }}>
            <label className="text-xs flex items-center gap-1"><Calendar size={12} /> Fecha Fin</label>
            <input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={fetchReport} disabled={loading}>
            <Filter size={18} />
            Filtrar
          </button>
        </div>
      </div>

      <div className="grid-cols-4 mb-6">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent)' }}>
            <Scissors size={20} />
          </div>
          <div>
            <div className="stat-value">${totalRetenido.toLocaleString()}</div>
            <div className="stat-label">Total Retenido</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success)' }}>
            <Search size={20} />
          </div>
          <div>
            <div className="stat-value">{data.length}</div>
            <div className="stat-label">Registros</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Factura</th>
                <th>Tercero</th>
                <th>Tipo</th>
                <th>Tasa</th>
                <th>Base</th>
                <th style={{ textAlign: 'right' }}>Valor Retenido</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                    <span className="spinner" />
                  </td>
                </tr>
              ) : data.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.fecha}</td>
                  <td className="font-semibold">{item.factura}</td>
                  <td>
                    <div>{item.cliente}</div>
                    <div className="text-xs text-muted">{item.nit}</div>
                  </td>
                  <td><span className="badge badge-info">{item.nombre}</span></td>
                  <td>{item.tasa}%</td>
                  <td>${item.base.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }} className="font-bold text-danger">
                    -${parseFloat(item.valor).toLocaleString()}
                  </td>
                </tr>
              ))}
              {data.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No hay retenciones registradas en este periodo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
