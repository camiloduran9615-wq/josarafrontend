import { useState, useEffect } from 'react'
import {
  Plus, X, Edit2, Power, FileText, AlertTriangle,
  RefreshCw, ChevronDown, ChevronRight, Check,
} from 'lucide-react'
import { tipoComprobantesService, type TipoComprobante } from '@/services/tipoComprobantes.service'
import { resolucionesService, type Resolucion } from '@/services/resoluciones.service'
import { getAxiosErrorData } from '@/lib/errors'

const TIPOS_DOC = [
  { value: 'FV', label: 'Factura de Venta',       color: '#6366f1' },
  { value: 'DC', label: 'Doc. Equivalente',        color: '#10b981' },
  { value: 'NC', label: 'Nota Crédito',            color: '#f59e0b' },
  { value: 'ND', label: 'Nota Débito',             color: '#ef4444' },
]

const emptyForm = {
  activo:                  true,
  tipo_documento:          'FV' as TipoComprobante['tipo_documento'],
  codigo:                  '',
  nombre:                  '',
  resolucion_id:           '',
  prefijo_override:        '',
  consecutivo_actual:      1,
  habilitar_rete_iva:      false,
  habilitar_rete_ica:      false,
  habilitar_autorretencion:false,
  titulo_pdf:              '',
  observaciones_default:   '',
}

// ─── Section wrapper ────────────────────────────────────────────────────────
function Section({
  title, open, onToggle, children,
}: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'var(--bg-surface)',
          borderRadius: open ? `var(--radius-lg) var(--radius-lg) 0 0` : 'var(--radius-lg)',
          border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
          color: 'var(--text-primary)', textAlign: 'left',
        }}
      >
        {title}
        {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
      </button>
      {open && (
        <div style={{
          padding: '16px', display: 'flex', flexDirection: 'column', gap: 14,
          background: 'var(--bg-card)',
          borderRadius: `0 0 var(--radius-lg) var(--radius-lg)`,
          borderTop: '1px solid var(--border)',
        }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Toggle switch ───────────────────────────────────────────────────────────
function Toggle({ label, hint, checked, onChange }: {
  label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div>
        <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{label}</div>
        {hint && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{hint}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        style={{
          width: 42, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
          background: checked ? 'var(--accent)' : 'var(--border)',
          position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        }}
      >
        <span style={{
          position: 'absolute', top: 3, left: checked ? 21 : 3,
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      </button>
    </div>
  )
}

// ─── Modal ───────────────────────────────────────────────────────────────────
interface ModalProps {
  item: TipoComprobante | null
  onClose: () => void
  onSave: () => void
}

function ComprobanteModal({ item, onClose, onSave }: ModalProps) {
  const [form, setForm] = useState({ ...emptyForm })
  const [resoluciones, setResoluciones] = useState<Resolucion[]>([])
  const [syncing, setSyncing] = useState(false)
  const [loadingRes, setLoadingRes] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [sections, setSections] = useState({
    principal:    true,
    resolucion:   true,
    numeracion:   true,
    retenciones:  false,
    visualizacion:false,
  })

  const toggleSection = (k: keyof typeof sections) =>
    setSections(s => ({ ...s, [k]: !s[k] }))

  const set = (patch: Partial<typeof emptyForm>) => setForm(p => ({ ...p, ...patch }))

  // Carga resoluciones — sincroniza con Factus primero
  const loadResoluciones = async (showSync = false) => {
    if (showSync) setSyncing(true)
    else setLoadingRes(true)
    try {
      await resolucionesService.syncFromFactus().catch(() => {})
      const ress = await resolucionesService.getAll()
      setResoluciones(ress.filter(r => r.activa))
    } finally {
      setSyncing(false)
      setLoadingRes(false)
    }
  }

  useEffect(() => { loadResoluciones() }, [])

  useEffect(() => {
    if (item) {
      setForm({
        activo:                   item.activo,
        tipo_documento:           item.tipo_documento,
        codigo:                   item.codigo,
        nombre:                   item.nombre,
        resolucion_id:            item.resolucion_id || '',
        prefijo_override:         item.prefijo_override || '',
        consecutivo_actual:       item.consecutivo_actual,
        habilitar_rete_iva:       (item as any).habilitar_rete_iva ?? false,
        habilitar_rete_ica:       (item as any).habilitar_rete_ica ?? false,
        habilitar_autorretencion: (item as any).habilitar_autorretencion ?? false,
        titulo_pdf:               (item as any).titulo_pdf ?? '',
        observaciones_default:    item.observaciones_default || '',
      })
    } else {
      setForm({ ...emptyForm })
    }
    setError('')
  }, [item])

  // Cuando cambia la resolución → auto-rellena prefijo y abre sección numeración
  const onResolucionChange = (id: string) => {
    const res = resoluciones.find(r => r.id === id)
    set({
      resolucion_id:   id,
      prefijo_override: res?.prefijo || '',
      consecutivo_actual: res?.desde ?? 1,
    })
    if (id) setSections(s => ({ ...s, numeracion: true }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        resolucion_id:        form.resolucion_id || null,
        prefijo_override:     form.prefijo_override || null,
        observaciones_default:form.observaciones_default || null,
        titulo_pdf:           form.titulo_pdf || null,
      }
      if (item) {
        await tipoComprobantesService.update(item.id, payload)
      } else {
        await tipoComprobantesService.create(payload)
      }
      onSave()
      onClose()
    } catch (err) {
      const data = getAxiosErrorData(err)?.data
      const msgs = data?.errors as Record<string, unknown> | undefined
      setError(msgs ? Object.values(msgs).flat().join(' ') : (data?.message || 'Error al guardar'))
    } finally {
      setSaving(false)
    }
  }

  const resolSeleccionada = resoluciones.find(r => r.id === form.resolucion_id)
  const tipoColor = TIPOS_DOC.find(t => t.value === form.tipo_documento)?.color || '#6366f1'

  return (
    <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: 20 }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-card)',
        width: '100%', maxWidth: 700,
        maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 2 }}>
              {item ? 'Editar tipo de comprobante' : 'Nuevo tipo de comprobante'}
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              Configura los parámetros del documento. Al crear una factura solo seleccionas este tipo y todo queda precargado.
            </p>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Body scrollable */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>

            {error && (
              <div className="alert alert-error">{error}</div>
            )}

            {/* ── Sección 1: Datos principales ── */}
            <Section title="Datos principales" open={sections.principal} onToggle={() => toggleSection('principal')}>
              {/* En uso */}
              <Toggle
                label="En uso"
                hint="Activa o inactiva este tipo de comprobante para uso en documentos."
                checked={form.activo}
                onChange={v => set({ activo: v })}
              />

              {/* Tipo de documento */}
              <div className="input-group" style={{ margin: 0 }}>
                <label>Tipo de documento *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                  {TIPOS_DOC.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => set({ tipo_documento: t.value as any })}
                      style={{
                        padding: '10px 6px', borderRadius: 'var(--radius-md)', border: '2px solid',
                        borderColor: form.tipo_documento === t.value ? t.color : 'var(--border)',
                        background: form.tipo_documento === t.value ? t.color + '15' : 'var(--bg-surface)',
                        cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center',
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: form.tipo_documento === t.value ? t.color : 'var(--text-muted)' }}>
                        {t.value}
                      </div>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.2 }}>
                        {t.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Código y Nombre */}
              <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 12 }}>
                <div className="input-group" style={{ margin: 0 }}>
                  <label>Código *</label>
                  <input
                    type="text" className="input" required maxLength={10}
                    placeholder="FV-1"
                    style={{ fontWeight: 700, textTransform: 'uppercase', color: tipoColor, letterSpacing: '0.05em' }}
                    value={form.codigo}
                    onChange={e => set({ codigo: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="input-group" style={{ margin: 0 }}>
                  <label>Nombre del comprobante *</label>
                  <input
                    type="text" className="input" required maxLength={100}
                    placeholder="Ej: Factura de Venta Principal"
                    value={form.nombre}
                    onChange={e => set({ nombre: e.target.value })}
                  />
                </div>
              </div>
            </Section>

            {/* ── Sección 2: Resolución de facturación ── */}
            <Section title="Resolución de facturación (DIAN)" open={sections.resolucion} onToggle={() => toggleSection('resolucion')}>
              {/* Header con botón sincronizar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Vincula este comprobante a una habilitación de la DIAN.
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => loadResoluciones(true)}
                  disabled={syncing}
                  style={{ flexShrink: 0 }}
                >
                  <RefreshCw size={13} className={syncing ? 'spinner' : ''} />
                  {syncing ? 'Sincronizando...' : 'Sincronizar Factus'}
                </button>
              </div>

              {loadingRes ? (
                <div style={{ padding: '12px 0', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  <span className="spinner" style={{ width: 16, height: 16 }} /> Cargando resoluciones...
                </div>
              ) : resoluciones.length === 0 ? (
                <div style={{
                  padding: '12px 14px', borderRadius: 'var(--radius-md)',
                  background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)',
                  fontSize: '0.82rem', color: '#d97706', display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <AlertTriangle size={15} />
                  No hay resoluciones activas. Usa el botón "Sincronizar Factus" o créalas en la pestaña Resoluciones DIAN.
                </div>
              ) : (
                <select
                  className="input"
                  value={form.resolucion_id}
                  onChange={e => onResolucionChange(e.target.value)}
                >
                  <option value="">— Sin resolución asignada (guardará como borrador) —</option>
                  {resoluciones.map(r => {
                    const vencida = new Date(r.fecha_fin) < new Date()
                    return (
                      <option key={r.id} value={r.id} disabled={vencida}>
                        {r.prefijo ? `[${r.prefijo}] ` : ''}{r.nombre} · Res. {r.numero_resolucion}
                        {vencida ? ' — VENCIDA' : ''}
                      </option>
                    )
                  })}
                </select>
              )}

              {/* Info de resolución seleccionada */}
              {resolSeleccionada && (
                <div style={{
                  padding: '10px 14px', borderRadius: 'var(--radius-md)',
                  background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)',
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: '0.78rem',
                }}>
                  <div>
                    <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>N° Resolución</div>
                    <div style={{ fontWeight: 700 }}>{resolSeleccionada.numero_resolucion}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Rango</div>
                    <div style={{ fontWeight: 700 }}>
                      {resolSeleccionada.desde?.toLocaleString()} – {resolSeleccionada.hasta?.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Vence</div>
                    <div style={{ fontWeight: 700, color: new Date(resolSeleccionada.fecha_fin) < new Date() ? '#ef4444' : '#10b981' }}>
                      {resolSeleccionada.fecha_fin}
                    </div>
                  </div>
                </div>
              )}
            </Section>

            {/* ── Sección 3: Numeración ── */}
            <Section title="Numeración" open={sections.numeracion} onToggle={() => toggleSection('numeracion')}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div className="input-group" style={{ margin: 0 }}>
                  <label>Prefijo</label>
                  <input
                    type="text" className="input" maxLength={20}
                    placeholder={resolSeleccionada?.prefijo || 'Sin prefijo'}
                    value={form.prefijo_override}
                    onChange={e => set({ prefijo_override: e.target.value })}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3, display: 'block' }}>
                    Vacío = usa el de la resolución
                  </span>
                </div>
                <div className="input-group" style={{ margin: 0 }}>
                  <label>Numeración inicial</label>
                  <input
                    type="text" className="input"
                    value={resolSeleccionada?.desde?.toLocaleString() ?? '—'}
                    readOnly
                    style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', cursor: 'not-allowed' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3, display: 'block' }}>
                    Definido por la resolución
                  </span>
                </div>
                <div className="input-group" style={{ margin: 0 }}>
                  <label>Numeración final</label>
                  <input
                    type="text" className="input"
                    value={resolSeleccionada?.hasta?.toLocaleString() ?? '—'}
                    readOnly
                    style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', cursor: 'not-allowed' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3, display: 'block' }}>
                    Definido por la resolución
                  </span>
                </div>
              </div>
              <div className="input-group" style={{ margin: 0, maxWidth: 200 }}>
                <label>Próximo número del comprobante</label>
                <input
                  type="number" className="input" min={1}
                  value={form.consecutivo_actual}
                  onChange={e => set({ consecutivo_actual: parseInt(e.target.value) || 1 })}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3, display: 'block' }}>
                  Se incrementa automáticamente en cada documento.
                </span>
              </div>
            </Section>

            {/* ── Sección 4: Retenciones ── */}
            <Section title="Retenciones" open={sections.retenciones} onToggle={() => toggleSection('retenciones')}>
              <Toggle
                label="Habilitar ReteIVA"
                hint="Permite aplicar retención de IVA en este tipo de documento."
                checked={form.habilitar_rete_iva}
                onChange={v => set({ habilitar_rete_iva: v })}
              />
              <Toggle
                label="Habilitar ReteICA"
                hint="Permite aplicar retención de ICA en este tipo de documento."
                checked={form.habilitar_rete_ica}
                onChange={v => set({ habilitar_rete_ica: v })}
              />
              <Toggle
                label="Habilitar Autorretención"
                hint="Aplica autorretención automática según la tarifa configurada para la empresa."
                checked={form.habilitar_autorretencion}
                onChange={v => set({ habilitar_autorretencion: v })}
              />
            </Section>

            {/* ── Sección 5: Visualización ── */}
            <Section title="Visualización e impresión" open={sections.visualizacion} onToggle={() => toggleSection('visualizacion')}>
              <div className="input-group" style={{ margin: 0 }}>
                <label>Título para visualización / PDF</label>
                <input
                  type="text" className="input" maxLength={100}
                  placeholder="Ej: FACTURA DE VENTA ELECTRÓNICA"
                  value={form.titulo_pdf}
                  onChange={e => set({ titulo_pdf: e.target.value })}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3, display: 'block' }}>
                  Aparecerá en el encabezado del documento impreso. Vacío = usa el nombre del comprobante.
                </span>
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label>Observaciones por defecto</label>
                <textarea
                  className="input" style={{ minHeight: 80, resize: 'vertical' }}
                  placeholder="Ej: Gracias por su compra. No somos responsables por devoluciones después de 30 días."
                  value={form.observaciones_default}
                  onChange={e => set({ observaciones_default: e.target.value })}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3, display: 'block' }}>
                  Se pre-cargará automáticamente en cada nuevo documento de este tipo.
                </span>
              </div>
            </Section>
          </div>

          {/* Footer */}
          <div style={{
            flexShrink: 0, padding: '14px 24px',
            borderTop: '1px solid var(--border)', background: 'var(--bg-surface)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {form.resolucion_id ? (
                <><Check size={14} style={{ color: '#10b981' }} /> Vinculado a resolución DIAN — se validará ante la DIAN</>
              ) : (
                <><AlertTriangle size={14} style={{ color: '#f59e0b' }} /> Sin resolución — los documentos se guardarán como borrador</>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Guardando...' : (item ? 'Actualizar' : 'Crear comprobante')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────
export default function TipoComprobantesPage(_: { embedded?: boolean }) {
  const [comprobantes, setComprobantes] = useState<TipoComprobante[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<TipoComprobante | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const comps = await tipoComprobantesService.getAll()
      setComprobantes(comps)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openNew = () => { setEditing(null); setShowModal(true) }
  const openEdit = (c: TipoComprobante) => { setEditing(c); setShowModal(true) }
  const handleToggle = async (c: TipoComprobante) => { await tipoComprobantesService.toggle(c.id); load() }

  const getTipoColor = (tipo: string) => TIPOS_DOC.find(t => t.value === tipo)?.color || '#6366f1'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 4 }}>Tipos de Comprobante</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: 520 }}>
            Configura los tipos de documento (FV-1, FV-2…) con su resolución DIAN, prefijo y parámetros por defecto.
            Al crear una factura, solo seleccionas el tipo y todo queda precargado.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openNew} style={{ flexShrink: 0 }}>
          <Plus size={15} /> Nuevo tipo
        </button>
      </div>

      {/* Info box vacío */}
      {comprobantes.length === 0 && !loading && (
        <div style={{
          background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: 20,
          display: 'flex', gap: 16, alignItems: 'flex-start',
        }}>
          <FileText size={32} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>¿Cómo funcionan los tipos de comprobante?</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Crea un tipo por cada forma de facturar. Ejemplos comunes:<br />
              <strong>FV-1</strong> — Factura de Venta electrónica con resolución DIAN<br />
              <strong>FV-2</strong> — Documento de ingreso / tiquete POS sin resolución<br />
              <strong>DC-1</strong> — Documento Equivalente para compras sin factura<br />
              Cada tipo tiene su propio consecutivo, prefijo y parámetros de retenciones.
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 50 }}>
          <span className="spinner" style={{ width: 28, height: 28 }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {comprobantes.map(c => {
            const color = getTipoColor(c.tipo_documento)
            const resVencida = c.resolucion && new Date(c.resolucion.fecha_fin) < new Date()
            return (
              <div key={c.id} style={{
                background: 'var(--bg-card)', border: `1px solid var(--border)`,
                borderTop: `3px solid ${color}`,
                borderRadius: 'var(--radius-lg)', padding: '16px 18px',
                opacity: c.activo ? 1 : 0.5,
                display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      background: color + '20', color, borderRadius: 'var(--radius-md)',
                      padding: '6px 12px', fontWeight: 800, fontSize: '1.05rem', letterSpacing: '0.04em',
                    }}>
                      {c.codigo}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{c.nombre}</div>
                      <div style={{ fontSize: '0.72rem', color, fontWeight: 600 }}>
                        {TIPOS_DOC.find(t => t.value === c.tipo_documento)?.label}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-icon" title="Editar" onClick={() => openEdit(c)}><Edit2 size={13} /></button>
                    <button className="btn-icon" title={c.activo ? 'Inactivar' : 'Activar'} onClick={() => handleToggle(c)}>
                      <Power size={13} style={{ color: c.activo ? '#ef4444' : '#10b981' }} />
                    </button>
                  </div>
                </div>

                <div style={{
                  background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)',
                  padding: '10px 12px', fontSize: '0.78rem',
                }}>
                  {c.resolucion ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Resolución DIAN</span>
                        {resVencida && (
                          <span style={{ color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <AlertTriangle size={11} /> Vencida
                          </span>
                        )}
                      </div>
                      <div style={{ fontWeight: 600, color: resVencida ? '#ef4444' : 'var(--text-primary)' }}>
                        {c.resolucion.prefijo && <span style={{ color, marginRight: 6 }}>[{c.resolucion.prefijo}]</span>}
                        {c.resolucion.nombre}
                      </div>
                      <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>
                        Res. {c.resolucion.numero_resolucion} · {c.resolucion.desde?.toLocaleString()}–{c.resolucion.hasta?.toLocaleString()}
                      </div>
                    </>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      Sin resolución — se guardará como borrador
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 12, fontSize: '0.78rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Prefijo</div>
                    <div style={{ fontWeight: 700, color }}>{c.prefijo_override || c.resolucion?.prefijo || '—'}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Próximo #</div>
                    <div style={{ fontWeight: 700 }}>{c.consecutivo_actual?.toLocaleString()}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Estado</div>
                    <span style={{
                      padding: '2px 8px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700,
                      background: c.activo ? '#10b98122' : '#6b728022',
                      color: c.activo ? '#10b981' : '#6b7280',
                    }}>
                      {c.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>

                {c.observaciones_default && (
                  <div style={{
                    fontSize: '0.74rem', color: 'var(--text-muted)',
                    borderTop: '1px solid var(--border)', paddingTop: 8, fontStyle: 'italic',
                  }}>
                    "{c.observaciones_default.substring(0, 80)}{c.observaciones_default.length > 80 ? '…' : ''}"
                  </div>
                )}
              </div>
            )
          })}

          {/* Card agregar nuevo */}
          <button onClick={openNew} style={{
            background: 'transparent', border: '2px dashed var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '24px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 10, cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.2s', minHeight: 160,
          }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <Plus size={24} />
            <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Agregar tipo</span>
          </button>
        </div>
      )}

      {showModal && (
        <ComprobanteModal
          item={editing}
          onClose={() => setShowModal(false)}
          onSave={load}
        />
      )}
    </div>
  )
}
