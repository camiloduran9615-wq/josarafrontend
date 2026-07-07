import { useState } from 'react'
import { Scale, RefreshCcw, Loader2, AlertCircle, TrendingUp, TrendingDown, ChevronDown, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import { getTenantId } from '@/services/auth.service'
import { extractApiError } from '@/lib/errors'

const fmt = (n: number) =>
  Number(n).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const today = () => new Date().toISOString().split('T')[0]

interface BloqueBalance {
  titulo:    string
  cuentas:   { codigo: string; nombre: string; saldo: number }[]
  total:     number
}

interface DataBalance {
  fecha_corte: string
  activo:      { corriente: BloqueBalance; no_corriente: BloqueBalance; total: number }
  pasivo:      { corriente: BloqueBalance; no_corriente: BloqueBalance; total: number }
  patrimonio:  BloqueBalance & { total: number }
  ecuacion_valida: boolean
  meta: { ms: number }
}

function Bloque({ bloque, tone }: { bloque: BloqueBalance; tone: 'success' | 'danger' | 'emphasis' }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="balance-general-block">
      <button
        onClick={() => setOpen(o => !o)}
        className="balance-general-block-toggle"
        type="button"
        aria-expanded={open}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span>{bloque.titulo}</span>
        <span className={`balance-general-block-total tone-${tone}`}>${fmt(bloque.total)}</span>
      </button>
      {open && (
        <table className="table balance-general-table">
          <tbody>
            {bloque.cuentas.map(c => (
              <tr key={c.codigo}>
                <td className="balance-general-code">{c.codigo}</td>
                <td className="balance-general-account">{c.nombre}</td>
                <td className="balance-general-money">${fmt(c.saldo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default function BalanceGeneralPage() {
  const [fechaCorte, setFechaCorte] = useState(today())
  const [comparativo, setComparativo] = useState(false)
  const [data, setData]  = useState<DataBalance | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const cargar = async () => {
    setLoading(true); setError('')
    try {
      const res = await api.get(`/${getTenantId()}/balance-general`, {
        params: { fecha_corte: fechaCorte, comparativo_año_anterior: comparativo ? 1 : 0 },
      })
      setData(res.data.data)
    } catch (e: unknown) {
      setError(extractApiError(e, 'Error al cargar balance general.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="balance-general-page page-container">
      <div className="page-header balance-general-header">
        <div className="balance-general-title-row">
        <div className="balance-general-icon"><Scale size={20} aria-hidden="true" /></div>
        <div>
          <h1 className="page-title">Balance General</h1>
          <p className="page-subtitle">Estado de Situacion Financiera - NIIF</p>
        </div>
        </div>
      </div>

      <div className="card balance-general-toolbar">
        <div className="input-group">
          <label>Fecha de corte</label>
          <input
            type="date" value={fechaCorte}
            onChange={e => setFechaCorte(e.target.value)}
            className="input balance-general-date-input"
          />
        </div>
        <label className="balance-general-checkbox">
          <input type="checkbox" checked={comparativo} onChange={e => setComparativo(e.target.checked)}
            className="checkbox" />
          Comparativo año anterior
        </label>
        <button
          onClick={cargar} disabled={loading}
          className="btn btn-primary"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
          Generar
        </button>
      </div>

      {error && (
        <div className="alert alert-error balance-general-alert">
          <AlertCircle size={16} />{error}
        </div>
      )}

      {data && (
        <div className="balance-general-content">

          <div className="card balance-general-section">
            <div className="balance-general-section-header">
              <h2 className="balance-general-section-title">
                <TrendingUp size={16} className="tone-success" /> Activo
              </h2>
              <span className="balance-general-total tone-success">${fmt(data.activo.total)}</span>
            </div>
            <Bloque bloque={data.activo.corriente} tone="success" />
            <Bloque bloque={data.activo.no_corriente} tone="success" />
          </div>

          <div className="balance-general-stack">
            <div className="card balance-general-section">
              <div className="balance-general-section-header">
                <h2 className="balance-general-section-title">
                  <TrendingDown size={16} className="tone-danger" /> Pasivo
                </h2>
                <span className="balance-general-total tone-danger">${fmt(data.pasivo.total)}</span>
              </div>
              <Bloque bloque={data.pasivo.corriente} tone="danger" />
              <Bloque bloque={data.pasivo.no_corriente} tone="danger" />
            </div>

            <div className="card balance-general-section">
              <div className="balance-general-section-header">
                <h2 className="balance-general-section-title">
                  <Scale size={16} className="tone-emphasis" /> Patrimonio
                </h2>
                <span className="balance-general-total tone-emphasis">${fmt(data.patrimonio.total)}</span>
              </div>
              <Bloque bloque={data.patrimonio} tone="emphasis" />
            </div>
          </div>

          <div className={`balance-general-equation ${data.ecuacion_valida ? 'success' : 'danger'}`}>
            {data.ecuacion_valida
              ? `Activo ($${fmt(data.activo.total)}) = Pasivo ($${fmt(data.pasivo.total)}) + Patrimonio ($${fmt(data.patrimonio.total)})`
              : 'Ecuacion contable no cuadra. Revisar asientos.'}
            <span>Generado en {data.meta.ms}ms</span>
          </div>
        </div>
      )}
    </div>
  )
}
