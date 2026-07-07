import { useState } from 'react'
import { X, AlertTriangle, Loader2 } from 'lucide-react'
import { facturasService, type Factura } from '@/services/facturas.service'
import { getAxiosErrorData } from '@/lib/errors'

interface AnularFacturaModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  factura: Factura | null
}

const CONCEPTS = [
  { id: '2', name: 'Anulación de factura electrónica' },
  { id: '1', name: 'Devolución parcial de los bienes o aceptación parcial del servicio' },
  { id: '3', name: 'Rebaja o descuento parcial o total' },
  { id: '4', name: 'Ajuste de precio' },
]

export default function AnularFacturaModal({ isOpen, onClose, onSuccess, factura }: AnularFacturaModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    concept_code: '2',
    description: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!factura) return

    setLoading(true)
    setError('')

    try {
      await facturasService.createCreditNote({
        factura_id: factura.id,
        concept_code: formData.concept_code,
        description: formData.description
      })
      onSuccess()
      onClose()
    } catch (err) {
      const data = getAxiosErrorData(err)?.data
      let msg = data?.message || 'Error al anular la factura'
      const errors = data?.errors as Record<string, unknown> | undefined
      if (errors && typeof errors === 'object') {
        const detail = Object.values(errors).flat().join(' | ')
        if (detail) msg += ': ' + detail
      }
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !factura) return null

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <div className="flex items-center gap-2 text-danger">
            <AlertTriangle size={20} />
            <h2 className="page-title" style={{ margin: 0 }}>Anular Factura</h2>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X size={20} />
          </button>
        </div>

        <div className="alert alert-warning mb-4">
          Estás a punto de anular la factura <strong>{factura.numero_completo}</strong>. Esta acción emitirá una Nota Crédito ante la DIAN y no se puede deshacer.
        </div>

        {error && <div className="alert alert-error mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="input-group">
            <label>Concepto de Anulación</label>
            <select 
              className="input"
              value={formData.concept_code}
              onChange={e => setFormData({ ...formData, concept_code: e.target.value })}
              required
            >
              {CONCEPTS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="input-group">
            <label>Descripción / Motivo</label>
            <textarea 
              className="input" 
              style={{ minHeight: '100px', resize: 'vertical' }}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Explique el motivo de la anulación..."
              required
            />
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-danger" disabled={loading}>
              {loading ? <Loader2 size={18} className="spinner" /> : 'Confirmar Anulación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
