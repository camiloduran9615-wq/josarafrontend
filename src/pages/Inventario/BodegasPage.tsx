import { useState, useEffect } from 'react'
import { Plus, Warehouse, Edit2, Trash2, Check, X, AlertCircle, Loader2 } from 'lucide-react'
import { bodegasService, type Bodega, type CreateBodegaPayload } from '@/services/inventario.service'
import { api } from '@/lib/api'
import { getErrorMessage } from '@/lib/errors'
import { getTenantId } from '@/services/auth.service'

const TIPOS_BODEGA: { value: Bodega['tipo']; label: string; color: string }[] = [
  { value: 'mercancia',          label: 'Mercancía',         color: '#6366f1' },
  { value: 'materia_prima',      label: 'Materia Prima',     color: '#10b981' },
  { value: 'producto_proceso',   label: 'En Proceso',        color: '#f59e0b' },
  { value: 'producto_terminado', label: 'Prod. Terminado',   color: '#3b82f6' },
  { value: 'consignacion',       label: 'Consignación',      color: '#8b5cf6' },
  { value: 'devoluciones',       label: 'Devoluciones',      color: '#ef4444' },
  { value: 'transito',           label: 'En Tránsito',       color: '#64748b' },
]

const tipoLabel = (tipo: string) => TIPOS_BODEGA.find(t => t.value === tipo)?.label ?? tipo
const tipoColor = (tipo: string) => TIPOS_BODEGA.find(t => t.value === tipo)?.color ?? '#64748b'

interface BodegaForm {
  sucursal_id: string
  codigo: string
  nombre: string
  tipo: Bodega['tipo']
  es_principal: boolean
}

const emptyForm = (): BodegaForm => ({
  sucursal_id: '',
  codigo: '',
  nombre: '',
  tipo: 'mercancia',
  es_principal: false,
})

export default function BodegasPage() {
  const [bodegas, setBodegas]       = useState<Bodega[]>([])
  const [sucursales, setSucursales] = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')
  const [showForm, setShowForm]     = useState(false)
  const [editing, setEditing]       = useState<Bodega | null>(null)
  const [form, setForm]             = useState<BodegaForm>(emptyForm())

  const load = async () => {
    try {
      setLoading(true)
      const [b, s] = await Promise.all([
        bodegasService.getAll(),
        api.get(`/${getTenantId()}/sucursales`).then(r => r.data.data ?? []),
      ])
      setBodegas(b)
      setSucursales(s)
    } catch {
      setError('Error al cargar bodegas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openNew = () => {
    setEditing(null)
    setForm(emptyForm())
    setShowForm(true)
    setError('')
  }

  const openEdit = (b: Bodega) => {
    setEditing(b)
    setForm({
      sucursal_id: b.sucursal_id,
      codigo: b.codigo,
      nombre: b.nombre,
      tipo: b.tipo,
      es_principal: b.es_principal,
    })
    setShowForm(true)
    setError('')
  }

  const handleSave = async () => {
    if (!form.sucursal_id) { setError('Selecciona una sucursal.'); return }
    if (!form.codigo.trim()) { setError('El código es requerido.'); return }
    if (!form.nombre.trim()) { setError('El nombre es requerido.'); return }

    setSaving(true); setError('')
    try {
      if (editing) {
        await bodegasService.update(editing.id, form)
      } else {
        await bodegasService.create(form as CreateBodegaPayload)
      }
      setShowForm(false)
      await load()
    } catch (err) {
      setError(getErrorMessage(err) ?? 'Error al guardar.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (b: Bodega) => {
    if (!confirm(`¿Eliminar bodega "${b.nombre}"? Esta acción es irreversible si no tiene movimientos.`)) return
    try {
      await bodegasService.delete(b.id)
      await load()
    } catch (err) {
      setError(getErrorMessage(err) ?? 'Error al eliminar.')
    }
  }

  // Agrupar por sucursal
  const porSucursal = sucursales.map(s => ({
    sucursal: s,
    bodegas: bodegas.filter(b => b.sucursal_id === s.id),
  })).filter(g => g.bodegas.length > 0 || true)

  return (
    <div style={{ padding: '28px 32px', maxWidth: 960, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Bodegas</h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Gestiona las ubicaciones de inventario por sucursal
          </p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={15} /> Nueva bodega
        </button>
      </div>

      {error && (
        <div className="alert alert-error" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)', padding: '20px 24px', marginBottom: 24,
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 700 }}>
            {editing ? 'Editar bodega' : 'Nueva bodega'}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="input-group" style={{ margin: 0 }}>
              <label>Sucursal *</label>
              <select className="input" value={form.sucursal_id} onChange={e => setForm(f => ({ ...f, sucursal_id: e.target.value }))}>
                <option value="">Seleccione...</option>
                {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
            <div className="input-group" style={{ margin: 0 }}>
              <label>Tipo de bodega</label>
              <select className="input" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as Bodega['tipo'] }))}>
                {TIPOS_BODEGA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="input-group" style={{ margin: 0 }}>
              <label>Código *</label>
              <input className="input" placeholder="Ej: BOD-BOG-01"
                value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value.toUpperCase() }))} />
            </div>
            <div className="input-group" style={{ margin: 0 }}>
              <label>Nombre *</label>
              <input className="input" placeholder="Ej: Bodega Principal Bogotá"
                value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
            <input type="checkbox" id="es_principal" checked={form.es_principal}
              onChange={e => setForm(f => ({ ...f, es_principal: e.target.checked }))} />
            <label htmlFor="es_principal" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
              Marcar como bodega principal de la sucursal
            </label>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)} disabled={saving}>
              <X size={14} /> Cancelar
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 size={14} className="spinner" /> : <Check size={14} />}
              {editing ? 'Actualizar' : 'Crear bodega'}
            </button>
          </div>
        </div>
      )}

      {/* Lista de bodegas por sucursal */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
          <Loader2 size={24} className="spinner" style={{ margin: '0 auto' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {porSucursal.map(({ sucursal, bodegas: bs }) => (
            <div key={sucursal.id} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-xl)', overflow: 'hidden',
            }}>
              {/* Sucursal header */}
              <div style={{
                padding: '12px 20px', background: 'var(--bg-surface)',
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <Warehouse size={15} style={{ color: 'var(--accent)' }} />
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{sucursal.nombre}</span>
                <span style={{
                  marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)',
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 20, padding: '2px 10px',
                }}>{bs.length} bodega{bs.length !== 1 ? 's' : ''}</span>
              </div>

              {/* Bodegas de la sucursal */}
              {bs.length === 0 ? (
                <div style={{ padding: '16px 20px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Sin bodegas configuradas.
                </div>
              ) : (
                <div style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {bs.map(b => (
                    <div key={b.id} style={{
                      background: 'var(--bg-surface)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-lg)', padding: '12px 14px',
                      minWidth: 180, flex: '1 1 180px', maxWidth: 240,
                      borderLeft: `4px solid ${tipoColor(b.tipo)}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{
                          fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em',
                          color: tipoColor(b.tipo), textTransform: 'uppercase',
                        }}>{tipoLabel(b.tipo)}</span>
                        {b.es_principal && (
                          <span style={{
                            fontSize: '0.65rem', background: 'rgba(99,102,241,0.12)',
                            color: 'var(--accent)', borderRadius: 10, padding: '1px 7px',
                          }}>Principal</span>
                        )}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{b.nombre}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{b.codigo}</div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                        <button className="btn-icon" style={{ padding: 5 }} onClick={() => openEdit(b)} title="Editar">
                          <Edit2 size={12} />
                        </button>
                        <button className="btn-icon btn-icon-danger" style={{ padding: 5 }} onClick={() => handleDelete(b)} title="Eliminar">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {bodegas.length === 0 && !loading && (
            <div style={{
              textAlign: 'center', padding: 64,
              color: 'var(--text-muted)', fontSize: '0.9rem',
            }}>
              <Warehouse size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p>No hay bodegas configuradas.</p>
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={openNew}>
                <Plus size={14} /> Crear primera bodega
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
