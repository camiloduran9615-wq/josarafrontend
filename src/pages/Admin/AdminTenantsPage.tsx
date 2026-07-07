import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye } from 'lucide-react'
import { adminService, type AdminTenantSummary, type Paginated } from '@/services/admin.service'

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Paginated<AdminTenantSummary> | null>(null)

  useEffect(() => {
    adminService.tenants().then(setTenants)
  }, [])

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1>Empresas registradas</h1>
          <p className="admin-muted">Gestión central de clientes SaaS.</p>
        </div>
      </div>
      <div className="admin-card admin-table-wrap">
        {!tenants ? <p>Cargando...</p> : tenants.data.length === 0 ? (
          <p className="admin-muted">No hay empresas registradas.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>NIT</th>
                <th>Slug</th>
                <th>Estado</th>
                <th>Plan</th>
                <th>Pago</th>
                <th>Ciudad / País</th>
                <th>Contacto</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tenants.data.map(tenant => (
                <tr key={tenant.id}>
                  <td>{tenant.razon_social}</td>
                  <td>{tenant.nit}</td>
                  <td>{tenant.tenant_slug}</td>
                  <td><span className="admin-badge">{tenant.status}</span></td>
                  <td>{tenant.plan_actual ?? 'Sin plan'}</td>
                  <td>{tenant.payment_status ?? 'Sin configurar'}</td>
                  <td>{[tenant.ciudad, tenant.country].filter(Boolean).join(' / ') || 'No registrado'}</td>
                  <td>{tenant.email_contacto}<br /><span className="admin-muted">{tenant.telefono ?? 'Sin teléfono'}</span></td>
                  <td>
                    <Link className="admin-button" to={`/admin/empresas/${tenant.id}`}>
                      <Eye size={16} />
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
