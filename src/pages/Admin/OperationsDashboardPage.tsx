import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Activity, Building2, Headphones, TrendingUp } from 'lucide-react'
import { adminService, type OperationsOverview } from '@/services/admin.service'

const money = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

export default function OperationsDashboardPage() {
  const [data, setData] = useState<OperationsOverview | null>(null)

  useEffect(() => {
    adminService.operationsOverview().then(setData)
  }, [])

  if (!data) return <div className="admin-card">Cargando centro de operaciones...</div>

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1>Operations Control Center</h1>
          <p className="admin-muted">Operación comercial, técnica y de seguridad de JOSARA CLOUD.</p>
        </div>
        <span className={`admin-status ${data.health.database.status}`}>DB {data.health.database.status}</span>
      </div>
      <section className="admin-metrics">
        <Metric icon={<Building2 size={18} />} label="Empresas" value={data.business.tenants_total} />
        <Metric icon={<TrendingUp size={18} />} label="MRR" value={money.format(data.business.mrr)} />
        <Metric icon={<Activity size={18} />} label="Eventos críticos" value={data.operations.critical_events} />
        <Metric icon={<Headphones size={18} />} label="Tickets abiertos" value={data.support.tickets_open} />
      </section>
      <section className="admin-grid">
        <div className="admin-card">
          <h2>Salud de plataforma</h2>
          <HealthRow label="API" value={data.health.api.status} />
          <HealthRow label="Base de datos" value={`${data.health.database.status} · ${data.health.database.latency_ms ?? '-'} ms`} />
          <HealthRow label="Cache" value={data.health.cache.status} />
          <HealthRow label="Queue" value={`${data.health.queue.status} · ${data.health.queue.pending} pendientes`} />
        </div>
        <div className="admin-card">
          <h2>Seguridad</h2>
          <p>Administradores activos: {data.security.platform_admins_active}</p>
          <p>Logins fallidos 24h: {data.security.failed_admin_logins_24h}</p>
          <p>Eventos críticos abiertos: {data.security.critical_security_events}</p>
        </div>
      </section>
      <div className="admin-card">
        <h2>Eventos recientes</h2>
        {data.recent_events.length === 0 ? (
          <p className="admin-muted">Sin eventos operativos registrados.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Severidad</th><th>Categoría</th><th>Evento</th><th>Origen</th><th>Fecha</th></tr></thead>
              <tbody>
                {data.recent_events.map(event => (
                  <tr key={event.id}>
                    <td><span className="admin-badge">{event.severity}</span></td>
                    <td>{event.category}</td>
                    <td>{event.title}</td>
                    <td>{event.source ?? 'system'}</td>
                    <td>{event.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
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

function HealthRow({ label, value }: { label: string; value: string }) {
  return <p><strong>{label}:</strong> <span className="admin-muted">{value}</span></p>
}
