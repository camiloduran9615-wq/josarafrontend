import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Crown, TrendingUp, TrendingDown, Wallet, Building2,
  Users, AlertTriangle, AlertCircle, Info, Loader2,
  ArrowUpRight, ArrowDownRight, Percent, Clock, Banknote,
  CheckCircle2, BarChart3, Calculator,
  type LucideIcon,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { api } from '@/lib/api'
import { getTenantId } from '@/services/auth.service'

const fmt = (n: number) =>
  Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })

const fmtK = (n: number) => {
  const abs = Math.abs(n)
  if (abs >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`
  if (abs >= 1_000_000)     return `$${(n / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000)         return `$${(n / 1_000).toFixed(0)}K`
  return `$${fmt(n)}`
}

interface Data {
  fecha_corte: string
  periodo: { inicio_ytd: string; fin_ytd: string; dias: number }
  ytd: {
    actual:   { ingresos: number; costos: number; gastos: number; utilidad: number }
    anterior: { ingresos: number; costos: number; gastos: number; utilidad: number }
    variacion: { ingresos: number; utilidad: number }
  }
  aging_cartera: {
    corriente: number; rango_1_30: number; rango_31_60: number
    rango_61_90: number; rango_mas_90: number
    total: number; cantidad: number
    porcentajes: Record<string, number>
  }
  top_clientes: { tercero_id: string; nombre: string; documento: string; facturas: number; total: number }[]
  liquidez: {
    total: number
    detalle: { cuenta: string; nombre: string; saldo: number }[]
  }
  indicadores: { margen_bruto_pct: number; margen_neto_pct: number; dias_cartera: number }
  impuestos_pendientes: {
    iva_por_pagar: number; retefuente_por_pagar: number; reteica_por_pagar: number; total: number
  }
  alertas: { nivel: string; tipo: string; mensaje: string; cantidad: number }[]
  meta: { ms: number }
}

const COLORS_AGING = ['var(--success)', 'var(--emphasis)', 'var(--warning)', 'var(--danger)', 'color-mix(in srgb, var(--danger) 72%, var(--text-primary))']
type AgingAmountKey = 'corriente' | 'rango_1_30' | 'rango_31_60' | 'rango_61_90' | 'rango_mas_90'

const RANGOS_AGING: { key: AgingAmountKey; label: string }[] = [
  { key: 'corriente',    label: 'Corriente (sin vencer)' },
  { key: 'rango_1_30',   label: '1-30 días' },
  { key: 'rango_31_60',  label: '31-60 días' },
  { key: 'rango_61_90',  label: '61-90 días' },
  { key: 'rango_mas_90', label: '+90 días' },
]

function VariacionBadge({ pct }: { pct: number }) {
  if (pct === 0) return <span className="executive-variation neutral">0%</span>
  const Icon = pct > 0 ? ArrowUpRight : ArrowDownRight
  return (
    <span className={`executive-variation ${pct > 0 ? 'positive' : 'negative'}`}>
      <Icon size={12} />{pct > 0 ? '+' : ''}{pct.toFixed(1)}%
    </span>
  )
}

const ICON_ALERTA = {
  danger:  AlertCircle,
  warning: AlertTriangle,
  info:    Info,
}
const COLOR_ALERTA = {
  danger:  'executive-alert danger',
  warning: 'executive-alert warning',
  info:    'executive-alert info',
}

export default function DashboardEjecutivoPage() {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const cargar = () => {
    setLoading(true); setError('')
    api.get(`/${getTenantId()}/dashboard-ejecutivo`)
      .then(r => setData(r.data.data))
      .catch(e => setError(e?.response?.data?.message ?? 'Error al cargar dashboard ejecutivo'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    queueMicrotask(cargar)
  }, [])

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96 text-slate-400 gap-2">
        <Loader2 size={20} className="animate-spin" /> Cargando dashboard ejecutivo…
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="alert alert-error">
          {error || 'Sin datos'}
        </div>
      </div>
    )
  }

  const agingData = RANGOS_AGING.map((r, i) => ({
    name: r.label,
    value: data.aging_cartera[r.key],
    color: COLORS_AGING[i],
  })).filter(d => d.value > 0)

  return (
    <div className="executive-dashboard page-container">
      {/* Header */}
      <div className="page-header executive-header">
        <div className="flex items-center gap-3">
          <div className="executive-header__icon">
            <Crown size={20} aria-hidden="true" />
          </div>
          <div>
            <h1 className="page-title">Dashboard Ejecutivo</h1>
            <p className="page-subtitle">
              Corte: {data.fecha_corte} · YTD {data.periodo.dias} días
              <span className="executive-meta">({data.meta.ms}ms)</span>
            </p>
          </div>
        </div>
        <Link to="/dashboard" className="btn btn-secondary">
          Dashboard operativo
        </Link>
      </div>

      {/* Alertas */}
      {data.alertas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {data.alertas.map((a, i) => {
            const Icon = ICON_ALERTA[a.nivel as keyof typeof ICON_ALERTA] ?? Info
            const color = COLOR_ALERTA[a.nivel as keyof typeof COLOR_ALERTA] ?? COLOR_ALERTA.info
            return (
              <div key={i} className={color}>
                <Icon size={16} className="shrink-0 mt-0.5" />
                <span>{a.mensaje}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* ── KPIs YTD vs Año anterior ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
          icon={TrendingUp} tone="success"
          label="Ingresos YTD" value={data.ytd.actual.ingresos}
          comparison={data.ytd.anterior.ingresos} pct={data.ytd.variacion.ingresos}
        />
          <KpiCard
          icon={TrendingDown} tone="warning"
          label="Costos YTD" value={data.ytd.actual.costos}
          comparison={data.ytd.anterior.costos}
        />
          <KpiCard
          icon={BarChart3} tone="info"
          label={data.ytd.actual.utilidad >= 0 ? 'Utilidad YTD' : 'Pérdida YTD'}
          value={data.ytd.actual.utilidad}
          comparison={data.ytd.anterior.utilidad} pct={data.ytd.variacion.utilidad}
          colored
        />
          <KpiCard
          icon={Banknote} tone="emphasis"
          label="Liquidez (caja + bancos)" value={data.liquidez.total}
        />
      </div>

      {/* ── Indicadores financieros ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <IndicadorCard
          icon={Percent} label="Margen Bruto"
          value={`${data.indicadores.margen_bruto_pct.toFixed(1)}%`}
          subtitle="(Ingresos − Costos) / Ingresos"
          tone="success"
        />
        <IndicadorCard
          icon={Percent} label="Margen Neto"
          value={`${data.indicadores.margen_neto_pct.toFixed(1)}%`}
          subtitle="Utilidad / Ingresos"
          tone="info"
        />
        <IndicadorCard
          icon={Clock} label="Días de Cartera"
          value={`${data.indicadores.dias_cartera.toFixed(0)} días`}
          subtitle="(CxC / Ventas YTD) × días"
          tone="warning"
        />
      </div>

      {/* ── Aging de cartera + Top clientes ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Aging */}
        <div className="card executive-card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="executive-card-title">
              <Wallet size={16} className="tone-warning" /> Aging de Cartera
            </h2>
            <span className="executive-card-meta">
              {data.aging_cartera.cantidad} facturas · {fmtK(data.aging_cartera.total)}
            </span>
          </div>
          {data.aging_cartera.total === 0 ? (
            <div className="empty-state">Sin cartera pendiente</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={agingData}
                    cx="50%" cy="50%"
                    innerRadius={45} outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {agingData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v) => `$${fmt(Number(v ?? 0))}`}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {RANGOS_AGING.map((r, i) => (
                  <div key={r.key} className="flex items-center gap-2 text-xs">
                    <span className="w-3 h-3 rounded" style={{ background: COLORS_AGING[i] }} />
                    <span className="executive-row-label">{r.label}</span>
                    <span className="executive-row-muted">{data.aging_cartera.porcentajes[r.key].toFixed(1)}%</span>
                    <span className="executive-row-value">
                      ${fmt(data.aging_cartera[r.key])}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Top clientes */}
        <div className="card executive-card">
          <h2 className="executive-card-title mb-3">
            <Users size={16} className="tone-info" /> Top 5 Clientes - YTD
          </h2>
          {data.top_clientes.length === 0 ? (
            <div className="empty-state">Sin ventas en el periodo</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.top_clientes} layout="vertical" margin={{ left: 0, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'var(--chart-axis)', fontSize: 10 }} tickFormatter={v => fmtK(v)} />
                <YAxis dataKey="nombre" type="category" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={120} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => [`$${fmt(Number(v ?? 0))}`, 'Total ventas']}
                />
                <Bar dataKey="total" fill="var(--accent)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Liquidez detalle + Impuestos pendientes ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Liquidez */}
        <div className="card executive-card">
          <h2 className="executive-card-title mb-3">
            <Building2 size={16} className="tone-emphasis" /> Liquidez por cuenta
          </h2>
          {data.liquidez.detalle.length === 0 ? (
            <div className="empty-state">Sin cuentas con saldo</div>
          ) : (
            <table className="executive-table compact">
              <tbody>
                {data.liquidez.detalle.map(c => (
                  <tr key={c.cuenta}>
                    <td className="executive-account-code">{c.cuenta}</td>
                    <td>{c.nombre}</td>
                    <td className={`executive-money ${c.saldo >= 0 ? 'tone-emphasis' : 'tone-danger'}`}>
                      ${fmt(c.saldo)}
                    </td>
                  </tr>
                ))}
                <tr className="executive-total-row">
                  <td colSpan={2}>TOTAL</td>
                  <td className="executive-money tone-emphasis">${fmt(data.liquidez.total)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* Impuestos pendientes */}
        <div className="card executive-card">
          <h2 className="executive-card-title mb-3">
            <Calculator size={16} className="tone-danger" /> Impuestos Pendientes (DIAN)
          </h2>
          <div className="space-y-2">
            {[
              { label: 'IVA por pagar (2408)',           v: data.impuestos_pendientes.iva_por_pagar },
              { label: 'Retefuente practicada (2365)',   v: data.impuestos_pendientes.retefuente_por_pagar },
              { label: 'Retención ICA (2368)',           v: data.impuestos_pendientes.reteica_por_pagar },
            ].map(({ label, v }) => (
              <div key={label} className="executive-split-row">
                <span>{label}</span>
                <span className="executive-money tone-danger">${fmt(v)}</span>
              </div>
            ))}
            <div className="executive-split-row total">
              <span>TOTAL a pagar al fisco</span>
              <span className="executive-money tone-danger">
                ${fmt(data.impuestos_pendientes.total)}
              </span>
            </div>
          </div>
          <div className="executive-footnote">
            Saldos credito acumulados de las cuentas 24xx - listos para transferir.
          </div>
        </div>
      </div>

      {/* ── Comparativo YTD vs Año anterior tabla ────────────────────────── */}
      <div className="card executive-card">
        <h2 className="executive-card-title mb-3">Resultados YTD vs Año Anterior</h2>
        <table className="executive-table">
          <thead>
            <tr>
              <th>Concepto</th>
              <th className="text-right">Año Actual</th>
              <th className="text-right">Año Anterior</th>
              <th className="text-right">Variacion</th>
            </tr>
          </thead>
          <tbody>
            {([
              ['Ingresos', data.ytd.actual.ingresos, data.ytd.anterior.ingresos, data.ytd.variacion.ingresos],
              ['Costos',   data.ytd.actual.costos,   data.ytd.anterior.costos,   null],
              ['Gastos',   data.ytd.actual.gastos,   data.ytd.anterior.gastos,   null],
            ] as const).map(([label, a, ant, pct]) => (
              <tr key={label}>
                <td>{label}</td>
                <td className="executive-money">${fmt(a)}</td>
                <td className="executive-money muted">${fmt(ant)}</td>
                <td className="text-right">
                  {pct !== null ? <VariacionBadge pct={pct as number} /> : <span className="executive-row-muted">-</span>}
                </td>
              </tr>
            ))}
            <tr className="executive-total-row">
              <td>Utilidad neta</td>
              <td className={`executive-money ${data.ytd.actual.utilidad >= 0 ? 'tone-info' : 'tone-danger'}`}>
                ${fmt(data.ytd.actual.utilidad)}
              </td>
              <td className="executive-money muted">${fmt(data.ytd.anterior.utilidad)}</td>
              <td className="text-right">
                <VariacionBadge pct={data.ytd.variacion.utilidad} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer sin alertas */}
      {data.alertas.length === 0 && (
        <div className="executive-alert success">
          <CheckCircle2 size={14} /> Sin alertas operacionales. El sistema está al día.
        </div>
      )}
    </div>
  )
}

// ── Componentes auxiliares ──────────────────────────────────────────────────

function KpiCard({
  icon: Icon, tone, label, value, comparison, pct, colored,
}: {
  icon: LucideIcon; tone: 'success' | 'warning' | 'info' | 'emphasis'
  label: string; value: number; comparison?: number; pct?: number; colored?: boolean
}) {
  const negative = colored && value < 0
  return (
    <div className="card executive-kpi">
      <div className="flex items-center justify-between mb-3">
        <div className={`executive-icon tone-bg-${tone}`}>
          <Icon size={18} className={`tone-${tone}`} />
        </div>
        {pct !== undefined && <VariacionBadge pct={pct} />}
      </div>
      <p className={`executive-kpi-value ${negative ? 'tone-danger' : ''}`}>
        {fmtK(value)}
      </p>
      <p className="executive-kpi-label">{label}</p>
      {comparison !== undefined && (
        <p className="executive-kpi-comparison">vs {fmtK(comparison)} año anterior</p>
      )}
    </div>
  )
}

function IndicadorCard({
  icon: Icon, label, value, subtitle, tone,
}: {
  icon: LucideIcon; label: string; value: string; subtitle: string; tone: 'success' | 'warning' | 'info'
}) {
  return (
    <div className="card executive-indicator">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className={`tone-${tone}`} />
        <span>{label}</span>
      </div>
      <p className={`executive-indicator-value tone-${tone}`}>{value}</p>
      <p className="executive-kpi-comparison">{subtitle}</p>
    </div>
  )
}

const tooltipStyle = {
  background: 'var(--chart-tooltip-bg)',
  border: '1px solid var(--chart-tooltip-border)',
  borderRadius: 8,
  color: 'var(--chart-tooltip-fg)',
  fontSize: 12,
}
