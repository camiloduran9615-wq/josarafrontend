import { useState, useEffect } from 'react'
import { facturasService, type Factura } from '@/services/facturas.service'
import { Plus, FileText, RefreshCcw, Search, Trash2, Send, RotateCcw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import NuevaFacturaModal from './NuevaFacturaModal'
import AnularFacturaModal from './AnularFacturaModal'
import { getAxiosErrorData } from '@/lib/errors'

export default function FacturacionPage() {
  const [facturas, setFacturas]           = useState<Factura[]>([])
  const [loading, setLoading]             = useState(true)
  const [isModalOpen, setIsModalOpen]     = useState(false)
  const [search, setSearch]               = useState('')

  // Anulación
  const [isAnularModalOpen, setIsAnularModalOpen] = useState(false)
  const [facturaToAnular, setFacturaToAnular]     = useState<Factura | null>(null)

  // Envío a DIAN
  const [enviando, setEnviando] = useState<string | null>(null)   // id de la factura en proceso
  const [envioError, setEnvioError] = useState<{ id: string; msg: string } | null>(null)
  // Prompt de fecha de vencimiento cuando factura Crédito no tiene payment_due_date
  const [dueDatePrompt, setDueDatePrompt] = useState<{ factura: Factura; date: string } | null>(null)

  const fetchFacturas = async () => {
    try {
      setLoading(true)
      const res = await facturasService.getAll()
      setFacturas(res.data || [])
    } catch (err) {
      console.error('Error fetching facturas:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchFacturas() }, [])

  const handleAnular = (f: Factura) => {
    setFacturaToAnular(f)
    setIsAnularModalOpen(true)
  }

  const handleEnviar = async (f: Factura, overrideDueDate?: string) => {
    // Si es Crédito y no tiene fecha de vencimiento → pedir al usuario antes de enviar
    if (f.payment_form === '2' && !f.payment_due_date && !overrideDueDate) {
      const d = new Date(); d.setDate(d.getDate() + 1)
      setDueDatePrompt({ factura: f, date: d.toISOString().split('T')[0] })
      return
    }

    setEnviando(f.id)
    setEnvioError(null)
    setDueDatePrompt(null)
    try {
      const body = overrideDueDate ? { payment_due_date: overrideDueDate } : undefined
      await facturasService.enviar(f.id, body)
      await fetchFacturas()
    } catch (err) {
      const data = getAxiosErrorData(err)?.data as { message?: string; errors?: unknown; body?: { errors?: unknown } } | undefined
      // Factus devuelve errores de validación en data.errors (objeto) o data.body.errors (array)
      let msg = data?.message || 'Error al enviar a DIAN'
      const errors = data?.errors || data?.body?.errors
      if (errors) {
        if (Array.isArray(errors)) {
          msg += ': ' + errors.join(' | ')
        } else if (typeof errors === 'object') {
          msg += ': ' + Object.values(errors).flat().join(' | ')
        }
      }
      setEnvioError({ id: f.id, msg })
    } finally {
      setEnviando(null)
    }
  }

  const filtered = facturas.filter(f =>
    (f.numero_completo || '').toLowerCase().includes(search.toLowerCase()) ||
    f.tercero.razon_social.toLowerCase().includes(search.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'validado': return (
        <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <CheckCircle size={11} /> Validado DIAN
        </span>
      )
      case 'error': return (
        <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <AlertCircle size={11} /> Error
        </span>
      )
      case 'anulado': return <span className="badge badge-muted">Anulado</span>
      default: return <span className="badge badge-warning">Borrador</span>
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Facturación Electrónica</h1>
          <p className="page-subtitle">Gestiona y emite tus facturas directamente a la DIAN.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={fetchFacturas} disabled={loading}>
            <RefreshCcw size={18} className={loading ? 'spinner' : ''} />
          </button>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> Nueva Factura
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div className="card mb-6">
        <div className="input-group" style={{ maxWidth: 400 }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="text" className="input" style={{ paddingLeft: 40 }}
              placeholder="Buscar por número o cliente..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading && facturas.length === 0 ? (
          <div className="spinner-center">
            <span className="spinner" style={{ width: 32, height: 32 }} />
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Número</th>
                  <th>Cliente</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(f => {
                  const isEnviando = enviando === f.id
                  const hasError   = envioError?.id === f.id
                  return (
                    <tr key={f.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {new Date(f.created_at).toLocaleDateString('es-CO')}
                      </td>
                      <td>
                        <span className="font-semibold">
                          {f.numero_completo || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin número</span>}
                        </span>
                        {f.cufe && (
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            CUFE: {f.cufe}
                          </div>
                        )}
                      </td>
                      <td>
                        <div>{f.tercero.razon_social}</div>
                        <div className="text-xs text-muted">{f.tercero.identificacion}</div>
                      </td>
                      <td className="font-semibold">
                        ${Number(f.valor_total).toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                      </td>
                      <td>
                        {getStatusBadge(f.estado)}
                        {hasError && (
                          <div style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: 4, maxWidth: 200 }}>
                            {envioError.msg}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="flex justify-end gap-2" style={{ flexWrap: 'nowrap' }}>

                          {/* Borrador o Error → Enviar / Reintentar */}
                          {(f.estado === 'borrador' || f.estado === 'error') && (
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => handleEnviar(f)}
                              disabled={isEnviando}
                              title={f.estado === 'error' ? 'Reintentar envío a DIAN' : 'Enviar a DIAN'}
                              style={{ gap: 6 }}
                            >
                              {isEnviando
                                ? <><Loader2 size={13} className="spinner" /> Enviando...</>
                                : f.estado === 'error'
                                  ? <><RotateCcw size={13} /> Reintentar</>
                                  : <><Send size={13} /> Enviar a DIAN</>
                              }
                            </button>
                          )}

                          {/* Validado → Ver PDF en DIAN */}
                          {f.estado === 'validado' && f.public_url && (
                            <a href={f.public_url} target="_blank" rel="noreferrer"
                              className="btn btn-sm btn-secondary" title="Ver PDF en portal DIAN">
                              <FileText size={13} /> Ver PDF
                            </a>
                          )}

                          {/* Validado → Anular */}
                          {f.estado === 'validado' && (
                            <button className="btn btn-sm btn-secondary"
                              style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
                              onClick={() => handleAnular(f)} title="Anular (Nota Crédito)">
                              <Trash2 size={13} /> Anular
                            </button>
                          )}

                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                      No hay facturas emitidas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <NuevaFacturaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchFacturas}
      />

      <AnularFacturaModal
        isOpen={isAnularModalOpen}
        onClose={() => setIsAnularModalOpen(false)}
        onSuccess={fetchFacturas}
        factura={facturaToAnular}
      />

      {/* Mini-modal: fecha de vencimiento faltante en factura a crédito */}
      {dueDatePrompt && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-card)',
            padding: 28, width: 380, display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>Fecha de vencimiento requerida</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              Esta factura es a <strong>Crédito</strong>. Factus exige la fecha de vencimiento para
              poder validarla ante la DIAN.
            </p>
            <div className="input-group" style={{ margin: 0 }}>
              <label>Fecha de vencimiento *</label>
              <input
                type="date"
                className="input"
                value={dueDatePrompt.date}
                min={(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0] })()}
                onChange={e => setDueDatePrompt(prev => prev ? { ...prev, date: e.target.value } : null)}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setDueDatePrompt(null)}>Cancelar</button>
              <button
                className="btn btn-primary"
                disabled={!dueDatePrompt.date}
                onClick={() => handleEnviar(dueDatePrompt.factura, dueDatePrompt.date)}
              >
                <Send size={14} /> Enviar a DIAN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
