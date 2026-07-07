import { useState } from 'react'
import {
  FileBadge, RefreshCcw, Loader2, AlertCircle, Info,
  ChevronDown, ChevronRight, ArrowDownToLine, ArrowUpFromLine,
} from 'lucide-react'
import { api } from '@/lib/api'
import { getTenantId } from '@/services/auth.service'
import { extractApiError } from '@/lib/errors'

const fmt = (n: number) =>
  Number(n || 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

interface Renglon {
  titulo: string
  valor: number
  bold?: boolean
}

interface CuentaDetalle {
  codigo: string
  nombre: string
  monto: number
}

interface DataRenta {
  anio: number
  fecha_inicio: string
  fecha_fin: string
  tarifa: number
  renglones: Record<string, Renglon>
  resumen: {
    ingresos_operacionales: number
    ingresos_no_operacionales: number
    total_ingresos_brutos: number
    total_ingresos_netos: number
    costo_ventas: number
    otros_costos: number
    total_costos: number
    gastos_administracion: number
    gastos_ventas: number
    gastos_no_operacionales: number
    total_deducciones: number
    renta_liquida_ordinaria: number
    renta_liquida_gravable: number
    impuesto_sobre_renta: number
    total_impuesto_cargo: number
    retenciones_practicadas: number
    saldo_a_pagar: number
    saldo_a_favor: number
  }
  detalle_por_cuenta: CuentaDetalle[]
  advertencia: string
  empresa?: { nombre: string; nit: string }
}

export default function FormularioRentaPage() {
  const [anio, setAnio] = useState(new Date().getFullYear() - 1)
  const [tarifa, setTarifa] = useState<string>('') // vacío → backend usa 35%
  const [data, setData] = useState<DataRenta | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showDetalle, setShowDetalle] = useState(false)

  const T = getTenantId()

  const cargar = async () => {
    setLoading(true); setError('')
    try {
      const params: Record<string, string | number> = { ['año']: anio }
      if (tarifa.trim() !== '') params['tarifa'] = parseFloat(tarifa)

      const res = await api.get(`/${T}/reports/formulario-110`, { params })
      setData(res.data.data)
    } catch (e: unknown) {
      setError(extractApiError(e, 'Error al cargar Formulario 110.'))
    } finally {
      setLoading(false)
    }
  }

  // Agrupaciones visuales
  const grupos: { titulo: string; tone: string; nums: number[] }[] = [
    { titulo: 'Ingresos',       tone: 'success',  nums: [32, 33, 38, 41] },
    { titulo: 'Costos',         tone: 'warning',  nums: [42, 43, 44] },
    { titulo: 'Deducciones',    tone: 'emphasis', nums: [45, 46, 48, 49] },
    { titulo: 'Renta Liquida',  tone: 'info',     nums: [50, 54] },
    { titulo: 'Liquidacion',    tone: 'accent',   nums: [57, 61, 65, 67] },
  ]

  return (
    <div className="tax-form-page page-container">
      <div className="page-header tax-form-header">
        <div className="tax-form-title-row">
        <div className="tax-form-icon">
          <FileBadge size={20} aria-hidden="true" />
        </div>
        <div>
          <h1 className="page-title">Formulario 110 - Renta y Complementario</h1>
          <p className="page-subtitle">
            Declaracion anual de personas juridicas - Ley 2277/2022, tarifa 35%
          </p>
        </div>
        </div>
      </div>

      <div className="card tax-form-toolbar">
        <div className="input-group">
          <label>Año gravable</label>
          <input
            type="number" min={2020} max={2100} value={anio}
            onChange={e => setAnio(parseInt(e.target.value || '0', 10))}
            className="input tax-form-year-input"
          />
        </div>
        <div className="input-group">
          <label>
            Tarifa <span>(opcional)</span>
          </label>
          <input
            type="text" placeholder="0.35"
            value={tarifa}
            onChange={e => setTarifa(e.target.value)}
            className="input tax-form-rate-input"
          />
          <div className="tax-form-help">Ej: 0.09 zona franca</div>
        </div>
        <button
          onClick={cargar} disabled={loading}
          className="btn btn-primary"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
          Generar
        </button>
      </div>

      {error && (
        <div className="alert alert-error tax-form-alert">
          <AlertCircle size={16} />{error}
        </div>
      )}

      {data && (
        <>
          {data.empresa?.nombre && (
            <div className="tax-form-entity">
              <div className="tax-form-entity__name">{data.empresa.nombre}</div>
              {data.empresa.nit && <div>NIT {data.empresa.nit}</div>}
              <div>
                Año gravable {data.anio} ({data.fecha_inicio} - {data.fecha_fin})
              </div>
              <div>
                Tarifa aplicada: <strong>{(data.tarifa * 100).toFixed(1)}%</strong>
              </div>
            </div>
          )}

          {/* Advertencia obligatoria */}
          <div className="tax-form-warning">
            <Info size={16} className="shrink-0 mt-0.5" />
            <div>{data.advertencia}</div>
          </div>

          {/* Renglones agrupados */}
          <div className="card tax-form-table-card">
            <div className="table-wrapper">
            <table className="table tax-form-table">
              <thead>
                <tr>
                  <th className="tax-form-row-number">Renglon</th>
                  <th className="text-left py-2">Concepto</th>
                  <th className="text-right">Valor</th>
                </tr>
              </thead>
              {grupos.map(grupo => (
                <tbody key={grupo.titulo} className="tax-form-group">
                    <tr className={`tax-form-group-row tone-${grupo.tone}`}>
                      <td colSpan={3}>
                        {grupo.titulo}
                      </td>
                    </tr>
                    {grupo.nums.map(n => {
                      const r = data.renglones[String(n)]
                      if (!r) return null
                      return (
                        <tr key={n} className={r.bold ? 'tax-form-total-line' : ''}>
                          <td className="tax-form-row-number">{n}</td>
                          <td className={r.bold ? 'tax-form-concept strong' : 'tax-form-concept'}>
                            {r.titulo}
                          </td>
                          <td className={r.bold ? 'tax-form-money strong' : 'tax-form-money'}>
                            ${fmt(r.valor)}
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              ))}
            </table>
            </div>
          </div>

          {/* Resumen final destacado */}
          <div className="tax-form-summary-grid">
            <div className="card tax-form-summary-card info">
              <div>Renta liquida gravable</div>
              <strong>${fmt(data.resumen.renta_liquida_gravable)}</strong>
            </div>
            <div className="card tax-form-summary-card accent">
              <div>Impuesto a cargo</div>
              <strong>${fmt(data.resumen.total_impuesto_cargo)}</strong>
            </div>
            <div className={`card tax-form-summary-card ${data.resumen.saldo_a_pagar > 0 ? 'danger' : 'success'}`}>
              <div className="tax-form-summary-label">
                {data.resumen.saldo_a_pagar > 0 ? <ArrowUpFromLine size={12} /> : <ArrowDownToLine size={12} />}
                {data.resumen.saldo_a_pagar > 0 ? 'Saldo a pagar' : 'Saldo a favor'}
              </div>
              <strong>
                ${fmt(data.resumen.saldo_a_pagar > 0 ? data.resumen.saldo_a_pagar : data.resumen.saldo_a_favor)}
              </strong>
            </div>
          </div>

          {/* Detalle por cuenta (auditoría) */}
          <div className="card tax-form-detail-card">
            <button
              onClick={() => setShowDetalle(s => !s)}
              className="tax-form-detail-toggle"
            >
              {showDetalle ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              Desglose por cuenta del PUC ({data.detalle_por_cuenta.length} cuentas)
              <span>Para auditoria del prellenado</span>
            </button>
            {showDetalle && (
              <div className="tax-form-detail-body">
                <table className="table tax-form-detail-table">
                  <thead>
                    <tr>
                      <th>Codigo</th>
                      <th className="text-left py-1.5">Cuenta</th>
                      <th className="text-right">Monto del año</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.detalle_por_cuenta.map(c => (
                      <tr key={c.codigo}>
                        <td className="tax-form-row-number">{c.codigo}</td>
                        <td>{c.nombre}</td>
                        <td className="tax-form-money">${fmt(c.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Renglones omitidos - guia para el contador */}
          <div className="tax-form-manual card">
            <div>Renglones del F110 que el contador debe completar manualmente:</div>
            <ul>
              <li><span>R51</span> Rentas exentas (Art. 235-2 ET)</li>
              <li><span>R52</span> Compensaciones de perdidas fiscales (Art. 147 ET)</li>
              <li><span>R53</span> Renta presuntiva (Art. 188 ET)</li>
              <li><span>R55</span> Rentas gravables especiales</li>
              <li><span>R56</span> Ganancia ocasional gravable (15%)</li>
              <li><span>R58</span> Descuentos tributarios (Arts. 254-259 ET)</li>
              <li><span>R62</span> Anticipo año anterior</li>
              <li><span>R63</span> Saldo a favor año anterior</li>
              <li><span>R66</span> Anticipo año siguiente (Art. 807 ET)</li>
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
