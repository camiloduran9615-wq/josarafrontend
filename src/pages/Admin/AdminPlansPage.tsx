import { useEffect, useState } from 'react'
import { adminService, type AdminPlan, type Paginated } from '@/services/admin.service'

const money = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Paginated<AdminPlan> | null>(null)

  useEffect(() => {
    adminService.plans().then(setPlans)
  }, [])

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1>Planes SaaS</h1>
          <p className="admin-muted">Configuración comercial y límites por plan.</p>
        </div>
      </div>
      <div className="admin-card admin-table-wrap">
        {!plans ? <p>Cargando...</p> : plans.data.length === 0 ? (
          <p className="admin-muted">No hay planes configurados.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Plan</th>
                <th>Código</th>
                <th>Mensual</th>
                <th>Anual</th>
                <th>Estado</th>
                <th>Trial</th>
                <th>Empresas</th>
              </tr>
            </thead>
            <tbody>
              {plans.data.map(plan => (
                <tr key={plan.id}>
                  <td>{plan.name}</td>
                  <td>{plan.code}</td>
                  <td>{money.format(Number(plan.monthly_price))}</td>
                  <td>{money.format(Number(plan.annual_price))}</td>
                  <td><span className="admin-badge">{plan.status}</span></td>
                  <td>{plan.trial_allowed ? `${plan.trial_days} días` : 'No'}</td>
                  <td>{plan.subscriptions_count ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
