import { useState, useEffect, useMemo } from 'react'
import { X, Loader2, AlertCircle, FileX, Receipt } from 'lucide-react'
import {
  notaCreditoService,
  NC_CONCEPTS,
  type FacturaAnulable,
} from '@/services/notaCredito.service'
import { extractApiError } from '@/lib/errors'

interface Props { isOpen: boolean; onClose: () => void; onSuccess: () => void }

const fmt = (n: number) => n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

export default function NuevaNotaCreditoModal({ isOpen, onClose, onSuccess }: Props) {
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [facturas, setFacturas] = useState<FacturaAnulable[]>([])
  const [search, setSearch]     = useState('')
  const [form, setForm] = useState({
    factura_id:   '',
    concept_code: '2',  // 2 = Anulación por defecto
    description:  '',
  })

  useEffect(() => {
    if (!isOpen) return
    setForm({ factura_id: '', concept_code: '2', description: '' })
    setSearch('')
    setError('')
    notaCreditoService.facturasAnulables()
      .then(r => setFacturas(r.data || []))
      .catch(() => setFacturas([]))
  }, [isOpen])

  const facturaSeleccionada = useMemo(
    () => facturas.find(f => f.id === form.factura_id),
    [facturas, form.factura_id],
  )

  const facturasFiltradas = useMemo(() => {
    if (!search.trim()) return facturas
    const q = search.toLowerCase()
    return facturas.filter(f =>
      f.numero_completo?.toLowerCase().includes(q) ||
      f.tercero.razon_social?.toLowerCase().includes(q) ||
      f.tercero.identificacion?.includes(q),
    )
  }, [facturas, search])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.factura_id) { setError('Selecciona la factura a anular.'); return }
    if (form.description.trim().length < 5) { setError('El motivo debe tener al menos 5 caracteres.'); return }
    setLoading(true); setError('')
    try {
      const res = await notaCreditoService.create(form)
      onSuccess()
      onClose()
      // Pequeño tip: mostrar mensaje al user con el número de NC
      if (res.message) {
        // sonner toast lo dispara onSuccess() refetch; aquí solo cerramos
      }
    } catch (err) {
      setError(extractApiError(err, 'No se pudo emitir la nota crédito.'))
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '780px' }}>
        <div className="modal-header">
          <h2 className="page-title">
            <FileX size={20} style={{ display: 'inline', marginRight: 8, verticalAlign: '-3px' }} />
            Nueva Nota Crédito
          </h2>
          <button onClick={onClose} className="btn-icon"><X size={20} /></button>
        </div>

        {error && (
          <div className="alert alert-error mb-4" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Buscador + lista de facturas anulables */}
          <div className="input-group">
            <label>Factura a anular</label>
            <input
              type="text"
              className="input"
              placeholder="Busca por número, NIT o razón social..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            maxHeight: 240,
            overflowY: 'auto',
          }}>
            {facturasFiltradas.length === 0 && (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {facturas.length === 0
                  ? 'No hay facturas validadas pendientes de anulación.'
                  : 'Ninguna factura coincide con la búsqueda.'}
              </div>
            )}
            {facturasFiltradas.map(f => {
              const selected = f.id === form.factura_id
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setForm({ ...form, factura_id: f.id })}
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '10px 14px',
                    background: selected ? 'var(--accent)20' : 'transparent',
                    border: 'none',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Receipt size={13} style={{ color: 'var(--accent)' }} />
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.85rem' }}>
                        {f.numero_completo}
                      </span>
                      {f.tiene_factus ? (
                        <span style={{
                          fontSize: '0.65rem', padding: '1px 6px',
                          background: '#34d39922', color: '#34d399',
                          borderRadius: 10, fontWeight: 700,
                        }}>DIAN</span>
                      ) : (
                        <span style={{
                          fontSize: '0.65rem', padding: '1px 6px',
                          background: '#94a3b822', color: '#94a3b8',
                          borderRadius: 10, fontWeight: 700,
                        }}>LOCAL</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {f.tercero.razon_social} · {f.tercero.identificacion} · {f.fecha_emision}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 700, color: '#34d399', fontSize: '0.9rem' }}>
                    ${fmt(f.valor_total)}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Concepto + motivo */}
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 14 }}>
            <div className="input-group">
              <label>Concepto de corrección (DIAN)</label>
              <select
                className="input"
                value={form.concept_code}
                onChange={e => setForm({ ...form, concept_code: e.target.value })}
                required
              >
                {NC_CONCEPTS.map(c => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label>Motivo / descripción</label>
              <input
                type="text"
                className="input"
                placeholder="Ej: Error en precio del producto, anulación por solicitud del cliente..."
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                minLength={5}
                maxLength={500}
                required
              />
            </div>
          </div>

          {/* Vista previa contable */}
          {facturaSeleccionada && (
            <div style={{
              padding: 12,
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius)',
              fontSize: '0.78rem',
              border: '1px dashed var(--border)',
            }}>
              <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--accent-light)' }}>
                Asiento contable que se generará (reversión):
              </div>
              <div style={{ fontFamily: 'monospace', lineHeight: 1.6 }}>
                <div>DR  413505  Ventas                        <span style={{ color: 'var(--text-muted)' }}>(reversa ingreso)</span></div>
                <div>DR  240801  IVA Generado                  <span style={{ color: 'var(--text-muted)' }}>(reversa IVA por pagar)</span></div>
                <div>CR  130505  Clientes / Caja               <span style={{ color: 'var(--text-muted)' }}>${fmt(facturaSeleccionada.valor_total)}</span></div>
                <div>DR  143005  Inventario                    <span style={{ color: 'var(--text-muted)' }}>(devuelve stock)</span></div>
                <div>CR  613505  Costo de Ventas               <span style={{ color: 'var(--text-muted)' }}>(reversa costo)</span></div>
              </div>
              {!facturaSeleccionada.tiene_factus && (
                <div style={{ marginTop: 8, padding: 6, background: '#f59e0b22', borderRadius: 4, color: '#f59e0b', fontSize: '0.7rem' }}>
                  ⚠ Esta factura no tiene ID en Factus. La NC se generará en modo LOCAL (solo contable, sin envío a DIAN).
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !form.factura_id}>
              {loading ? <Loader2 size={18} className="spinner" /> : <><FileX size={16} /> Emitir Nota Crédito</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
