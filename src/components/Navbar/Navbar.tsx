import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { usePlatform } from '@/config/usePlatform'
import { useTheme } from '@/config/theme'
import {
  Shield, Settings, LogOut, ChevronDown,
  Bell, Building2, Users, Moon, Sun, Monitor,
} from 'lucide-react'
import './Navbar.css'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':         'Dashboard',
  '/terceros':          'Directorio de Terceros',
  '/puc':               'Plan Único de Cuentas',
  '/inventario':        'Inventario',
  '/facturas':          'Facturas de Venta',
  '/cotizaciones':      'Cotizaciones',
  '/remisiones':        'Remisiones',
  '/notas-debito':      'Notas Débito',
  '/documentos-ingreso':'Documentos de Ingreso',
  '/recibos-caja':      'Recibos de Caja',
  '/ajuste-cartera':    'Ajuste de Cartera',
  '/reportes/retenciones': 'Reporte de Retenciones',
  '/configuracion':     'Centro de Configuración',
  '/usuarios':          'Gestión de Usuarios',
  '/seguridad':         'Seguridad',
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const platform = usePlatform()
  const { appearance, resolvedAppearance, setAppearance } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [appearanceOpen, setAppearanceOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const appearanceRef = useRef<HTMLDivElement>(null)

  const title = PAGE_TITLES[location.pathname] ?? platform.shortName

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
      if (appearanceRef.current && !appearanceRef.current.contains(e.target as Node)) {
        setAppearanceOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const go = (path: string) => {
    setOpen(false)
    navigate(path)
  }

  const chooseAppearance = (value: 'light' | 'dark' | 'system') => {
    setAppearance(value)
    setAppearanceOpen(false)
  }

  const initials = user
    ? `${user.nombre?.charAt(0) ?? ''}${user.apellido?.charAt(0) ?? ''}`
    : '?'

  return (
    <header className="navbar">
      <div className="navbar-title">
        <h1>{title}</h1>
      </div>

      <div className="navbar-right">
        {/* Empresa activa */}
        <div className="navbar-tenant">
          <Building2 size={14} />
          <span>Mi Empresa</span>
          <span className="navbar-tenant-dot" />
        </div>

        {/* Notificaciones (placeholder) */}
        <button className="navbar-icon-btn" title="Notificaciones">
          <Bell size={18} />
        </button>

        <div className="navbar-appearance-menu" ref={appearanceRef}>
          <button
            className="navbar-icon-btn"
            title="Apariencia"
            aria-label="Apariencia"
            aria-expanded={appearanceOpen}
            onClick={() => setAppearanceOpen(v => !v)}
          >
            {resolvedAppearance === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {appearanceOpen && (
            <div className="navbar-appearance-dropdown" role="menu" aria-label="Apariencia">
              <button
                className={`navbar-appearance-option ${appearance === 'light' ? 'active' : ''}`}
                onClick={() => chooseAppearance('light')}
                type="button"
              >
                <Sun size={15} />
                <span>Clara</span>
              </button>
              <button
                className={`navbar-appearance-option ${appearance === 'dark' ? 'active' : ''}`}
                onClick={() => chooseAppearance('dark')}
                type="button"
              >
                <Moon size={15} />
                <span>Oscura</span>
              </button>
              <button
                className={`navbar-appearance-option ${appearance === 'system' ? 'active' : ''}`}
                onClick={() => chooseAppearance('system')}
                type="button"
              >
                <Monitor size={15} />
                <span>Sistema</span>
              </button>
            </div>
          )}
        </div>

        {/* Menú de usuario */}
        <div className="navbar-user-menu" ref={ref}>
          <button className="navbar-user-btn" onClick={() => setOpen(v => !v)}>
            <div className="navbar-avatar">{initials}</div>
            <div className="navbar-user-info">
              <span className="navbar-user-name">{user?.nombre_completo}</span>
              <span className="navbar-user-role">{user?.role_label}</span>
            </div>
            <ChevronDown size={14} className={`navbar-chevron ${open ? 'open' : ''}`} />
          </button>

          {open && (
            <div className="navbar-dropdown">
              <div className="navbar-dropdown-header">
                <div className="navbar-avatar lg">{initials}</div>
                <div>
                  <div className="navbar-dropdown-name">{user?.nombre_completo}</div>
                  <div className="navbar-dropdown-email">{user?.email}</div>
                </div>
              </div>

              <div className="navbar-dropdown-divider" />

              <button className="navbar-dropdown-item" onClick={() => go('/configuracion')}>
                <Settings size={15} />
                <span>Configuración</span>
              </button>

              <button className="navbar-dropdown-item" onClick={() => go('/seguridad')}>
                <Shield size={15} />
                <span>Seguridad</span>
              </button>

              {user?.can.manage_users && (
                <button className="navbar-dropdown-item" onClick={() => go('/usuarios')}>
                  <Users size={15} />
                  <span>Usuarios</span>
                </button>
              )}

              <div className="navbar-dropdown-divider" />

              <button className="navbar-dropdown-item danger" onClick={handleLogout}>
                <LogOut size={15} />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
