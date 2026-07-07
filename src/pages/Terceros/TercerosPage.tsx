import { useState, useEffect } from 'react'
import { tercerosService, type Tercero } from '@/services/terceros.service'
import { Plus, Search, Building2, User, Edit2, FileCheck } from 'lucide-react'
import TerceroModal from './TerceroModal'
import CertificadoModal from '../Facturacion/CertificadoModal'

export default function TercerosPage() {
  const [terceros, setTerceros] = useState<Tercero[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTercero, setSelectedTercero] = useState<Tercero | null>(null)
  
  // Certificado State
  const [isCertOpen, setIsCertOpen] = useState(false)
  const [terceroForCert, setTerceroForCert] = useState<{id: string, nombre: string} | null>(null)

  const fetchTerceros = async () => {
    try {
      setLoading(true)
      const res = await tercerosService.getAll()
      setTerceros(res.data || [])
    } catch (err) {
      setError('Error al cargar terceros')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTerceros()
  }, [])

  const handleEdit = (tercero: Tercero) => {
    setSelectedTercero(tercero)
    setIsModalOpen(true)
  }

  const handleCert = (tercero: Tercero) => {
    setTerceroForCert({ id: tercero.id, nombre: tercero.razon_social })
    setIsCertOpen(true)
  }

  const handleNew = () => {
    setSelectedTercero(null)
    setIsModalOpen(true)
  }

  const filtered = terceros.filter(t => 
    t.identificacion.includes(search) ||
    (t.razon_social?.toLowerCase() || '').includes(search.toLowerCase())
  )

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Directorio de Terceros</h1>
          <p className="page-subtitle">Gestiona tus clientes para facturación electrónica, proveedores y empleados.</p>
        </div>
        <button className="btn btn-primary" onClick={handleNew}>
          <Plus size={18} />
          Nuevo Tercero
        </button>
      </div>

      <div className="card mb-4" style={{ padding: '20px' }}>
        <div className="input-group" style={{ maxWidth: '400px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="input" 
              style={{ paddingLeft: '40px' }}
              placeholder="Buscar por identificación o nombre..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error mb-4">{error}</div>}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="spinner-center">
            <span className="spinner" style={{ width: '32px', height: '32px' }} />
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Identificación</th>
                  <th>Nombre / Razón Social</th>
                  <th>Roles</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                        {t.organizacion_juridica_id === '1' ? <Building2 size={16} /> : <User size={16} />}
                        {t.organizacion_juridica_id === '1' ? 'Jurídica' : 'Natural'}
                      </div>
                    </td>
                    <td className="font-semibold">
                      {t.identificacion}{t.dv ? `-${t.dv}` : ''}
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>DOC: {t.identificacion_documento_id}</div>
                    </td>
                    <td>
                      {t.razon_social}
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t.email}</div>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        {t.es_cliente && <span className="badge badge-success">Cliente</span>}
                        {t.es_proveedor && <span className="badge badge-info">Prov</span>}
                        {t.es_empleado && <span className="badge badge-muted">Emp</span>}
                      </div>
                    </td>
                    <td>
                      {t.activo 
                        ? <span className="badge badge-success">Activo</span>
                        : <span className="badge badge-danger">Inactivo</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex justify-end gap-2">
                        <button className="btn-icon" onClick={() => handleCert(t)} title="Certificado Retención">
                          <FileCheck size={14} className="text-accent" />
                        </button>
                        <button className="btn-icon" onClick={() => handleEdit(t)} title="Editar">
                          <Edit2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No se encontraron terceros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TerceroModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchTerceros}
        tercero={selectedTercero}
      />

      <CertificadoModal 
        isOpen={isCertOpen}
        onClose={() => setIsCertOpen(false)}
        terceroId={terceroForCert?.id || ''}
        terceroNombre={terceroForCert?.nombre || ''}
      />
    </div>
  )
}
