import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { getTenantId } from '@/services/auth.service'
import { X, Save, Loader2, CheckCircle } from 'lucide-react'

interface ResolucionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  resolucion?: any
}

export default function ResolucionModal({ isOpen, onClose, onSuccess, resolucion }: ResolucionModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    prefijo: '',
    desde: 1,
    hasta: 1000,
    numero_resolucion: '',
    fecha_inicio: '',
    fecha_fin: '',
  })

  useEffect(() => {
    if (resolucion) {
      setFormData({
        nombre: resolucion.nombre,
        prefijo: resolucion.prefijo || '',
        desde: resolucion.desde,
        hasta: resolucion.hasta,
        numero_resolucion: resolucion.numero_resolucion,
        fecha_inicio: resolucion.fecha_inicio,
        fecha_fin: resolucion.fecha_fin,
      })
    } else {
      setFormData({
        nombre: '',
        prefijo: '',
        desde: 1,
        hasta: 1000,
        numero_resolucion: '',
        fecha_inicio: '',
        fecha_fin: '',
      })
    }
  }, [resolucion, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (resolucion) {
        await api.put(`/${getTenantId()}/resoluciones/${resolucion.id}`, formData)
      } else {
        await api.post(`/${getTenantId()}/resoluciones`, formData)
      }
      onSuccess()
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2 className="page-title flex items-center gap-2">
            <CheckCircle size={24} className="text-accent" />
            {resolucion ? 'Editar Resolución' : 'Nueva Resolución'}
          </h2>
          <button onClick={onClose} className="btn-icon"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="input-group">
            <label>Nombre Descriptivo</label>
            <input 
              type="text" className="input" required placeholder="Ej: Facturación Electrónica Principal"
              value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})}
            />
          </div>

          <div className="grid-cols-2">
            <div className="input-group">
              <label>Número de Resolución</label>
              <input 
                type="text" className="input" required placeholder="1876..."
                value={formData.numero_resolucion} onChange={e => setFormData({...formData, numero_resolucion: e.target.value})}
              />
            </div>
            <div className="input-group">
              <label>Prefijo</label>
              <input 
                type="text" className="input" placeholder="SETT"
                value={formData.prefijo} onChange={e => setFormData({...formData, prefijo: e.target.value})}
              />
            </div>
          </div>

          <div className="grid-cols-2">
            <div className="input-group">
              <label>Desde</label>
              <input 
                type="number" className="input" required
                value={formData.desde} onChange={e => setFormData({...formData, desde: Number(e.target.value)})}
              />
            </div>
            <div className="input-group">
              <label>Hasta</label>
              <input 
                type="number" className="input" required
                value={formData.hasta} onChange={e => setFormData({...formData, hasta: Number(e.target.value)})}
              />
            </div>
          </div>

          <div className="grid-cols-2">
            <div className="input-group">
              <label>Fecha Inicio</label>
              <input 
                type="date" className="input" required
                value={formData.fecha_inicio} onChange={e => setFormData({...formData, fecha_inicio: e.target.value})}
              />
            </div>
            <div className="input-group">
              <label>Fecha Fin</label>
              <input 
                type="date" className="input" required
                value={formData.fecha_fin} onChange={e => setFormData({...formData, fecha_fin: e.target.value})}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Loader2 size={18} className="spinner" /> : <><Save size={18} /> {resolucion ? 'Actualizar' : 'Guardar Resolución'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
