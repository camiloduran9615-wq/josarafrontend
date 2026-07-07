import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Loader2, Save, X, AlertCircle, Package, Receipt, FileText, Wrench } from 'lucide-react'
import {
  tipoDocumentoIngresoService,
  type TipoDocumentoIngreso,
  type TipoDocumentoIngresoPayload,
} from '@/services/tipoDocumentoIngreso.service'
import { api } from '@/lib/api'
import { getAxiosErrorData, getErrorMessage } from '@/lib/errors'
import { getTenantId } from '@/services/auth.service'

interface Props { embedded?: boolean }

interface CuentaContable { id: string; codigo: string; nombre: string }

const TIPO_LINEA_LABELS = {
  producto:    { label: 'Producto / Inventario', icon: Package,  color: '#6366f1' },
  gasto:       { label: 'Gasto / Servicio',       icon: Receipt,  color: '#10b981' },
  activo_fijo: { label: 'Activo Fijo',            icon: Wrench,   color: '#f59e0b' },
}

const CONCEPTOS_RF = [
  { id: 'rf_compras',      label: 'Compras generales (3.5%)' },
  { id: 'rf_servicios',    label: 'Servicios (4%)' },
  { id: 'rf_honorarios',   label: 'Honorarios y comisiones (11%)' },
  { id: 'rf_arrendamiento',label: 'Arrendamiento bienes muebles (4%)' },
  { id: 'rf_transporte',   label: 'Transporte de carga (1%)' },
  { id: 'rf_otro',         label: 'Otro concepto (tasa libre)' },
]

const CONCEPTOS_ICA = [
  { id: 'ica_comercio',  label: 'Comercio al por mayor/menor (0.414‰)' },
  { id: 'ica_servicios', label: 'Servicios generales (0.966‰)' },
  { id: 'ica_industria', label: 'Industria y manufactureros (0.69‰)' },
  { id: 'ica_otro',      label: 'Otro concepto (tasa libre)' },
]

const empty = (): TipoDocumentoIngresoPayload => ({
  codigo: '', nombre: '', descripcion: '', prefijo_numero: '',
  afecta_inventario: true, tipo_linea_default: 'producto',
  cuenta_inventario_id: null, cuenta_gasto_id: null,
  cuenta_proveedor_id: null, cuenta_iva_descontable_id: null,
  retefuente_concepto: null, retefuente_tasa: null,
  reteica_concepto: null, reteica_tasa: null,
  activo: true,
})

export default function TiposDocumentoIngresoPage({ embedded }: Props) {
  const [tipos, setTipos]               = useState<TipoDocumentoIngreso[]>([])
  const [cuentas, setCuentas]           = useState<CuentaContable[]>([])
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState('')
  const [showModal, setShowModal]       = useState(false)
  const [editId, setEditId]             = useState<string | null>(null)
  const [form, setForm]                 = useState<TipoDocumentoIngresoPayload>(empty())
  const [deleteId, setDeleteId]         = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [t, c] = await Promise.all([
        tipoDocumentoIngresoService.getAll(),
        api.get(`/${getTenantId()}/cuentas-contables`).then(r => r.data.data ?? []),
      ])
      setTipos(t)
      setCuentas(c)
    } catch {
      setError('Error cargando datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const openCreate = () => { setEditId(null); setForm(empty()); setError(''); setShowModal(true) }

  const openEdit = (tipo: TipoDocumentoIngreso) => {
    setEditId(tipo.id)
    setForm({
      codigo:                   tipo.codigo,
      nombre:                   tipo.nombre,
      descripcion:               tipo.descripcion ?? '',
      prefijo_numero:            tipo.prefijo_numero ?? '',
      afecta_inventario:         tipo.afecta_inventario,
      tipo_linea_default:        tipo.tipo_linea_default,
      cuenta_inventario_id:      tipo.cuenta_inventario_id,
      cuenta_gasto_id:           tipo.cuenta_gasto_id,
      cuenta_proveedor_id:       tipo.cuenta_proveedor_id,
      cuenta_iva_descontable_id: tipo.cuenta_iva_descontable_id,
      retefuente_concepto:       tipo.retefuente_concepto,
      retefuente_tasa:           tipo.retefuente_tasa,
      reteica_concepto:          tipo.reteica_concepto,
      reteica_tasa:              tipo.reteica_tasa,
      activo:                    tipo.activo,
    })
    setError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    setError('')
    if (!form.codigo.trim() || !form.nombre.trim()) {
      setError('Código y Nombre son obligatorios.')
      return
    }
    setSaving(true)
    try {
      if (editId) {
        await tipoDocumentoIngresoService.update(editId, form)
      } else {
        await tipoDocumentoIngresoService.create(form)
      }
      setShowModal(false)
      await loadData()
    } catch (err) {
      const data = getAxiosErrorData(err)?.data
      const errors = data?.errors as Record<string, unknown> | undefined
      setError(errors ? Object.values(errors).flat().join(' ') : (data?.message ?? 'Error al guardar'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await tipoDocumentoIngresoService.delete(id)
      setDeleteId(null)
      await loadData()
    } catch (err) {
      setError(getErrorMessage(err) ?? 'Error al eliminar')
    }
  }

  // ── Selector de cuenta ────────────────────────────────────────────────────
  const CuentaSelect = ({
    label, value, onChange,
  }: { label: string; value: string | null; onChange: (v: string | null) => void }) => (
    <div className="input-group" style={{ margin: 0 }}>
      <label style={{ fontSize: '0.75rem' }}>{label}</label>
      <select
        className="input"
        style={{ fontSize: '0.82rem' }}
        value={value ?? ''}
        onChange={e => onChange(e.target.value || null)}
      >
        <option value="">— Usar cuenta maestra global —</option>
        {cuentas.map(c => (
          <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>
        ))}
      </select>
    </div>
  )

  if (loading) {
    return (
      <div className="card p-10 flex items-center justify-center gap-3 text-muted">
        <Loader2 size={20} className="animate-spin" />
        <span>Cargando tipos de documento...</span>
      </div>
    )
  }

  return (
    <div className={embedded ? '' : 'page-container'}>
      {!embedded && (
        <div className="page-header mb-6">
          <h1 className="page-title flex items-center gap-3">
            <FileText size={26} className="text-accent" />
            Tipos de Documento de Ingreso
          </h1>
          <p className="page-subtitle">Parametriza cada tipo de compra como en SIIGO: cuentas, retenciones y comportamiento contable.</p>
        </div>
      )}

      {error && (
        <div className="alert alert-error mb-4 flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Barra de acciones */}
      <div className="flex justify-end mb-4">
        <button onClick={openCreate} className="btn btn-primary">
          <Plus size={16} /> Nuevo Tipo
        </button>
      </div>

      {/* Tabla / Cards */}
      <div className="card overflow-hidden">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
              {['Código', 'Nombre', 'Tipo Línea', 'Retenciones por defecto', 'Estado', ''].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tipos.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No hay tipos configurados
                </td>
              </tr>
            )}
            {tipos.map((t, idx) => {
              const linea = TIPO_LINEA_LABELS[t.tipo_linea_default]
              const LinIcon = linea.icon
              return (
                <tr key={t.id} style={{
                  borderBottom: idx < tipos.length - 1 ? '1px solid var(--border)' : 'none',
                  transition: 'background 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      background: 'var(--bg-surface)', border: '1px solid var(--border)',
                      borderRadius: 6, padding: '2px 10px',
                      fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem',
                    }}>
                      {t.codigo}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{t.nombre}</div>
                    {t.descripcion && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {t.descripcion.length > 60 ? t.descripcion.slice(0, 60) + '…' : t.descripcion}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '3px 10px', borderRadius: 20,
                      background: linea.color + '20', color: linea.color,
                      fontSize: '0.78rem', fontWeight: 600,
                    }}>
                      <LinIcon size={13} />
                      {linea.label}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {t.retefuente_concepto && (
                        <span style={{ color: '#6366f1' }}>
                          RF: {CONCEPTOS_RF.find(c => c.id === t.retefuente_concepto)?.label ?? t.retefuente_concepto} — {t.retefuente_tasa}%
                        </span>
                      )}
                      {t.reteica_concepto && (
                        <span style={{ color: '#f59e0b' }}>
                          ICA: {CONCEPTOS_ICA.find(c => c.id === t.reteica_concepto)?.label ?? t.reteica_concepto} — {t.reteica_tasa}‰
                        </span>
                      )}
                      {!t.retefuente_concepto && !t.reteica_concepto && (
                        <span style={{ color: 'var(--text-muted)' }}>Sin retenciones</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className={`badge ${t.activo ? 'badge-success' : 'badge-secondary'}`}>
                      {t.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(t)} className="btn-icon" title="Editar">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => setDeleteId(t.id)} className="btn-icon btn-icon-danger" title="Eliminar">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Modal Crear / Editar ── */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 760, maxHeight: '92vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2 className="page-title" style={{ fontSize: '1.1rem' }}>
                {editId ? 'Editar Tipo' : 'Nuevo Tipo de Documento de Ingreso'}
              </h2>
              <button onClick={() => setShowModal(false)} className="btn-icon"><X size={18} /></button>
            </div>

            {error && (
              <div className="alert alert-error mb-4 flex items-center gap-2">
                <AlertCircle size={15} /> {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Identificación */}
              <section>
                <h3 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 10 }}>
                  Identificación
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 12 }}>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label>Código *</label>
                    <input className="input" placeholder="FCI" maxLength={20}
                      value={form.codigo}
                      onChange={e => setForm(f => ({ ...f, codigo: e.target.value.toUpperCase() }))} />
                  </div>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label>Nombre *</label>
                    <input className="input" placeholder="Factura Compra — Inventario" maxLength={100}
                      value={form.nombre}
                      onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
                  </div>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label>Prefijo consecutivo</label>
                    <input className="input" placeholder="FCI" maxLength={10}
                      value={form.prefijo_numero ?? ''}
                      onChange={e => setForm(f => ({ ...f, prefijo_numero: e.target.value }))} />
                  </div>
                  <div className="input-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                    <label>Descripción</label>
                    <input className="input" placeholder="Breve descripción del uso de este tipo..."
                      value={form.descripcion ?? ''}
                      onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
                  </div>
                </div>
              </section>

              {/* Comportamiento */}
              <section>
                <h3 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 10 }}>
                  Comportamiento
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label>Tipo de línea por defecto</label>
                    <select className="input" value={form.tipo_linea_default}
                      onChange={e => setForm(f => ({
                        ...f,
                        tipo_linea_default: e.target.value as any,
                        afecta_inventario: e.target.value === 'producto',
                      }))}>
                      <option value="producto">Producto / Inventario</option>
                      <option value="gasto">Gasto / Servicio</option>
                      <option value="activo_fijo">Activo Fijo</option>
                    </select>
                  </div>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label>Estado</label>
                    <select className="input" value={form.activo ? 'true' : 'false'}
                      onChange={e => setForm(f => ({ ...f, activo: e.target.value === 'true' }))}>
                      <option value="true">Activo</option>
                      <option value="false">Inactivo</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                      <input type="checkbox" checked={form.afecta_inventario ?? false}
                        onChange={e => setForm(f => ({ ...f, afecta_inventario: e.target.checked }))} />
                      <span style={{ fontSize: '0.88rem' }}>
                        <strong>Afecta inventario</strong> — genera movimiento KARDEX al registrar
                      </span>
                    </label>
                  </div>
                </div>
              </section>

              {/* Cuentas override */}
              <section>
                <h3 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>
                  Cuentas Contables (override)
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                  Estas cuentas tienen prioridad sobre la parametrización contable global. Si se deja en blanco, se usa la cuenta maestra.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <CuentaSelect label="Cuenta Inventario (débito)"
                    value={form.cuenta_inventario_id ?? null}
                    onChange={v => setForm(f => ({ ...f, cuenta_inventario_id: v }))} />
                  <CuentaSelect label="Cuenta Gasto / Servicio (débito)"
                    value={form.cuenta_gasto_id ?? null}
                    onChange={v => setForm(f => ({ ...f, cuenta_gasto_id: v }))} />
                  <CuentaSelect label="Cuenta Proveedor (crédito)"
                    value={form.cuenta_proveedor_id ?? null}
                    onChange={v => setForm(f => ({ ...f, cuenta_proveedor_id: v }))} />
                  <CuentaSelect label="IVA Descontable (débito)"
                    value={form.cuenta_iva_descontable_id ?? null}
                    onChange={v => setForm(f => ({ ...f, cuenta_iva_descontable_id: v }))} />
                </div>
              </section>

              {/* Retenciones predeterminadas */}
              <section>
                <h3 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>
                  Retenciones Predeterminadas
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                  Al seleccionar este tipo en un documento, estas retenciones se agregarán automáticamente.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {/* Retefuente */}
                  <div className="input-group" style={{ margin: 0 }}>
                    <label>Concepto Retefuente</label>
                    <select className="input" value={form.retefuente_concepto ?? ''}
                      onChange={e => setForm(f => ({ ...f, retefuente_concepto: e.target.value || null }))}>
                      <option value="">— Sin retefuente —</option>
                      {CONCEPTOS_RF.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </div>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label>Tasa Retefuente %</label>
                    <input type="number" className="input" min={0} max={100} step={0.001}
                      placeholder="3.5"
                      value={form.retefuente_tasa ?? ''}
                      onChange={e => setForm(f => ({ ...f, retefuente_tasa: e.target.value ? parseFloat(e.target.value) : null }))} />
                  </div>
                  {/* ReteICA */}
                  <div className="input-group" style={{ margin: 0 }}>
                    <label>Concepto ReteICA</label>
                    <select className="input" value={form.reteica_concepto ?? ''}
                      onChange={e => setForm(f => ({ ...f, reteica_concepto: e.target.value || null }))}>
                      <option value="">— Sin ReteICA —</option>
                      {CONCEPTOS_ICA.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </div>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label>Tasa ReteICA ‰</label>
                    <input type="number" className="input" min={0} step={0.001}
                      placeholder="0.966"
                      value={form.reteica_tasa ?? ''}
                      onChange={e => setForm(f => ({ ...f, reteica_tasa: e.target.value ? parseFloat(e.target.value) : null }))} />
                  </div>
                </div>
              </section>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary">Cancelar</button>
              <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {saving ? 'Guardando...' : (editId ? 'Guardar Cambios' : 'Crear Tipo')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmación de eliminación ── */}
      {deleteId && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>¿Eliminar tipo?</h2>
              <button onClick={() => setDeleteId(null)} className="btn-icon"><X size={18} /></button>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 20 }}>
              El tipo será desactivado y no aparecerá en nuevos documentos. Esta acción no puede deshacerse.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setDeleteId(null)} className="btn btn-secondary">Cancelar</button>
              <button onClick={() => handleDelete(deleteId)} className="btn" style={{ background: '#ef4444', color: '#fff' }}>
                <Trash2 size={15} /> Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
