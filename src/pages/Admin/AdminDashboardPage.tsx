import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Building2, CreditCard, Layers3, TrendingUp } from 'lucide-react'
import { adminService, type AdminMetricPayload } from '@/services/admin.service'

const currency = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<AdminMetricPayload | null>(null)

  useEffect(() => {
    adminService.dashboard().then(setMetrics)
  }, [])

  if (!metrics) return <div className="admin-card">Cargando métricas...</div>

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1>Dashboard SaaS</h1>
          <p className="admin-muted">Operación global de empresas, planes y suscripciones.</p>
        </div>
      </div>
      <section className="admin-metrics">
        <Metric icon={<Building2 size={18} />} label="Empresas" value={metrics.tenants_total} />
        <Metric icon={<TrendingUp size={18} />} label="MRR" value={currency.format(metrics.mrr)} />
        <Metric icon={<Layers3 size={18} />} label="Planes activos" value={metrics.plans_active} />
        <Metric icon={<CreditCard size={18} />} label="Pagos pendientes" value={metrics.pending_payments} />
      </section>
      <section className="admin-grid">
        <div className="admin-card">
          <h2>Estado de empresas</h2>
          <p>Activas: {metrics.tenants_active}</p>
          <p>Trial: {metrics.tenants_trial}</p>
          <p>Suspendidas: {metrics.tenants_suspended}</p>
          <p>Vencidas: {metrics.tenants_expired}</p>
        </div>
        <div className="admin-card">
          <h2>Planes más usados</h2>
          {metrics.plans_usage.length === 0 ? (
            <p className="admin-muted">Sin suscripciones registradas.</p>
          ) : metrics.plans_usage.map(item => (
            <p key={item.plan_id ?? 'none'}>{item.plan?.name ?? 'Sin plan'}: {item.total}</p>
          ))}
        </div>
      </section>
    </>
  )
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="admin-card">
      <span className="admin-badge">{icon}{label}</span>
      <div className="admin-metric-value">{value}</div>
    </div>
  )
}
