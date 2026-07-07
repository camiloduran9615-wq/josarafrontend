import { useEffect, useState } from 'react'
import { adminService, type ObservabilityPayload } from '@/services/admin.service'

export default function AdminObservabilityPage() {
  const [data, setData] = useState<ObservabilityPayload | null>(null)

  useEffect(() => {
    adminService.observability().then(setData)
  }, [])

  if (!data) return <div className="admin-card">Cargando observabilidad...</div>

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1>Observabilidad</h1>
          <p className="admin-muted">Estado técnico, cola, base de datos y señales de disponibilidad.</p>
        </div>
      </div>
      <section className="admin-grid">
        <div className="admin-card">
          <h2>Runtime</h2>
          <p>API: {data.health.api.status}</p>
          <p>DB: {data.health.database.status} · {data.health.database.latency_ms ?? '-'} ms</p>
          <p>Cache: {data.health.cache.status}</p>
          <p>Queue: {data.queue.status} · {data.queue.pending} pendientes · {data.queue.failed} fallidos</p>
        </div>
        <div className="admin-card">
          <h2>Base central</h2>
          {Object.entries(data.database).map(([key, value]) => <p key={key}>{key}: {String(value)}</p>)}
        </div>
      </section>
      <div className="admin-card admin-table-wrap">
        <h2>Eventos técnicos</h2>
        {data.events.length === 0 ? <p className="admin-muted">Sin eventos técnicos.</p> : (
          <table className="admin-table">
            <thead><tr><th>Severidad</th><th>Categoría</th><th>Título</th><th>Origen</th><th>Creado</th></tr></thead>
            <tbody>
              {data.events.map(event => (
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
        )}
      </div>
    </>
  )
}
