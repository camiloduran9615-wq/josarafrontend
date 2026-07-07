import { useEffect, useState } from 'react'
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom'
import {
  Activity,
  Bell,
  Building2,
  CreditCard,
  Headphones,
  Gauge,
  Layers3,
  LogOut,
  ReceiptText,
  Settings,
  ShieldCheck,
} from 'lucide-react'
import { adminService, getAdminToken, type PlatformAdmin } from '@/services/admin.service'
import './Admin.css'

const nav = [
  { to: '/admin/dashboard', label: 'Control Center', icon: Gauge },
  { to: '/admin/empresas', label: 'Empresas', icon: Building2 },
  { to: '/admin/planes', label: 'Planes', icon: Layers3 },
  { to: '/admin/suscripciones', label: 'Suscripciones', icon: ReceiptText },
  { to: '/admin/pagos', label: 'Pagos', icon: CreditCard },
  { to: '/admin/observabilidad', label: 'Observabilidad', icon: Activity },
  { to: '/admin/seguridad', label: 'Seguridad', icon: ShieldCheck },
  { to: '/admin/soporte', label: 'Soporte', icon: Headphones },
  { to: '/admin/alertas', label: 'Alertas', icon: Bell },
  { to: '/admin/auditoria', label: 'Auditoría', icon: Activity },
  { to: '/admin/configuracion', label: 'Configuración', icon: Settings },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const [admin, setAdmin] = useState<PlatformAdmin | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const onUnauthorized = () => navigate('/admin/login', { replace: true })
    window.addEventListener('admin:unauthorized', onUnauthorized)

    adminService.me()
      .then(setAdmin)
      .catch(() => navigate('/admin/login', { replace: true }))
      .finally(() => setLoading(false))

    return () => window.removeEventListener('admin:unauthorized', onUnauthorized)
  }, [navigate])

  if (!getAdminToken()) return <Navigate to="/admin/login" replace />
  if (loading) return <main className="admin-login-page"><div className="admin-card">Cargando...</div></main>

  const logout = async () => {
    await adminService.logout()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <strong>JOSARA CLOUD</strong>
          <span>Operations Control Center</span>
        </div>
        <nav className="admin-nav">
          {nav.map(item => {
            const Icon = item.icon
            return (
              <NavLink key={item.to} to={item.to}>
                <Icon size={17} />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      </aside>
      <section className="admin-main">
        <header className="admin-topbar">
          <div className="admin-user">
            <ShieldCheck size={20} />
            <div>
              <strong>{admin?.name}</strong>
              <span>{admin?.role}</span>
            </div>
          </div>
          <button className="admin-button" onClick={logout} type="button">
            <LogOut size={16} />
            Salir
          </button>
        </header>
        <div className="admin-content">
          <Outlet />
        </div>
      </section>
    </div>
  )
}
