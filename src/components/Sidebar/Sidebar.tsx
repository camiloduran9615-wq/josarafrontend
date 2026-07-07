import { NavLink } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import PlatformBrand from '@/components/PlatformBrand/PlatformBrand'
import {
  LayoutDashboard, Users, FileText,
  BookOpen, Package, ChevronRight, Scissors,
  Wallet, TrendingUp, TrendingDown, Truck, ClipboardList, Sliders,
  Warehouse, BarChart2, ShoppingCart, Send, BookMarked,
  PieChart, Lock, Scale, Activity, CalendarOff, UserCheck, Target, Landmark,
  Calculator, Wallet as WalletIcon, BookText, FileBadge, Crown,
} from 'lucide-react'
import './Sidebar.css'

interface NavItem {
  to:      string
  icon:    React.ElementType
  label:   string
  section: string
}

const navItems: NavItem[] = [
  // ── General ──────────────────────────────────────────────────────────────
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',       section: 'general' },
  { to: '/dashboard-ejecutivo', icon: Crown,  label: 'Dashboard Ejecutivo', section: 'general' },
  { to: '/terceros',  icon: Users,           label: 'Terceros',        section: 'general' },
  { to: '/puc',       icon: BookOpen,        label: 'Plan de Cuentas', section: 'general' },

  // ── Inventario ────────────────────────────────────────────────────────────
  { to: '/inventario',         icon: Package,   label: 'Productos',   section: 'inventario' },
  { to: '/inventario/bodegas', icon: Warehouse, label: 'Bodegas',     section: 'inventario' },
  { to: '/inventario/kardex',  icon: BarChart2, label: 'Kardex',      section: 'inventario' },

  // ── Ventas (Clientes) ─────────────────────────────────────────────────────
  { to: '/facturas',              icon: FileText,      label: 'Facturas de Venta',  section: 'ventas' },
  { to: '/cotizaciones',          icon: ClipboardList, label: 'Cotizaciones',       section: 'ventas' },
  { to: '/remisiones',            icon: Truck,         label: 'Remisiones',         section: 'ventas' },
  { to: '/notas-debito',          icon: TrendingUp,    label: 'Notas Débito',       section: 'ventas' },
  { to: '/notas-credito',         icon: TrendingDown,  label: 'Notas Crédito',      section: 'ventas' },
  { to: '/recibos-caja',          icon: Wallet,        label: 'Recibos de Caja',    section: 'ventas' },

  // ── Compras (Proveedores) ─────────────────────────────────────────────────
  { to: '/facturas-compra',       icon: ShoppingCart, label: 'Facturas de Compra', section: 'compras' },
  { to: '/comprobantes-egreso',   icon: Send,         label: 'Comprobantes Egreso', section: 'compras' },
  { to: '/ajuste-cartera',        icon: Sliders,      label: 'Ajuste de Cartera',  section: 'compras' },

  // ── Contabilidad ──────────────────────────────────────────────────────────
  { to: '/asientos',     icon: BookMarked, label: 'Asientos',             section: 'contabilidad' },
  { to: '/periodos',     icon: PieChart,   label: 'Períodos Contables',   section: 'contabilidad' },
  { to: '/auditoria',    icon: Lock,       label: 'Auditoría',            section: 'contabilidad' },
  { to: '/conciliacion', icon: Landmark,   label: 'Conciliación Bancaria',section: 'contabilidad' },

  // ── Nómina ────────────────────────────────────────────────────────────────
  { to: '/nomina', icon: UserCheck, label: 'Nómina Electrónica', section: 'nomina' },
  // ── CRM ───────────────────────────────────────────────────────────────────
  { to: '/crm', icon: Target, label: 'CRM — Pipeline', section: 'crm' },

  // ── Reportes ──────────────────────────────────────────────────────────────
  { to: '/reportes/balance-general',      icon: Scale,         label: 'Balance General',      section: 'reportes' },
  { to: '/reportes/estado-resultados',    icon: Activity,      label: 'Estado Resultados',    section: 'reportes' },
  { to: '/reportes/estado-cambios-patrimonio', icon: Landmark, label: 'Cambios Patrimonio',   section: 'reportes' },
  { to: '/reportes/flujo-efectivo',       icon: WalletIcon,    label: 'Flujo de Efectivo',    section: 'reportes' },
  { to: '/reportes/notas-ef',             icon: BookText,      label: 'Notas Est. Fin.',      section: 'reportes' },
  { to: '/reportes/balance-comprobacion', icon: ClipboardList, label: 'Bal. Comprobación',    section: 'reportes' },
  { to: '/reportes/libro-mayor',          icon: BookOpen,      label: 'Libro Mayor',          section: 'reportes' },
  { to: '/reportes/retenciones',          icon: Scissors,      label: 'Rep. Retenciones',     section: 'reportes' },
  { to: '/reportes/tributarios',          icon: Calculator,    label: 'Reportes Tributarios', section: 'reportes' },
  { to: '/reportes/formulario-110',       icon: FileBadge,     label: 'F110 Renta Anual',     section: 'reportes' },
  { to: '/reportes/exogena',              icon: FileText,      label: 'Información Exógena',  section: 'reportes' },
  { to: '/activos-fijos',                 icon: Package,       label: 'Activos Fijos',        section: 'reportes' },
  { to: '/reportes/cierre-anual',         icon: CalendarOff,   label: 'Cierre Anual',         section: 'reportes' },
]

const SECTIONS = [
  { key: 'general',       label: 'General' },
  { key: 'inventario',    label: 'Inventario' },
  { key: 'ventas',        label: 'Ventas — Clientes' },
  { key: 'compras',       label: 'Compras — Proveedores' },
  { key: 'contabilidad',  label: 'Contabilidad' },
  { key: 'nomina',        label: 'Nómina' },
  { key: 'crm',           label: 'CRM' },
  { key: 'reportes',      label: 'Reportes' },
]

export default function Sidebar() {
  const { user } = useAuth()

  return (
    <aside className="sidebar">
      {/* Logo / marca de plataforma (single source of truth) */}
      <div className="sidebar-logo">
        <PlatformBrand variant="inline" markSize={36} />
      </div>

      {/* Empresa activa */}
      <div className="sidebar-tenant">
        <div className="tenant-dot" />
        <div className="tenant-info">
          <div className="tenant-name">Mi Empresa S.A.S</div>
          <div className="tenant-role">{user?.role_label}</div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="sidebar-nav">
        {SECTIONS.map((section, idx) => (
          <div key={section.key}>
            <p className="sidebar-section-label" style={{ marginTop: idx === 0 ? 0 : 16 }}>
              {section.label}
            </p>
            {navItems
              .filter(i => i.section === section.key)
              .map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                  <ChevronRight size={14} className="sidebar-chevron" />
                </NavLink>
              ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}
