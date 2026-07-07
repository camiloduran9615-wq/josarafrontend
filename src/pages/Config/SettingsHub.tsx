import { useState } from 'react'
import {
  Building2, FileText, Calculator,
  Link2, Settings as SettingsIcon, Layers, ShoppingCart, Grid3X3, Percent,
} from 'lucide-react'
import ConfigPage from './ConfigPage'
import ResolucionesPage from './ResolucionesPage'
import SucursalesPage from './SucursalesPage'
import TipoComprobantesPage from './TipoComprobantesPage'
import ParametrizacionContablePage from './ParametrizacionContablePage'
import TiposDocumentoIngresoPage from './TiposDocumentoIngresoPage'
import ImpuestosPage from './ImpuestosPage'
import FactusConfigPage from './FactusConfigPage'
import CentrosCostoPage from '@/pages/CentrosCosto/CentrosCostoPage'

type Tab = 'empresa' | 'sucursales' | 'resoluciones' | 'comprobantes' | 'contabilidad' | 'tipos_compra' | 'centros_costo' | 'impuestos' | 'integracion'

export default function SettingsHub() {
  const [activeTab, setActiveTab] = useState<Tab>('empresa')

  const tabs = [
    { id: 'empresa',       label: 'Perfil Empresa',       icon: Building2 },
    { id: 'sucursales',    label: 'Sucursales',            icon: Building2 },
    { id: 'resoluciones',  label: 'Resoluciones DIAN',     icon: FileText },
    { id: 'comprobantes',  label: 'Tipos de Comprobante',  icon: Layers },
    { id: 'contabilidad',  label: 'Cuentas Maestras',      icon: Calculator },
    { id: 'tipos_compra',   label: 'Tipos de Compra',      icon: ShoppingCart },
    { id: 'centros_costo', label: 'Centros de Costo',      icon: Grid3X3 },
    { id: 'impuestos',     label: 'Impuestos',             icon: Percent },
    { id: 'integracion',   label: 'API & Factus',          icon: Link2 },
  ]

  return (
    <div className="page-container">
      <div className="page-header mb-8">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <SettingsIcon size={28} className="text-accent" />
            Centro de Configuración
          </h1>
          <p className="page-subtitle">Personaliza los parámetros legales, técnicos y contables de tu organización.</p>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Sidebar de Configuración */}
        <div className="w-64 shrink-0">
          <div className="card p-2 flex flex-col gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id 
                    ? 'bg-accent text-white shadow-lg shadow-accent/20' 
                    : 'hover:bg-surface-light text-muted hover:text-white'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contenido Dinámico */}
        <div className="flex-1 min-w-0">
          {activeTab === 'empresa' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <ConfigPage embedded />
            </div>
          )}
          
          {activeTab === 'resoluciones' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <ResolucionesPage embedded />
            </div>
          )}

          {activeTab === 'sucursales' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <SucursalesPage embedded />
            </div>
          )}

          {activeTab === 'comprobantes' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <TipoComprobantesPage embedded />
            </div>
          )}

          {activeTab === 'contabilidad' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <ParametrizacionContablePage embedded />
            </div>
          )}

          {activeTab === 'tipos_compra' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <TiposDocumentoIngresoPage embedded />
            </div>
          )}

          {activeTab === 'centros_costo' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <CentrosCostoPage embedded />
            </div>
          )}

          {activeTab === 'impuestos' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <ImpuestosPage embedded />
            </div>
          )}

          {activeTab === 'integracion' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <FactusConfigPage />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
