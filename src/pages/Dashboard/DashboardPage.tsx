import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Link } from 'react-router-dom'
import {
  FileText, TrendingUp, TrendingDown, Wallet, ShoppingCart,
  ArrowUpRight, ArrowDownRight, Minus, BookMarked,
  BarChart2, Scale, ClipboardList,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { api } from '@/lib/api'
import { getTenantId } from '@/services/auth.service'

const fmt = (n: number) =>
  Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })

const fmtK = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`
  return `$${fmt(n)}`
}

interface KpiData {
  periodo: { inicio: string; fin: string; label: string }
  kpis: {
    facturas_mes:  { cantidad: number; total: number; variacion: number }
    cartera_cxc:   { saldo: number }
    ingresos_mes:  { total: number; gastos: number; utilidad: number }
    cobrado_mes:   { total: number }
    compras_mes:   { cantidad: number; total: number }
  }
  tendencia_ingresos: { dia: string; ingreso: number }[]
  asientos_recientes: { id: string; fecha: string; descripcion: string; tipo_comprobante: string; total_debito: number }[]
  meta: { ms: number }
}

function Variacion({ pct }: { pct: number }) {
  if (pct === 0) return <span className="dashboard-variation neutral"><Minus size={12} />0%</span>
  if (pct > 0)   return <span className="dashboard-variation success"><ArrowUpRight size={12} />+{pct}%</span>
  return              <span className="dashboard-variation danger"><ArrowDownRight size={12} />{pct}%</span>
}

function DashboardSkeleton() {
  return (
    <>
      <div className="metric-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="surface-panel-compact metric-card" aria-hidden="true">
            <div className="metric-card__top">
              <div className="skeleton" style={{ width: 36, height: 36 }} />
              <div className="skeleton" style={{ width: 70, height: 16 }} />
            </div>
            <div>
              <div className="skeleton" style={{ width: '68%', height: 28, marginBottom: 10 }} />
              <div className="skeleton" style={{ width: '86%', height: 14 }} />
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-main-grid">
        <div className="surface-panel dashboard-chart-panel" aria-hidden="true">
          <div className="dashboard-skeleton-header">
            <div>
              <div className="skeleton" style={{ width: 180, height: 18, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: 120, height: 12 }} />
            </div>
            <div className="skeleton" style={{ width: 110, height: 34 }} />
          </div>
          <div className="skeleton" style={{ width: '100%', height: 180 }} />
        </div>
        <div className="surface-panel dashboard-summary-panel" aria-hidden="true">
          <div className="skeleton" style={{ width: 140, height: 18, marginBottom: 18 }} />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ width: '100%', height: 22, marginBottom: 14 }} />
          ))}
        </div>
      </div>
    </>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [data, setData]     = useState<KpiData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/${getTenantId()}/dashboard`)
      .then(r => setData(r.data.data))
      .catch(() => {/* silencioso — mostramos skeleton */})
      .finally(() => setLoading(false))
  }, [])

  const today = new Date().toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="dashboard-page page-shell">

      <div className="page-toolbar">
        <div className="page-heading">
          <h1 className="capitalize">
            Buen día, {user?.nombre}
          </h1>
          <p className="capitalize">{today}</p>
        </div>
        <div className="page-actions">
          <Link
            to="/dashboard-ejecutivo"
            className="dashboard-executive-link"
          >
            <BarChart2 size={14} /> Vista Ejecutiva
          </Link>
          <div className="status-pill success">
            <span className="status-dot" />
            {user?.role_label}
          </div>
        </div>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <div className="metric-grid">

            <div className="surface-panel-compact metric-card">
              <div className="metric-card__top">
                <div className="metric-card__icon dashboard-icon info">
                  <FileText size={18} />
                </div>
                {data && <Variacion pct={data.kpis.facturas_mes.variacion} />}
              </div>
              <div>
                <p className="metric-card__value">{data ? fmtK(data.kpis.facturas_mes.total) : '—'}</p>
                <p className="metric-card__label">Facturado · {data?.kpis.facturas_mes.cantidad ?? '—'} facturas</p>
              </div>
            </div>

            <div className="surface-panel-compact metric-card">
              <div className="metric-card__top">
                <div className="metric-card__icon dashboard-icon warning">
                  <Wallet size={18} />
                </div>
                <span className="dashboard-chip">Acumulado</span>
              </div>
              <div>
                <p className="metric-card__value tone-warning">{data ? fmtK(data.kpis.cartera_cxc.saldo) : '—'}</p>
                <p className="metric-card__label">Cartera por cobrar</p>
              </div>
            </div>

            <div className="surface-panel-compact metric-card">
              <div className="metric-card__top">
                <div className={`metric-card__icon dashboard-icon ${data && data.kpis.ingresos_mes.utilidad >= 0 ? 'success' : 'danger'}`}>
                  {data && data.kpis.ingresos_mes.utilidad >= 0
                    ? <TrendingUp size={18} />
                    : <TrendingDown size={18} />}
                </div>
                <span className="dashboard-chip">Ingresos - Gastos</span>
              </div>
              <div>
                <p className={`metric-card__value ${data && data.kpis.ingresos_mes.utilidad >= 0 ? 'tone-success' : 'tone-danger'}`}>
                  {data ? fmtK(data.kpis.ingresos_mes.utilidad) : '—'}
                </p>
                <p className="metric-card__label">Utilidad neta del mes</p>
              </div>
            </div>

            <div className="surface-panel-compact metric-card">
              <div className="metric-card__top">
                <div className="metric-card__icon dashboard-icon emphasis">
                  <ShoppingCart size={18} />
                </div>
                <span className="dashboard-chip">{data?.kpis.compras_mes.cantidad ?? '—'} compras</span>
              </div>
              <div>
                <p className="metric-card__value tone-emphasis">{data ? fmtK(data.kpis.compras_mes.total) : '—'}</p>
                <p className="metric-card__label">Compras del mes</p>
              </div>
            </div>
          </div>

          <div className="dashboard-main-grid">

            <section className="surface-panel dashboard-chart-panel">
              <div className="section-header">
                <div>
                  <h2 className="section-title">Ingresos - últimos 15 días</h2>
                  <p className="section-subtitle">{data?.periodo.label}</p>
                </div>
                <div className="dashboard-section-total">
                  <p className="tone-success">
                    {data ? fmtK(data.kpis.ingresos_mes.total) : '—'}
                  </p>
                  <span>Total ingresos</span>
                </div>
              </div>
              <div className="dashboard-chart-body">
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={data?.tendencia_ingresos ?? []} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradIngreso" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="var(--success)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="dia"
                      tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={d => d.slice(5)}
                    />
                    <YAxis
                      tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={v => fmtK(v)}
                      width={52}
                    />
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }}
                      labelStyle={{ color: 'var(--text-muted)' }}
                      formatter={(v) => [`$${fmt(Number(v ?? 0))}`, 'Ingreso']}
                    />
                    <Area
                      type="monotone"
                      dataKey="ingreso"
                      stroke="var(--success)"
                      strokeWidth={2}
                      fill="url(#gradIngreso)"
                      dot={false}
                      activeDot={{ r: 4, fill: 'var(--success)' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="surface-panel">
              <div className="section-header">
                <div>
                  <h2 className="section-title">Resumen del mes</h2>
                  <p className="section-subtitle">Ingresos, gastos y recaudo</p>
                </div>
              </div>
              <div className="dashboard-summary-list">
              {[
                { label: 'Ingresos',    value: data?.kpis.ingresos_mes.total ?? 0,   tone: 'success' },
                { label: 'Gastos',      value: data?.kpis.ingresos_mes.gastos ?? 0,  tone: 'danger' },
                { label: 'Cobrado',     value: data?.kpis.cobrado_mes.total ?? 0,    tone: 'info' },
                { label: 'Compras',     value: data?.kpis.compras_mes.total ?? 0,    tone: 'emphasis' },
              ].map(({ label, value, tone }) => (
                <div key={label} className="dashboard-summary-row">
                  <span>{label}</span>
                  <strong className={`tone-${tone}`}>{fmtK(value)}</strong>
                </div>
              ))}
              <div className="dashboard-summary-total">
                  <span>Utilidad</span>
                  <strong className={(data?.kpis.ingresos_mes.utilidad ?? 0) >= 0 ? 'tone-success' : 'tone-danger'}>
                    {fmtK(data?.kpis.ingresos_mes.utilidad ?? 0)}
                  </strong>
              </div>
              </div>
            </section>
          </div>

          <div className="dashboard-secondary-grid">

            <section className="surface-panel">
              <div className="section-header">
                <div>
                  <h2 className="section-title">Últimos asientos aprobados</h2>
                  <p className="section-subtitle">Actividad contable reciente</p>
                </div>
                <Link to="/asientos" className="dashboard-inline-link">Ver todos</Link>
              </div>
              <div className="data-list">
                {(data?.asientos_recientes ?? []).length === 0 ? (
                  <div className="empty-state">Sin asientos registrados</div>
                ) : data?.asientos_recientes.map(a => (
                  <div key={a.id} className="data-list-item">
                    <div className="dashboard-list-icon">
                      <BookMarked size={14} />
                    </div>
                    <div className="dashboard-list-copy">
                      <p>{a.descripcion}</p>
                      <span>{a.fecha} · {a.tipo_comprobante}</span>
                    </div>
                    <strong className="dashboard-list-amount">{fmtK(a.total_debito)}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="surface-panel">
              <div className="section-header">
                <div>
                  <h2 className="section-title">Accesos rápidos</h2>
                  <p className="section-subtitle">Rutas frecuentes de operación</p>
                </div>
              </div>
              <div className="quick-actions-grid">
                {[
                  { to: '/reportes/balance-general',      icon: Scale,         label: 'Balance General',     tone: 'info' },
                  { to: '/reportes/estado-resultados',    icon: BarChart2,     label: 'Estado Resultados',   tone: 'success' },
                  { to: '/reportes/balance-comprobacion', icon: ClipboardList, label: 'Bal. Comprobación',   tone: 'emphasis' },
                  { to: '/reportes/libro-mayor',          icon: BookMarked,    label: 'Libro Mayor',         tone: 'warning' },
                  { to: '/facturas',                      icon: FileText,      label: 'Nueva Factura',       tone: 'info' },
                  { to: '/asientos/nuevo',                icon: TrendingUp,    label: 'Nuevo Asiento',       tone: 'success' },
                ].map(({ to, icon: Icon, label, tone }) => (
                  <Link
                    key={to}
                    to={to}
                    className="quick-action"
                  >
                    <div className={`dashboard-quick-icon ${tone}`}>
                      <Icon size={14} />
                    </div>
                    <span>{label}</span>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </>
      )}

      {data && (
        <p className="dashboard-generated">
          KPIs generados en {data.meta.ms}ms · {data.periodo.inicio} - {data.periodo.fin}
        </p>
      )}
    </div>
  )
}
