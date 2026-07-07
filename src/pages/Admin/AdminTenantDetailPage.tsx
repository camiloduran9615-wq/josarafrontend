import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { adminService, type AdminTenantSummary } from '@/services/admin.service'

interface TenantDetailPayload {
  tenant: AdminTenantSummary
  usage: Record<string, number | boolean>
}

export default function AdminTenantDetailPage() {
  const { id } = useParams()
  const [detail, setDetail] = useState<TenantDetailPayload | null>(null)

  useEffect(() => {
    if (id) adminService.tenant(id).then(setDetail)
  }, [id])

  if (!detail) return <div className="admin-card">Cargando empresa...</div>

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1>{detail.tenant.razon_social}</h1>
          <p className="admin-muted">{detail.tenant.nit} · {detail.tenant.tenant_slug}</p>
        </div>
        <span className="admin-badge">{detail.tenant.status}</span>
      </div>
      <section className="admin-grid">
        <div className="admin-card">
          <h2>Resumen</h2>
          <p>Slug: {detail.tenant.tenant_slug}</p>
          <p>Plan: {detail.tenant.plan_actual ?? 'Sin plan'}</p>
          <p>Email: {detail.tenant.email_contacto}</p>
          <p>Último acceso: {detail.tenant.last_access_at ?? 'Sin registro'}</p>
        </div>
        <div className="admin-card">
          <h2>Consumo</h2>
          {Object.entries(detail.usage).map(([key, value]) => (
            <p key={key}>{key}: {String(value)}</p>
          ))}
        </div>
      </section>
    </>
  )
}
