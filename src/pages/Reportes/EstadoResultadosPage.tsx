import { useState } from 'react'
import { RefreshCcw, Loader2, AlertCircle, ChevronDown, ChevronRight, BarChart2 } from 'lucide-react'
import { api } from '@/lib/api'
import { getTenantId } from '@/services/auth.service'
import { extractApiError } from '@/lib/errors'

const fmt = (n: number) =>
  Number(n).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const today    = () => new Date().toISOString().split('T')[0]
const firstDay = () => { const d = new Date(); return new Date(d.getFullYear(), 0, 1).toISOString().split('T')[0] }

interface LineaER {
  codigo: string
  nombre: string
  saldo:  number
  saldo_comparativo?: number
}

interface BloqueER {
  titulo:  string
  cuentas: LineaER[]
  total:   number
  total_comparativo?: number
}

interface DataER {
  desde: string; hasta: string
  bloques: BloqueER[]
  utilidad_neta: number
  utilidad_neta_comparativo?: number
  meta: { ms: number }
}

function BloqueER({ bloque, comparativo }: { bloque: BloqueER; comparativo: boolean }) {
  const [open, setOpen] = useState(true)
  const isGasto = bloque.titulo.toLowerCase().includes('gasto') || bloque.titulo.toLowerCase().includes('costo')
  const tone = isGasto ? 'danger' : 'success'

  return (
    <div className="income-statement-block">
      <button
        onClick={() => setOpen(o => !o)}
        className="income-statement-block-toggle"
        type="button"
        aria-expanded={open}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span>{bloque.titulo}</span>
        <span className={`income-statement-block-total tone-${tone}`}>${fmt(bloque.total)}</span>
        {comparativo && bloque.total_comparativo !== undefined && (
          <span className="income-statement-compare-total">${fmt(bloque.total_comparativo)}</span>
        )}
      </button>
      {open && (
        <table className="table income-statement-table">
          <tbody>
            {bloque.cuentas.map(c => (
              <tr key={c.codigo}>
                <td className="income-statement-code">{c.codigo}</td>
                <td className="income-statement-account">{c.nombre}</td>
                <td className="income-statement-money">${fmt(c.saldo)}</td>
                {comparativo && (
                  <td className="income-statement-money muted">${fmt(c.saldo_comparativo ?? 0)}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default function EstadoResultadosPage() {
  const [desde, setDesde]           = useState(firstDay())
  const [hasta, setHasta]           = useState(today())
  const [comparativo, setComparativo] = useState(false)
  const [data, setData]   = useState<DataER | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const cargar = async () => {
    setLoading(true); setError('')
    try {
      const res = await api.get(`/${getTenantId()}/estado-resultados`, {
        params: { desde, hasta, comparativo: comparativo ? 1 : 0 },
      })
      setData(res.data.data)
    } catch (e: unknown) {
      setError(extractApiError(e, 'Error al cargar estado de resultados.'))
    } finally {
      setLoading(false)
    }
  }

  const utilidadTone = data && data.utilidad_neta >= 0 ? 'tone-success' : 'tone-danger'

  return (
    <div className="income-statement-page page-container">
      <div className="page-header income-statement-header">
        <div className="income-statement-title-row">
        <div className="income-statement-icon"><BarChart2 size={20} aria-hidden="true" /></div>
        <div>
          <h1 className="page-title">Estado de Resultados</h1>
          <p className="page-subtitle">Estado de Rendimiento Financiero - NIIF</p>
        </div>
        </div>
      </div>

      <div className="card income-statement-toolbar">
        <div className="input-group">
          <label>Desde</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
            className="input income-statement-date-input" />
        </div>
        <div className="input-group">
          <label>Hasta</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
            className="input income-statement-date-input" />
        </div>
        <label className="income-statement-checkbox">
          <input type="checkbox" checked={comparativo} onChange={e => setComparativo(e.target.checked)}
            className="checkbox" />
          Comparativo periodo anterior
        </label>
        <button onClick={cargar} disabled={loading}
          className="btn btn-primary">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
          Generar
        </button>
      </div>

      {error && (
        <div className="alert alert-error income-statement-alert">
          <AlertCircle size={16} />{error}
        </div>
      )}

      {data && (
        <div className="card income-statement-card">
          {comparativo && (
            <div className="income-statement-comparison-header">
              <span>Periodo actual</span>
              <span>Periodo anterior</span>
            </div>
          )}

          {data.bloques.map(b => (
            <BloqueER key={b.titulo} bloque={b} comparativo={comparativo} />
          ))}

          <div className="income-statement-net">
            <span>Utilidad / perdida neta</span>
            <span className={`income-statement-net-value ${utilidadTone}`}>
              {data.utilidad_neta < 0 ? '-' : ''}${fmt(Math.abs(data.utilidad_neta))}
            </span>
          </div>

          <p className="income-statement-generated">Generado en {data.meta.ms}ms</p>
        </div>
      )}
    </div>
  )
}
