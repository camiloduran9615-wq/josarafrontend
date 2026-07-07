import { useState, useEffect } from 'react'
import { ClipboardList, RefreshCcw, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api'
import { getTenantId } from '@/services/auth.service'
import { extractApiError } from '@/lib/errors'

const fmt = (n: number) =>
  Number(n || 0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

interface LineaBC {
  codigo:                string
  nombre:                string
  saldo_inicial_debito:  number
  saldo_inicial_credito: number
  movimiento_debito:     number
  movimiento_credito:    number
  saldo_final_debito:    number
  saldo_final_credito:   number
  ajuste_debito?:        number
  ajuste_credito?:       number
  saldo_ajustado_debito?:  number
  saldo_ajustado_credito?: number
}

interface DataBC {
  periodo_id:   string
  filas:        LineaBC[]
  totales:      LineaBC
  validaciones: { ecuacion_activo_pasivo_patrimonio: boolean; saldo_inicial_igual: boolean; movimientos_iguales: boolean; saldo_final_igual: boolean }
  meta: { ms: number }
}

interface Periodo { id: string; codigo: string; año_fiscal: number; mes: number }

function ColHeader({ children }: { children: React.ReactNode }) {
  return <th className="trial-balance-money-header">{children}</th>
}

export default function BalanceComprobacionPage() {
  const [periodos, setPeriodos]   = useState<Periodo[]>([])
  const [periodoId, setPeriodoId] = useState('')
  const [nivel, setNivel]         = useState(2)
  const [data, setData]   = useState<DataBC | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    api.get(`/${getTenantId()}/periodos`)
      .then(r => {
        const ps: Periodo[] = r.data.data ?? []
        setPeriodos(ps)
        if (ps.length) setPeriodoId(ps[0].id)
      })
      .catch(() => setError('No se pudieron cargar los periodos.'))
  }, [])

  const cargar = async () => {
    if (!periodoId) { setError('Selecciona un periodo.'); return }
    setLoading(true); setError('')
    try {
      const res = await api.get(`/${getTenantId()}/balance-comprobacion`, {
        params: { periodo_id: periodoId, nivel },
      })
      setData(res.data.data)
    } catch (e: unknown) {
      setError(extractApiError(e, 'Error al cargar balance de comprobacion.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="trial-balance-page page-container">
      <div className="page-header trial-balance-header">
        <div className="trial-balance-title-row">
          <div className="trial-balance-icon"><ClipboardList size={20} aria-hidden="true" /></div>
          <div>
            <h1 className="page-title">Balance de Comprobacion</h1>
            <p className="page-subtitle">12 columnas - Saldos iniciales / Movimientos / Saldos finales</p>
          </div>
        </div>
      </div>

      <div className="card trial-balance-toolbar">
        <div className="input-group">
          <label>Periodo</label>
          <select value={periodoId} onChange={e => setPeriodoId(e.target.value)}
            className="input trial-balance-period-input">
            <option value="">Seleccionar...</option>
            {periodos.map(p => (
              <option key={p.id} value={p.id}>
                {p.año_fiscal}/{String(p.mes).padStart(2, '0')} - {p.codigo}
              </option>
            ))}
          </select>
        </div>
        <div className="input-group">
          <label>Nivel PUC</label>
          <select value={nivel} onChange={e => setNivel(Number(e.target.value))}
            className="input">
            <option value={1}>Clase (1 digito)</option>
            <option value={2}>Grupo (2 digitos)</option>
            <option value={3}>Cuenta (4 digitos)</option>
            <option value={4}>Subcuenta (6 digitos)</option>
          </select>
        </div>
        <button onClick={cargar} disabled={loading}
          className="btn btn-primary">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
          Generar
        </button>
      </div>

      {error && (
        <div className="alert alert-error trial-balance-alert">
          <AlertCircle size={16} />{error}
        </div>
      )}

      {data && data.validaciones && (
        <>
          {/* Validaciones */}
          <div className="trial-balance-validation-grid">
            {Object.entries({
              'Activo = Pasivo + Patrimonio': data.validaciones.ecuacion_activo_pasivo_patrimonio,
              'Saldos iniciales iguales':     data.validaciones.saldo_inicial_igual,
              'Movimientos iguales':           data.validaciones.movimientos_iguales,
              'Saldos finales iguales':        data.validaciones.saldo_final_igual,
            }).map(([label, ok]) => (
              <div key={label} className={`trial-balance-validation ${ok ? 'success' : 'danger'}`}>
                <CheckCircle2 size={14} aria-hidden="true" />
                <span>{label}</span>
              </div>
            ))}
          </div>

          {/* Tabla */}
          <div className="card trial-balance-table-card">
            <div className="table-wrapper">
            <table className="table trial-balance-table">
              <thead>
                <tr>
                  <th>Codigo</th>
                  <th className="py-2 px-3 text-left text-xs font-semibold text-slate-400">Nombre</th>
                  <ColHeader>SI Debito</ColHeader>
                  <ColHeader>SI Credito</ColHeader>
                  <ColHeader>Mov. Debito</ColHeader>
                  <ColHeader>Mov. Credito</ColHeader>
                  <ColHeader>SF Debito</ColHeader>
                  <ColHeader>SF Credito</ColHeader>
                </tr>
              </thead>
              <tbody>
                {data.filas.map(f => (
                  <tr key={f.codigo}>
                    <td className="trial-balance-code">{f.codigo}</td>
                    <td className="trial-balance-name">{f.nombre}</td>
                    <td className="trial-balance-money">{fmt(f.saldo_inicial_debito)}</td>
                    <td className="trial-balance-money">{fmt(f.saldo_inicial_credito)}</td>
                    <td className="trial-balance-money tone-info">{fmt(f.movimiento_debito)}</td>
                    <td className="trial-balance-money tone-info">{fmt(f.movimiento_credito)}</td>
                    <td className="trial-balance-money strong">{fmt(f.saldo_final_debito)}</td>
                    <td className="trial-balance-money strong">{fmt(f.saldo_final_credito)}</td>
                  </tr>
                ))}
              </tbody>
              {data.totales && (
                <tfoot>
                  <tr>
                    <td colSpan={2}>TOTALES</td>
                    <td className="trial-balance-money strong">{fmt(data.totales.saldo_inicial_debito)}</td>
                    <td className="trial-balance-money strong">{fmt(data.totales.saldo_inicial_credito)}</td>
                    <td className="trial-balance-money strong">{fmt(data.totales.movimiento_debito)}</td>
                    <td className="trial-balance-money strong">{fmt(data.totales.movimiento_credito)}</td>
                    <td className="trial-balance-money strong">{fmt(data.totales.saldo_final_debito)}</td>
                    <td className="trial-balance-money strong">{fmt(data.totales.saldo_final_credito)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
            </div>
          </div>
          <p className="trial-balance-generated">Generado en {data.meta.ms}ms</p>
        </>
      )}
    </div>
  )
}
