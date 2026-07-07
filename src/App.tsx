import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { PlatformThemeProvider } from '@/config/PlatformThemeProvider'
import { useTheme } from '@/config/theme'
import { AuthProvider } from '@/context/AuthContext'
import ProtectedLayout from '@/components/ProtectedLayout'
import LoginPage     from '@/pages/Login/LoginPage'
import RegisterPage  from '@/pages/Register/RegisterPage'
import AdminLayout from '@/pages/Admin/AdminLayout'
import AdminLoginPage from '@/pages/Admin/AdminLoginPage'
import AdminObservabilityPage from '@/pages/Admin/AdminObservabilityPage'
import AdminPlaceholderPage from '@/pages/Admin/AdminPlaceholderPage'
import AdminPlansPage from '@/pages/Admin/AdminPlansPage'
import AdminSecurityPage from '@/pages/Admin/AdminSecurityPage'
import AdminSettingsPage from '@/pages/Admin/AdminSettingsPage'
import AdminSupportPage from '@/pages/Admin/AdminSupportPage'
import AdminTenantDetailPage from '@/pages/Admin/AdminTenantDetailPage'
import AdminTenantsPage from '@/pages/Admin/AdminTenantsPage'
import OperationsDashboardPage from '@/pages/Admin/OperationsDashboardPage'
import DashboardPage from '@/pages/Dashboard/DashboardPage'
import DashboardEjecutivoPage from '@/pages/Dashboard/DashboardEjecutivoPage'
import UsersPage     from '@/pages/Users/UsersPage'
import TercerosPage  from '@/pages/Terceros/TercerosPage'
import PucPage       from '@/pages/Contabilidad/PucPage'
import FacturacionPage from '@/pages/Facturacion/FacturacionPage'
import NotasCreditoPage from '@/pages/NotasCredito/NotasCreditoPage'
import ReporteRetencionesPage from '@/pages/Facturacion/ReporteRetencionesPage'
import SettingsHub from '@/pages/Config/SettingsHub'
import InventarioPage from '@/pages/Inventario/InventarioPage'
import DocumentoIngresoPage from '@/pages/DocumentoIngreso/DocumentoIngresoPage'
import ComprobanteEgresoPage from '@/pages/ComprobanteEgreso/ComprobanteEgresoPage'
import ReciboCajaPage from '@/pages/ReciboCaja/ReciboCajaPage'
import NotaDebitoPage from '@/pages/NotaDebito/NotaDebitoPage'
import RemisionPage from '@/pages/Remision/RemisionPage'
import CotizacionPage from '@/pages/Cotizacion/CotizacionPage'
import AjusteCarteraPage from '@/pages/AjusteCartera/AjusteCarteraPage'
import SeguridadPage from '@/pages/Seguridad/SeguridadPage'
// ── EPIC-002: Ciclo Contable ──────────────────────────────────────────
import { AsientosPage }  from '@/features/asientos/pages/AsientosPage'
import { NuevoAsientoPage } from '@/features/asientos/pages/NuevoAsientoPage'
import { PeriodosPage }  from '@/features/periodos/pages/PeriodosPage'
import { AuditoriaPage } from '@/features/auditoria/pages/AuditoriaPage'
// ── Inventario Multi-Bodega ───────────────────────────────────────────
import BodegasPage from '@/pages/Inventario/BodegasPage'
import KardexPage  from '@/pages/Inventario/KardexPage'
// ── Centros de Costo ──────────────────────────────────────────────────
import CentrosCostoPage from '@/pages/CentrosCosto/CentrosCostoPage'
// ── Reportes EPIC-LMB-001 ─────────────────────────────────────────────
import BalanceGeneralPage      from '@/pages/Reportes/BalanceGeneralPage'
import EstadoResultadosPage    from '@/pages/Reportes/EstadoResultadosPage'
import BalanceComprobacionPage from '@/pages/Reportes/BalanceComprobacionPage'
import LibroMayorPage          from '@/pages/Reportes/LibroMayorPage'
import CierreAnualPage         from '@/pages/Reportes/CierreAnualPage'
import NominaPage              from '@/pages/Nomina/NominaPage'
import CrmPage                 from '@/pages/Crm/CrmPage'
import ConciliacionPage        from '@/pages/Conciliacion/ConciliacionPage'
// ── Nuevos módulos (FEAT-E/I/L/M/N + Reportes Tributarios) ───────────
import ActivosFijosPage         from '@/pages/ActivosFijos/ActivosFijosPage'
import InformacionExogenaPage   from '@/pages/Reportes/InformacionExogenaPage'
import ReportesTributariosPage  from '@/pages/Reportes/ReportesTributariosPage'
// ── Estados Financieros complementarios (FEAT-R/S/T) ─────────────────
import EstadoCambiosPatrimonioPage  from '@/pages/Reportes/EstadoCambiosPatrimonioPage'
import FlujoEfectivoPage             from '@/pages/Reportes/FlujoEfectivoPage'
import NotasEstadosFinancierosPage   from '@/pages/Reportes/NotasEstadosFinancierosPage'
import FormularioRentaPage           from '@/pages/Reportes/FormularioRentaPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60, retry: 1 },
  },
})

function AppRoutes() {
  const { resolvedAppearance } = useTheme()

  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          theme={resolvedAppearance}
          richColors
          closeButton
          toastOptions={{ duration: 4000 }}
        />
        <Routes>
          {/* Pública */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* Super Admin JOSARA CLOUD — separado del panel tenant */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<OperationsDashboardPage />} />
            <Route path="empresas" element={<AdminTenantsPage />} />
            <Route path="empresas/:id" element={<AdminTenantDetailPage />} />
            <Route path="planes" element={<AdminPlansPage />} />
            <Route path="planes/:id" element={<AdminPlansPage />} />
            <Route path="suscripciones" element={<AdminPlaceholderPage title="Suscripciones" />} />
            <Route path="pagos" element={<AdminPlaceholderPage title="Pagos" />} />
            <Route path="observabilidad" element={<AdminObservabilityPage />} />
            <Route path="seguridad" element={<AdminSecurityPage />} />
            <Route path="soporte" element={<AdminSupportPage />} />
            <Route path="alertas" element={<AdminPlaceholderPage title="Alertas" />} />
            <Route path="auditoria" element={<AdminPlaceholderPage title="Auditoría" />} />
            <Route path="configuracion" element={<AdminSettingsPage />} />
          </Route>

          {/* Protegidas */}
          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard"  element={<DashboardPage />} />
            <Route path="/dashboard-ejecutivo" element={<DashboardEjecutivoPage />} />
            <Route path="/usuarios"   element={<UsersPage />} />
            <Route path="/terceros"   element={<TercerosPage />} />
            <Route path="/puc"        element={<PucPage />} />
            <Route path="/facturas"        element={<FacturacionPage />} />
            <Route path="/notas-credito"   element={<NotasCreditoPage />} />
            <Route path="/reportes/retenciones" element={<ReporteRetencionesPage />} />
            <Route path="/configuracion" element={<SettingsHub />} />
            <Route path="/inventario" element={<InventarioPage />} />
            {/* Compras / Proveedores */}
            <Route path="/facturas-compra"      element={<DocumentoIngresoPage />} />
            <Route path="/documentos-ingreso"   element={<DocumentoIngresoPage />} />
            <Route path="/comprobantes-egreso"  element={<ComprobanteEgresoPage />} />
            <Route path="/recibos-caja"       element={<ReciboCajaPage />} />
            <Route path="/notas-debito"       element={<NotaDebitoPage />} />
            <Route path="/remisiones"         element={<RemisionPage />} />
            <Route path="/cotizaciones"       element={<CotizacionPage />} />
            <Route path="/ajuste-cartera"     element={<AjusteCarteraPage />} />
            <Route path="/seguridad"          element={<SeguridadPage />} />
            {/* ── EPIC-002: Ciclo Contable ── */}
            <Route path="/asientos"           element={<AsientosPage />} />
            <Route path="/asientos/nuevo"     element={<NuevoAsientoPage />} />
            <Route path="/periodos"           element={<PeriodosPage />} />
            <Route path="/auditoria"          element={<AuditoriaPage />} />
            {/* ── Inventario Multi-Bodega ── */}
            <Route path="/inventario/bodegas" element={<BodegasPage />} />
            <Route path="/inventario/kardex"  element={<KardexPage />} />
            {/* ── Centros de Costo ── */}
            <Route path="/centros-costo"      element={<CentrosCostoPage />} />
            {/* ── Reportes Contables ── */}
            <Route path="/reportes/balance-general"      element={<BalanceGeneralPage />} />
            <Route path="/reportes/estado-resultados"    element={<EstadoResultadosPage />} />
            <Route path="/reportes/balance-comprobacion" element={<BalanceComprobacionPage />} />
            <Route path="/reportes/libro-mayor"          element={<LibroMayorPage />} />
            <Route path="/reportes/cierre-anual"         element={<CierreAnualPage />} />
            <Route path="/nomina"                        element={<NominaPage />} />
            <Route path="/crm"                          element={<CrmPage />} />
            <Route path="/conciliacion"                 element={<ConciliacionPage />} />
            <Route path="/activos-fijos"                 element={<ActivosFijosPage />} />
            <Route path="/reportes/exogena"              element={<InformacionExogenaPage />} />
            <Route path="/reportes/tributarios"          element={<ReportesTributariosPage />} />
            <Route path="/reportes/estado-cambios-patrimonio" element={<EstadoCambiosPatrimonioPage />} />
            <Route path="/reportes/flujo-efectivo"             element={<FlujoEfectivoPage />} />
            <Route path="/reportes/notas-ef"                   element={<NotasEstadosFinancierosPage />} />
            <Route path="/reportes/formulario-110"             element={<FormularioRentaPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PlatformThemeProvider>
        <AppRoutes />
      </PlatformThemeProvider>
    </QueryClientProvider>
  )
}
