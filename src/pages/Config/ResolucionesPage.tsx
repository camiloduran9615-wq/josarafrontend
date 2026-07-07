import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { getTenantId } from '@/services/auth.service'
import { RefreshCw, Plus, CheckCircle, Edit2, Power, Lock, Shield } from 'lucide-react'
import ResolucionModal from './ResolucionModal'

export default function ResolucionesPage({ embedded = false }: { embedded?: boolean }) {
  const [resoluciones, setResoluciones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState('')
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedRes, setSelectedRes] = useState<any>(null)

  useEffect(() => {
    fetchResoluciones()
  }, [])

  const fetchResoluciones = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/${getTenantId()}/resoluciones`)
      setResoluciones(res.data.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    try {
      setSyncing(true)
      const res = await api.post(`/${getTenantId()}/resoluciones/sync`)
      setMessage(res.data.message)
      fetchResoluciones()
      setTimeout(() => setMessage(''), 5000)
    } catch (err) {
      console.error(err)
      setMessage('Error al sincronizar con Factus')
    } finally {
      setSyncing(false)
    }
  }

  const handleToggle = async (id: string) => {
    try {
      await api.delete(`/${getTenantId()}/resoluciones/${id}`)
      fetchResoluciones()
    } catch (err) {
      console.error(err)
    }
  }

  const handleEdit = (res: any) => {
    setSelectedRes(res)
    setIsModalOpen(true)
  }

  const handleNew = () => {
    setSelectedRes(null)
    setIsModalOpen(true)
  }

  return (
    <div className={embedded ? "" : "page-container"}>
      <div className="page-header">
        <div>
          {!embedded && (
            <h1 className="page-title flex items-center gap-3">
              <CheckCircle size={28} className="text-accent" />
              Resoluciones de Facturación
            </h1>
          )}
          <p className="page-subtitle">Gestiona tus resoluciones autorizadas por la DIAN para la emisión de documentos electrónicos.</p>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-secondary" onClick={handleSync} disabled={syncing}>
            <RefreshCw size={18} className={syncing ? 'spinner' : ''} /> 
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
          <button className="btn btn-primary" onClick={handleNew}>
            <Plus size={18} /> Nueva Resolución
          </button>
        </div>
      </div>

      {message && (
        <div className={`alert ${message.includes('Error') ? 'alert-error' : 'alert-success'} mb-6`}>
          {message}
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre / Resolución</th>
              <th>Prefijo</th>
              <th>Rango</th>
              <th>Vencimiento</th>
              <th className="text-center">Estado</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-10"><span className="spinner" /></td></tr>
            ) : resoluciones.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-muted">No hay resoluciones registradas.</td></tr>
            ) : resoluciones.map(r => {
              const esDeFactus = r.factus_id != null
              return (
                <tr key={r.id} className={!r.activa ? 'opacity-50' : ''}>
                  <td>
                    <div className="font-semibold flex items-center gap-2">
                      {r.nombre}
                      {esDeFactus && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide"
                          style={{
                            background: 'color-mix(in srgb, #3b82f6 18%, transparent)',
                            color: '#93c5fd',
                            border: '1px solid color-mix(in srgb, #3b82f6 35%, transparent)',
                          }}
                          title="Sincronizada desde la DIAN vía Factus — no editable"
                        >
                          <Shield size={10} /> DIAN
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted">Res: {r.numero_resolucion}</div>
                  </td>
                  <td className="font-mono">{r.prefijo || '-'}</td>
                  <td>{r.desde} - {r.hasta}</td>
                  <td>
                    <div className={new Date(r.fecha_fin) < new Date() ? 'text-danger font-bold' : ''}>
                      {r.fecha_fin}
                    </div>
                  </td>
                  <td className="text-center">
                    <span className={`badge ${r.activa ? 'badge-success' : 'badge-danger'}`}>
                      {r.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-2">
                      {esDeFactus ? (
                        <button
                          className="btn-icon opacity-40 cursor-not-allowed"
                          disabled
                          title="Resolución protegida — sincronizada con DIAN/Factus. No editable localmente."
                        >
                          <Lock size={14} />
                        </button>
                      ) : (
                        <button className="btn-icon" onClick={() => handleEdit(r)} title="Editar">
                          <Edit2 size={14} />
                        </button>
                      )}
                      <button
                        className={`btn-icon ${r.activa ? 'text-danger' : 'text-success'}`}
                        onClick={() => handleToggle(r.id)}
                        title={r.activa ? 'Inactivar (uso local)' : 'Activar (uso local)'}
                      >
                        <Power size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <ResolucionModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchResoluciones}
        resolucion={selectedRes}
      />
    </div>
  )
}
