import { useState, useEffect } from 'react'
import { BookOpen, RefreshCcw, Loader2, AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { api } from '@/lib/api'
import { getTenantId } from '@/services/auth.service'
import { extractApiError } from '@/lib/errors'

const fmt = (n: number) =>
  Number(n || 0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const today    = () => new Date().toISOString().split('T')[0]
const firstDay = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0] }

interface LineaMayor {
  fecha:           string
  numero_asiento:  string
  descripcion:     string
  debito:          number
  credito:         number
  saldo:           number
  tercero?:        string
}

interface DataMayor {
  cuenta: { codigo: string; nombre: string; naturaleza: string }
  saldo_inicial: number
  lineas:        LineaMayor[]
  saldo_final:   number
  total_debitos: number
  total_creditos: number
  meta: { ms: number }
}

interface Cuenta { id: string; codigo: string; nombre: string; nivel: string }

export default function LibroMayorPage() {
  const [cuentas, setCuentas]   = useState<Cuenta[]>([])
  const [cuentaId, setCuentaId] = useState('')
  const [desde, setDesde]       = useState(firstDay())
  const [hasta, setHasta]       = useState(today())
  const [data, setData]   = useState<DataMayor | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    api.get(`/${getTenantId()}/cuentas-contables`)
      .then(r => {
        const cs: Cuenta[] = (r.data.data ?? []).filter((c: Cuenta) => c.nivel === 'subcuenta')
        setCuentas(cs)
      })
      .catch(() => setError('No se pudieron cargar las cuentas.'))
  }, [])

  const cargar = async () => {
    if (!cuentaId) { setError('Selecciona una cuenta.'); return }
    setLoading(true); setError('')
    try {
      const res = await api.get(`/${getTenantId()}/libro-mayor/${cuentaId}`, {
        params: { desde, hasta },
      })
      setData(res.data.data)
    } catch (e: unknown) {
      setError(extractApiError(e, 'Error al cargar libro mayor.'))
    } finally {
      setLoading(false)
    }
  }

  const saldoTone = (n: number) => n >= 0 ? 'tone-success' : 'tone-danger'

  return (
    <div className="ledger-page page-container">
      <div className="page-header ledger-header">
        <div className="ledger-title-row">
          <div className="ledger-icon"><BookOpen size={20} aria-hidden="true" /></div>
          <div>
            <h1 className="page-title">Libro Mayor</h1>
            <p className="page-subtitle">Movimientos y saldos por cuenta contable</p>
          </div>
        </div>
      </div>

      <div className="card ledger-toolbar">
        <div className="input-group ledger-account-field">
          <label>Cuenta contable</label>
          <select value={cuentaId} onChange={e => setCuentaId(e.target.value)}
            className="input">
            <option value="">Seleccionar cuenta...</option>
            {cuentas.map(c => (
              <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>
            ))}
          </select>
        </div>
        <div className="input-group">
          <label>Desde</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
            className="input ledger-date-input" />
        </div>
        <div className="input-group">
          <label>Hasta</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
            className="input ledger-date-input" />
        </div>
        <button onClick={cargar} disabled={loading}
          className="btn btn-primary">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
          Consultar
        </button>
      </div>

      {error && (
        <div className="alert alert-error ledger-alert">
          <AlertCircle size={16} />{error}
        </div>
      )}

      {data && (
        <>
          {/* Resumen */}
          <div className="ledger-summary-grid">
            {[
              { label: 'Saldo Inicial',  value: data.saldo_inicial,   tone: '' },
              { label: 'Total Debitos',  value: data.total_debitos,   tone: 'tone-info' },
              { label: 'Total Creditos', value: data.total_creditos,  tone: 'tone-warning' },
              { label: 'Saldo Final',    value: data.saldo_final,     tone: saldoTone(data.saldo_final) },
            ].map(({ label, value, tone }) => (
              <div key={label} className="card ledger-summary-card">
                <p>{label}</p>
                <strong className={tone}>${fmt(value)}</strong>
              </div>
            ))}
          </div>

          {/* Tabla de movimientos */}
          <div className="card ledger-table-card">
            <div className="ledger-table-header">
              <span className="ledger-account-code">{data.cuenta.codigo}</span>
              <span>{data.cuenta.nombre}</span>
              <small>{data.lineas.length} movimientos - {data.meta.ms}ms</small>
            </div>
            <div className="table-wrapper">
            <table className="table ledger-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Asiento</th>
                  <th>Descripcion</th>
                  <th className="py-2 px-3 text-left text-xs font-semibold text-slate-400">Tercero</th>
                  <th className="text-right">Debito</th>
                  <th className="text-right">Credito</th>
                  <th className="text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {data.lineas.map((l, i) => {
                  const tipo = l.debito > 0 ? 'debito' : l.credito > 0 ? 'credito' : 'neutro'
                  return (
                    <tr key={i}>
                      <td className="ledger-date">{l.fecha}</td>
                      <td className="ledger-entry-number">{l.numero_asiento}</td>
                      <td className="ledger-description" title={l.descripcion}>{l.descripcion}</td>
                      <td className="ledger-third-party">{l.tercero ?? '-'}</td>
                      <td className="ledger-money tone-info">
                        {tipo === 'debito' ? (
                          <span className="flex items-center justify-end gap-1"><TrendingUp size={10} />{fmt(l.debito)}</span>
                        ) : '-'}
                      </td>
                      <td className="ledger-money tone-warning">
                        {tipo === 'credito' ? (
                          <span className="flex items-center justify-end gap-1"><TrendingDown size={10} />{fmt(l.credito)}</span>
                        ) : '-'}
                      </td>
                      <td className={`ledger-money strong ${saldoTone(l.saldo)}`}>
                        {fmt(l.saldo)}
                      </td>
                    </tr>
                  )
                })}
                {data.lineas.length === 0 && (
                  <tr>
                    <td colSpan={7} className="empty-state">
                      <Minus size={20} className="mx-auto mb-1" />
                      Sin movimientos en el periodo
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
