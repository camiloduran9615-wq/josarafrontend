import { useState } from 'react'
import {
  BookText, RefreshCcw, Loader2, AlertCircle,
  ChevronDown, ChevronRight, TrendingUp, TrendingDown, Minus,
} from 'lucide-react'
import { api } from '@/lib/api'
import { getTenantId } from '@/services/auth.service'
import { extractApiError } from '@/lib/errors'

const fmt = (n: number) =>
  Number(n || 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const fmtPct = (n: number | null) =>
  n === null || n === undefined ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`

interface CuentaNota {
  codigo: string
  nombre: string
  saldo_actual: number
  saldo_anterior: number
  variacion: number
  variacion_pct: number | null
}

interface Nota {
  numero: number
  titulo: string
  cuentas: CuentaNota[]
  total_actual: number
  total_anterior: number
  variacion: number
  variacion_pct: number | null
}

interface DataNotas {
  anio: number
  fecha_corte: string
  fecha_corte_anterior: string
  notas: Nota[]
  empresa?: { nombre: string; nit: string }
}

function NotaCard({ nota }: { nota: Nota }) {
  const [open, setOpen] = useState(false)
  const v = nota.variacion
  const Icon = v > 0 ? TrendingUp : v < 0 ? TrendingDown : Minus
  const tone = v > 0 ? 'tone-success' : v < 0 ? 'tone-danger' : ''

  return (
    <div className="card financial-notes-card">
      <button
        onClick={() => setOpen(o => !o)}
        className="financial-notes-toggle"
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <div className="financial-notes-badge">
          N{nota.numero}
        </div>
        <div className="financial-notes-title">
          <div>{nota.titulo}</div>
          <small>
            {nota.cuentas.length} {nota.cuentas.length === 1 ? 'cuenta' : 'cuentas'}
          </small>
        </div>
        <div className="financial-notes-total">
          <strong>${fmt(nota.total_actual)}</strong>
          <div className={`financial-notes-variation ${tone}`}>
            <Icon size={11} />
            {fmt(nota.variacion)} ({fmtPct(nota.variacion_pct)})
          </div>
        </div>
      </button>

      {open && (
        <div className="financial-notes-body">
          {nota.cuentas.length === 0 ? (
            <div className="empty-state">Sin movimientos en el periodo.</div>
          ) : (
            <div className="table-wrapper">
            <table className="table financial-notes-table">
              <thead>
                <tr className="border-b border-slate-700 text-slate-500 uppercase text-[10px]">
                  <th>Codigo</th>
                  <th className="text-left py-1.5">Cuenta</th>
                  <th className="text-right py-1.5">Saldo Actual</th>
                  <th className="text-right py-1.5">Año anterior</th>
                  <th className="text-right py-1.5">Variacion</th>
                  <th className="text-right py-1.5">%</th>
                </tr>
              </thead>
              <tbody>
                {nota.cuentas.map(c => (
                  <tr key={c.codigo}>
                    <td className="financial-notes-code">{c.codigo}</td>
                    <td>{c.nombre}</td>
                    <td className="financial-notes-money">${fmt(c.saldo_actual)}</td>
                    <td className="financial-notes-money muted">${fmt(c.saldo_anterior)}</td>
                    <td className={`financial-notes-money ${c.variacion >= 0 ? 'tone-success' : 'tone-danger'}`}>
                      {c.variacion >= 0 ? '+' : ''}{fmt(c.variacion)}
                    </td>
                    <td className={`financial-notes-money ${(c.variacion_pct ?? 0) >= 0 ? 'tone-success' : 'tone-danger'}`}>
                      {fmtPct(c.variacion_pct)}
                    </td>
                  </tr>
                ))}
                <tr className="financial-notes-total-row">
                  <td colSpan={2}>TOTAL</td>
                  <td className="financial-notes-money strong">${fmt(nota.total_actual)}</td>
                  <td className="financial-notes-money muted">${fmt(nota.total_anterior)}</td>
                  <td className={`financial-notes-money ${nota.variacion >= 0 ? 'tone-success' : 'tone-danger'}`}>
                    {nota.variacion >= 0 ? '+' : ''}{fmt(nota.variacion)}
                  </td>
                  <td className={`financial-notes-money ${(nota.variacion_pct ?? 0) >= 0 ? 'tone-success' : 'tone-danger'}`}>
                    {fmtPct(nota.variacion_pct)}
                  </td>
                </tr>
              </tbody>
            </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function NotasEstadosFinancierosPage() {
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [data, setData] = useState<DataNotas | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const T = getTenantId()

  const cargar = async () => {
    setLoading(true); setError('')
    try {
      const res = await api.get(`/${T}/reports/notas-estados-financieros`, {
        params: { ['año']: anio },
      })
      setData(res.data.data)
    } catch (e: unknown) {
      setError(extractApiError(e, 'Error al cargar las notas.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="financial-notes-page page-container">
      <div className="page-header financial-notes-header">
        <div className="financial-notes-title-row">
        <div className="financial-notes-icon">
          <BookText size={20} aria-hidden="true" />
        </div>
        <div>
          <h1 className="page-title">Notas a los Estados Financieros</h1>
          <p className="page-subtitle">NIC 1.117 - Desglose por cuenta con comparativo año anterior</p>
        </div>
        </div>
      </div>

      <div className="card financial-notes-toolbar">
        <div className="input-group">
          <label>Año fiscal</label>
          <input
            type="number" min={2020} max={2100} value={anio}
            onChange={e => setAnio(parseInt(e.target.value || '0', 10))}
            className="input financial-notes-year-input"
          />
        </div>
        <button
          onClick={cargar} disabled={loading}
          className="btn btn-primary"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
          Generar
        </button>
        {data && (
          <div className="financial-notes-period">
            Corte: <strong>{data.fecha_corte}</strong>
            <span>|</span>
            Comparativo: {data.fecha_corte_anterior}
          </div>
        )}
      </div>

      {error && (
        <div className="alert alert-error financial-notes-alert">
          <AlertCircle size={16} />{error}
        </div>
      )}

      {data && (
        <>
          {data.empresa?.nombre && (
            <div className="financial-notes-entity">
              <div className="financial-notes-entity__name">{data.empresa.nombre}</div>
              {data.empresa.nit && <div>NIT {data.empresa.nit}</div>}
            </div>
          )}
          <div className="financial-notes-tip">
            <strong>Tip contable:</strong> Las notas 1-3 (informacion general, bases de presentacion, politicas
            contables) y la 16 (hechos posteriores) son de elaboración manual por el contador.
            Las que aparecen aqui (N4-N15) son las generadas automaticamente con los movimientos del PUC.
          </div>

          {data.notas.length === 0 && (
            <div className="card empty-state">
              No hay notas para reportar en {data.anio}.
            </div>
          )}

          {data.notas.map(n => <NotaCard key={n.numero} nota={n} />)}
        </>
      )}
    </div>
  )
}
