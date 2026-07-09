import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Check, Edit2, Loader2, Plus, Power, Ruler, Search, X } from 'lucide-react'
import { api } from '@/lib/api'
import { extractApiError } from '@/lib/errors'
import { getTenantId } from '@/services/auth.service'
import { unidadesMedidaDianService } from '@/services/unidadesMedidaDian.service'

interface UnidadDian {
  codigo: string
  nombre: string
  descripcion?: string | null
  activo: boolean
  sistema: boolean
}

const emptyForm = {
  codigo: '',
  nombre: '',
  descripcion: '',
  activo: true,
}

const estadoOptions = [
  { value: '', label: 'Todas' },
  { value: 'activos', label: 'Activas' },
  { value: 'inactivos', label: 'Inactivas' },
]

function tenantBase() {
  return `/${getTenantId()}/unidades-medida-dian`
}

export default function UnidadesDianPage({ embedded = false }: { embedded?: boolean }) {
  const [unidades, setUnidades] = useState<UnidadDian[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [estado, setEstado] = useState('activos')
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<UnidadDian | null>(null)
  const [form, setForm] = useState({ ...emptyForm })

  const fetchUnidades = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ limit: '300' })
      if (query.trim()) params.set('search', query.trim())
      if (estado) params.set('estado', estado)
      const res = await api.get(`${tenantBase()}?${params.toString()}`)
      setUnidades(res.data.data ?? [])
    } catch (err) {
      setError(extractApiError(err, 'No se pudo cargar el catalogo de unidades DIAN.'))
    } finally {
      setLoading(false)
    }
  }, [query, estado])

  useEffect(() => {
    const timer = window.setTimeout(fetchUnidades, 250)
    return () => window.clearTimeout(timer)
  }, [fetchUnidades])

  const abrirNuevo = () => {
    setEditando(null)
    setForm({ ...emptyForm })
    setError('')
    setShowForm(true)
  }

  const abrirEditar = (unidad: UnidadDian) => {
    setEditando(unidad)
    setForm({
      codigo: unidad.codigo,
      nombre: unidad.nombre,
      descripcion: unidad.descripcion ?? '',
      activo: unidad.activo,
    })
    setError('')
    setShowForm(true)
  }

  const cerrarForm = () => {
    setShowForm(false)
    setEditando(null)
    setForm({ ...emptyForm })
  }

  const setField = (key: keyof typeof emptyForm, value: string | boolean) => {
    setForm(current => ({ ...current, [key]: value }))
  }

  const guardar = async () => {
    setSaving(true)
    setError('')
    const payload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      activo: form.activo,
    }

    try {
      if (editando) {
        await api.put(`${tenantBase()}/${editando.codigo}`, payload)
      } else {
        await api.post(tenantBase(), {
          ...payload,
          codigo: form.codigo.trim().toUpperCase(),
        })
      }
      unidadesMedidaDianService.invalidate()
      await fetchUnidades()
      cerrarForm()
    } catch (err) {
      setError(extractApiError(err, 'No se pudo guardar la unidad DIAN.'))
    } finally {
      setSaving(false)
    }
  }

  const toggleActivo = async (unidad: UnidadDian) => {
    setError('')
    try {
      await api.delete(`${tenantBase()}/${unidad.codigo}`)
      unidadesMedidaDianService.invalidate()
      await fetchUnidades()
    } catch (err) {
      setError(extractApiError(err, 'No se pudo cambiar el estado de la unidad.'))
    }
  }

  return (
    <div className={embedded ? 'municipios-dane-page' : 'page-container municipios-dane-page'}>
      {!embedded && (
        <div className="page-header">
          <div>
            <h1 className="page-title"><Ruler size={24} className="text-accent" /> Unidades de medida DIAN</h1>
            <p className="page-subtitle">Catalogo usado al crear productos y servicios para facturacion electronica.</p>
          </div>
        </div>
      )}

      <div className="municipios-dane-toolbar card">
        <div className="municipios-dane-search">
          <Search size={16} aria-hidden="true" />
          <input
            className="input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por codigo, nombre o descripcion"
          />
        </div>
        <select className="input municipios-dane-state" value={estado} onChange={e => setEstado(e.target.value)}>
          {estadoOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <button className="btn btn-primary" type="button" onClick={abrirNuevo}>
          <Plus size={16} /> Nueva unidad
        </button>
      </div>

      {error && (
        <div className="alert alert-danger municipios-dane-alert">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="table-wrapper municipios-dane-table">
        {loading ? (
          <div className="empty-state"><Loader2 size={18} className="spinner" /> Cargando unidades...</div>
        ) : unidades.length === 0 ? (
          <div className="empty-state">No hay unidades para los filtros seleccionados.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Codigo DIAN</th>
                <th>Nombre</th>
                <th>Descripcion</th>
                <th>Origen</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {unidades.map(unidad => (
                <tr key={unidad.codigo}>
                  <td className="font-mono">{unidad.codigo}</td>
                  <td>{unidad.nombre}</td>
                  <td>{unidad.descripcion || '-'}</td>
                  <td><span className="badge badge-muted">{unidad.sistema ? 'Sistema' : 'Manual'}</span></td>
                  <td>
                    <span className={`badge ${unidad.activo ? 'badge-success' : 'badge-muted'}`}>
                      {unidad.activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td>
                    <div className="municipios-dane-actions">
                      <button className="btn-icon" type="button" onClick={() => abrirEditar(unidad)} aria-label={`Editar ${unidad.nombre}`}>
                        <Edit2 size={16} />
                      </button>
                      <button className="btn-icon" type="button" onClick={() => toggleActivo(unidad)} aria-label={unidad.activo ? `Inactivar ${unidad.nombre}` : `Activar ${unidad.nombre}`}>
                        <Power size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal modal-md municipios-dane-modal">
            <div className="modal-header">
              <h2 className="modal-title"><Ruler size={20} className="text-accent" /> {editando ? 'Editar unidad DIAN' : 'Nueva unidad DIAN'}</h2>
              <button className="btn-icon" type="button" onClick={cerrarForm} aria-label="Cerrar modal">
                <X size={18} />
              </button>
            </div>
            <div className="modal-body municipios-dane-form">
              <div className="municipios-dane-form-grid">
                <div className="input-group">
                  <label>Codigo DIAN *</label>
                  <input
                    className="input"
                    value={form.codigo}
                    onChange={e => setField('codigo', e.target.value.toUpperCase())}
                    disabled={Boolean(editando)}
                    placeholder="Ej: 94, KGM, E48"
                    maxLength={20}
                  />
                </div>
                <div className="input-group">
                  <label>Nombre *</label>
                  <input className="input" value={form.nombre} onChange={e => setField('nombre', e.target.value)} placeholder="Ej: Unidad" />
                </div>
              </div>
              <div className="input-group">
                <label>Descripcion</label>
                <input className="input" value={form.descripcion} onChange={e => setField('descripcion', e.target.value)} placeholder="Detalle interno opcional" />
              </div>
              <label className="municipios-dane-check">
                <input type="checkbox" checked={form.activo} onChange={e => setField('activo', e.target.checked)} />
                <span>Disponible al crear productos y servicios</span>
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" type="button" onClick={cerrarForm}>Cancelar</button>
              <button className="btn btn-primary" type="button" onClick={guardar} disabled={saving}>
                {saving ? <Loader2 size={16} className="spinner" /> : <Check size={16} />} Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
