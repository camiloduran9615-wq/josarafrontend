import { useEffect, useState } from 'react'
import { adminService, type SettingsPayload } from '@/services/admin.service'

export default function AdminSettingsPage() {
  const [data, setData] = useState<SettingsPayload | null>(null)

  useEffect(() => {
    adminService.settings().then(setData)
  }, [])

  if (!data) return <div className="admin-card">Cargando configuración...</div>

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1>Configuración global</h1>
          <p className="admin-muted">Parámetros operativos centralizados y runtime de plataforma.</p>
        </div>
      </div>
      <section className="admin-grid">
        <div className="admin-card">
          <h2>Runtime</h2>
          {Object.entries(data.runtime).map(([key, value]) => <p key={key}>{key}: {String(value)}</p>)}
        </div>
        <div className="admin-card">
          <h2>Settings</h2>
          {data.settings.length === 0 ? <p className="admin-muted">Sin parámetros globales registrados.</p> : data.settings.map(setting => (
            <p key={setting.id}><strong>{setting.key}</strong> <span className="admin-muted">({setting.group})</span></p>
          ))}
        </div>
      </section>
    </>
  )
}
