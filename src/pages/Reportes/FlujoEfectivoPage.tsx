import { useState } from 'react'
import {
  Wallet, RefreshCcw, Loader2, AlertCircle, Download,
  TrendingUp, TrendingDown, Activity, Building2, Banknote,
  CheckCircle2, XCircle,
} from 'lucide-react'
import { api } from '@/lib/api'
import { getTenantId } from '@/services/auth.service'
import { extractApiError } from '@/lib/errors'

const fmt = (n: number) =>
  Number(n || 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

interface Movimiento {
  grupo: string
  rubro: string
  variacion: number
  flujo_caja: number
}

interface DataEFE {
  anio: number
  fecha_inicio: string
  fecha_fin: string
  operacion: {
    utilidad_neta: number
    depreciacion: number
    cambios_capital_trabajo: Movimiento[]
    total: number
  }
  inversion:    { movimientos: Movimiento[]; total: number }
  financiacion: { movimientos: Movimiento[]; total: number }
  aumento_efectivo: number
  efectivo_inicial: number
  efectivo_final_calculado: number
  efectivo_final_real: number
  diferencia_conciliacion: number
  totales_pyg: {
    ingresos: number; costos: number; gastos: number; utilidad_neta: number
  }
  empresa?: { nombre: string; nit: string }
}

function MovimientoRow({ m }: { m: Movimiento }) {
  const positivo = m.flujo_caja >= 0
  return (
    <tr>
      <td className="cash-flow-concept">
        <span>{m.grupo}</span>{m.rubro}
      </td>
      <td className="cash-flow-money muted">${fmt(m.variacion)}</td>
      <td className={`cash-flow-money ${positivo ? 'tone-success' : 'tone-danger'}`}>
        {positivo ? '+' : ''}{fmt(m.flujo_caja)}
      </td>
    </tr>
  )
}

export default function FlujoEfectivoPage() {
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [data, setData] = useState<DataEFE | null>(null)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  const T = getTenantId()

  const cargar = async () => {
    setLoading(true); setError('')
    try {
      const res = await api.get(`/${T}/reports/flujo-efectivo`, {
        params: { ['año']: anio },
      })
      setData(res.data.data)
    } catch (e: unknown) {
      setError(extractApiError(e, 'Error al cargar el flujo de efectivo.'))
    } finally {
      setLoading(false)
    }
  }

  const descargarCsv = async () => {
    setDownloading(true)
    try {
      const res = await api.get(`/${T}/reports/csv/flujo-efectivo`, {
        params: { ['año']: anio },
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `flujo-efectivo-${anio}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (e: unknown) {
      setError('Error al descargar CSV: ' + extractApiError(e, 'No se pudo descargar el CSV.'))
    } finally {
      setDownloading(false)
    }
  }

  const conciliado = data ? Math.abs(data.diferencia_conciliacion) < 1 : false

  return (
    <div className="cash-flow-page page-container">
      <div className="page-header cash-flow-header">
        <div className="cash-flow-title-row">
        <div className="cash-flow-icon">
          <Wallet size={20} aria-hidden="true" />
        </div>
        <div>
          <h1 className="page-title">Estado de Flujo de Efectivo</h1>
          <p className="page-subtitle">NIC 7 - Metodo indirecto</p>
        </div>
        </div>
      </div>

      <div className="card cash-flow-toolbar">
        <div className="input-group">
          <label>Año fiscal</label>
          <input
            type="number" min={2020} max={2100} value={anio}
            onChange={e => setAnio(parseInt(e.target.value || '0', 10))}
            className="input cash-flow-year-input"
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
          <button
            onClick={descargarCsv} disabled={downloading}
            className="btn btn-secondary cash-flow-download"
          >
            {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Descargar CSV
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-error cash-flow-alert">
          <AlertCircle size={16} />{error}
        </div>
      )}

      {data && (
        <div className="cash-flow-content">
          {data.empresa?.nombre && (
            <div className="cash-flow-entity">
              <div className="cash-flow-entity__name">{data.empresa.nombre}</div>
              {data.empresa.nit && <div>NIT {data.empresa.nit}</div>}
              <div>
                Del {data.fecha_inicio} al {data.fecha_fin}
              </div>
            </div>
          )}

          {/* Actividades de operacion */}
          <div className="card cash-flow-section">
            <h2 className="cash-flow-section-title">
              <Activity size={16} className="tone-info" /> Actividades de Operacion
            </h2>
            <table className="table cash-flow-table">
              <tbody>
                <tr>
                  <td className="cash-flow-concept">Utilidad neta del periodo</td>
                  <td colSpan={2} className="cash-flow-money">
                    ${fmt(data.operacion.utilidad_neta)}
                  </td>
                </tr>
                <tr>
                  <td className="cash-flow-concept">
                    (+) Depreciacion y amortizacion <span>(no efectivo)</span>
                  </td>
                  <td colSpan={2} className="cash-flow-money tone-success">
                    ${fmt(data.operacion.depreciacion)}
                  </td>
                </tr>
                {data.operacion.cambios_capital_trabajo.length > 0 && (
                  <tr>
                    <td colSpan={3} className="cash-flow-subheader">
                      Cambios en capital de trabajo
                    </td>
                  </tr>
                )}
                {data.operacion.cambios_capital_trabajo.map(m => (
                  <MovimientoRow key={m.grupo} m={m} />
                ))}
                <tr className="cash-flow-total-row info">
                  <td>Efectivo neto de operacion</td>
                  <td></td>
                  <td className={`cash-flow-money ${data.operacion.total >= 0 ? 'tone-info' : 'tone-danger'}`}>
                    ${fmt(data.operacion.total)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Actividades de inversion */}
          <div className="card cash-flow-section">
            <h2 className="cash-flow-section-title">
              <Building2 size={16} className="tone-warning" /> Actividades de Inversion
            </h2>
            {data.inversion.movimientos.length === 0 ? (
              <div className="empty-state">Sin movimientos de inversion en el periodo.</div>
            ) : (
              <table className="table cash-flow-table">
                <tbody>
                  {data.inversion.movimientos.map(m => (
                    <MovimientoRow key={m.grupo} m={m} />
                  ))}
                  <tr className="cash-flow-total-row warning">
                    <td>Efectivo neto de inversion</td>
                    <td></td>
                    <td className={`cash-flow-money ${data.inversion.total >= 0 ? 'tone-success' : 'tone-danger'}`}>
                      ${fmt(data.inversion.total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          {/* Actividades de financiacion */}
          <div className="card cash-flow-section">
            <h2 className="cash-flow-section-title">
              <Banknote size={16} className="tone-emphasis" /> Actividades de Financiacion
            </h2>
            {data.financiacion.movimientos.length === 0 ? (
              <div className="empty-state">Sin movimientos de financiacion en el periodo.</div>
            ) : (
              <table className="table cash-flow-table">
                <tbody>
                  {data.financiacion.movimientos.map(m => (
                    <MovimientoRow key={m.grupo} m={m} />
                  ))}
                  <tr className="cash-flow-total-row emphasis">
                    <td>Efectivo neto de financiacion</td>
                    <td></td>
                    <td className={`cash-flow-money ${data.financiacion.total >= 0 ? 'tone-success' : 'tone-danger'}`}>
                      ${fmt(data.financiacion.total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          {/* Resumen y conciliacion */}
          <div className="card cash-flow-section">
            <h2 className="cash-flow-section-title">Conciliacion de Efectivo</h2>
            <table className="table cash-flow-table">
              <tbody>
                <tr>
                  <td className="cash-flow-concept">Efectivo al inicio del periodo</td>
                  <td className="cash-flow-money">${fmt(data.efectivo_inicial)}</td>
                </tr>
                <tr>
                  <td className="cash-flow-concept with-icon">
                    {data.aumento_efectivo >= 0
                      ? <TrendingUp size={14} className="tone-success" />
                      : <TrendingDown size={14} className="tone-danger" />}
                    Aumento (disminucion) neta de efectivo
                  </td>
                  <td className={`cash-flow-money ${data.aumento_efectivo >= 0 ? 'tone-success' : 'tone-danger'}`}>
                    ${fmt(data.aumento_efectivo)}
                  </td>
                </tr>
                <tr>
                  <td className="cash-flow-concept strong">Efectivo final calculado</td>
                  <td className="cash-flow-money strong">
                    ${fmt(data.efectivo_final_calculado)}
                  </td>
                </tr>
                <tr>
                  <td className="cash-flow-concept">Efectivo final real (clase 11)</td>
                  <td className="cash-flow-money tone-info">
                    ${fmt(data.efectivo_final_real)}
                  </td>
                </tr>
                <tr className={conciliado ? 'cash-flow-reconcile success' : 'cash-flow-reconcile danger'}>
                  <td className="cash-flow-concept strong with-icon">
                    {conciliado
                      ? <CheckCircle2 size={16} />
                      : <XCircle size={16} />}
                    <span>Diferencia de conciliacion</span>
                  </td>
                  <td className="cash-flow-money strong">
                    ${fmt(data.diferencia_conciliacion)}
                  </td>
                </tr>
              </tbody>
            </table>
            {!conciliado && (
              <div className="cash-flow-reconcile-note">
                La diferencia deberia ser ~0. Revisar asientos del año o saldos de cierre.
              </div>
            )}
          </div>

          {/* PYG resumen */}
          <div className="card cash-flow-pyg-grid">
            <div>
              <span>Ingresos</span>
              <strong className="tone-success">${fmt(data.totales_pyg.ingresos)}</strong>
            </div>
            <div>
              <span>Costos</span>
              <strong className="tone-danger">${fmt(data.totales_pyg.costos)}</strong>
            </div>
            <div>
              <span>Gastos</span>
              <strong className="tone-danger">${fmt(data.totales_pyg.gastos)}</strong>
            </div>
            <div>
              <span>Utilidad neta</span>
              <strong className="tone-info">${fmt(data.totales_pyg.utilidad_neta)}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
