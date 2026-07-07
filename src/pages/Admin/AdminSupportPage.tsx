import { useEffect, useState } from 'react'
import { adminService, type SupportPayload } from '@/services/admin.service'

export default function AdminSupportPage() {
  const [data, setData] = useState<SupportPayload | null>(null)

  useEffect(() => {
    adminService.support().then(setData)
  }, [])

  if (!data) return <div className="admin-card">Cargando soporte...</div>

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1>Soporte</h1>
          <p className="admin-muted">Tickets, empresas en riesgo y operación de atención.</p>
        </div>
      </div>
      <section className="admin-metrics">
        {Object.entries(data.summary).map(([key, value]) => <div className="admin-card" key={key}><span className="admin-muted">{key}</span><div className="admin-metric-value">{value}</div></div>)}
      </section>
      <div className="admin-card admin-table-wrap">
        <h2>Empresas en riesgo</h2>
        {data.at_risk_tenants.length === 0 ? <p className="admin-muted">Sin empresas en riesgo.</p> : (
          <table className="admin-table">
            <thead><tr><th>Empresa</th><th>NIT</th><th>Estado</th><th>Pago</th><th>Contacto</th></tr></thead>
            <tbody>
              {data.at_risk_tenants.map(tenant => (
                <tr key={tenant.id}>
                  <td>{tenant.razon_social}<br /><span className="admin-muted">{tenant.tenant_slug}</span></td>
                  <td>{tenant.nit}</td>
                  <td><span className="admin-badge">{tenant.status}</span></td>
                  <td>{tenant.payment_status ?? 'Sin configurar'}</td>
                  <td>{tenant.email_contacto}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
