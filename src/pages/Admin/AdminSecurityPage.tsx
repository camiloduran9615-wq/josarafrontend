import { useEffect, useState } from 'react'
import { adminService, type SecurityPayload } from '@/services/admin.service'

export default function AdminSecurityPage() {
  const [data, setData] = useState<SecurityPayload | null>(null)

  useEffect(() => {
    adminService.security().then(setData)
  }, [])

  if (!data) return <div className="admin-card">Cargando seguridad...</div>

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1>Seguridad</h1>
          <p className="admin-muted">Identidades globales, auditoría administrativa y eventos críticos.</p>
        </div>
      </div>
      <section className="admin-metrics">
        {Object.entries(data.summary).map(([key, value]) => <div className="admin-card" key={key}><span className="admin-muted">{key}</span><div className="admin-metric-value">{value}</div></div>)}
      </section>
      <div className="admin-card admin-table-wrap">
        <h2>Administradores globales</h2>
        <table className="admin-table">
          <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th>Último login</th></tr></thead>
          <tbody>
            {data.admins.map(admin => (
              <tr key={admin.id}>
                <td>{admin.name}</td>
                <td>{admin.email}</td>
                <td><span className="admin-badge">{admin.role}</span></td>
                <td>{admin.active ? 'Activo' : 'Inactivo'}</td>
                <td>{admin.last_login_at ?? 'Sin registro'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
