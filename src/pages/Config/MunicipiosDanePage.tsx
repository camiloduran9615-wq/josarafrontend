import { useCallback, useEffect, useState } from 'react'
import type { AxiosError } from 'axios'
import { api } from '@/lib/api'
import { getTenantId } from '@/services/auth.service'
import { AlertCircle, Check, Edit2, Loader2, MapPin, Plus, Power, Search, X } from 'lucide-react'

interface MunicipioDane {
  codigo: string
  nombre: string
  departamento_codigo: string
  departamento_nombre: string
  nombre_completo: string
  region?: string | null
  activo: boolean
}

const emptyForm = {
  codigo_dane: '',
  municipio_nombre: '',
  departamento_dane: '',
  departamento_nombre: '',
  region: '',
  activo: true,
}

type ApiErrorBody = {
  message?: string
  errors?: Record<string, string[]>
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const axiosError = error as AxiosError<ApiErrorBody>
  const errors = axiosError.response?.data?.errors
  const firstError = errors ? Object.values(errors).flat()[0] : null

  return firstError ?? axiosError.response?.data?.message ?? fallback
}

const estadoOptions = [
  { value: '', label: 'Todos' },
  { value: 'activos', label: 'Activos' },
  { value: 'inactivos', label: 'Inactivos' },
]

function tenantBase() {
  return `/${getTenantId()}/municipios-dane`
}

export default function MunicipiosDanePage({ embedded = false }: { embedded?: boolean }) {
  const [municipios, setMunicipios] = useState<MunicipioDane[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [estado, setEstado] = useState('activos')
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<MunicipioDane | null>(null)
  const [form, setForm] = useState({ ...emptyForm })

  const fetchMunicipios = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (query.trim()) params.set('search', query.trim())
      if (estado) params.set('estado', estado)
      const res = await api.get(`${tenantBase()}?${params.toString()}`)
      setMunicipios(res.data.data ?? [])
    } catch (error) {
      setError(getApiErrorMessage(error, 'No se pudo cargar el catálogo de municipios DANE.'))
    } finally {
      setLoading(false)
    }
  }, [query, estado])

  useEffect(() => {
    const timer = window.setTimeout(fetchMunicipios, 250)
    return () => window.clearTimeout(timer)
  }, [fetchMunicipios])

  const abrirNuevo = () => {
    setEditando(null)
    setForm({ ...emptyForm })
    setError('')
    setShowForm(true)
  }

  const abrirEditar = (municipio: MunicipioDane) => {
    setEditando(municipio)
    setForm({
      codigo_dane: municipio.codigo,
      municipio_nombre: municipio.nombre,
      departamento_dane: municipio.departamento_codigo,
      departamento_nombre: municipio.departamento_nombre,
      region: municipio.region ?? '',
      activo: municipio.activo,
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
      municipio_nombre: form.municipio_nombre.trim(),
      departamento_dane: form.departamento_dane.trim(),
      departamento_nombre: form.departamento_nombre.trim(),
      region: form.region.trim() || null,
      activo: form.activo,
    }

    try {
      if (editando) {
        await api.put(`${tenantBase()}/${editando.codigo}`, payload)
      } else {
        await api.post(tenantBase(), {
          ...payload,
          codigo_dane: form.codigo_dane.trim(),
        })
      }
      await fetchMunicipios()
      cerrarForm()
    } catch (error) {
      setError(getApiErrorMessage(error, 'No se pudo guardar el municipio DANE.'))
    } finally {
      setSaving(false)
    }
  }

  const toggleActivo = async (municipio: MunicipioDane) => {
    setError('')
    try {
      await api.delete(`${tenantBase()}/${municipio.codigo}`)
      await fetchMunicipios()
    } catch (error) {
      setError(getApiErrorMessage(error, 'No se pudo cambiar el estado del municipio.'))
    }
  }

  return (
    <div className={embedded ? 'municipios-dane-page' : 'page-container municipios-dane-page'}>
      {!embedded && (
        <div className="page-header">
          <div>
            <h1 className="page-title"><MapPin size={24} className="text-accent" /> Municipios DANE</h1>
            <p className="page-subtitle">Catálogo central DIVIPOLA usado en terceros y documentos electrónicos.</p>
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
            placeholder="Buscar por municipio, departamento o código DANE"
          />
        </div>
        <select className="input municipios-dane-state" value={estado} onChange={e => setEstado(e.target.value)}>
          {estadoOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <button className="btn btn-primary" type="button" onClick={abrirNuevo}>
          <Plus size={16} /> Nuevo municipio
        </button>
      </div>

      {error && (
        <div className="alert alert-danger municipios-dane-alert">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="table-wrapper municipios-dane-table">
        {loading ? (
          <div className="empty-state"><Loader2 size={18} className="spinner" /> Cargando municipios...</div>
        ) : municipios.length === 0 ? (
          <div className="empty-state">No hay municipios para los filtros seleccionados.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Código DANE</th>
                <th>Municipio</th>
                <th>Departamento</th>
                <th>Región</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {municipios.map(municipio => (
                <tr key={municipio.codigo}>
                  <td className="font-mono">{municipio.codigo}</td>
                  <td>{municipio.nombre}</td>
                  <td>{municipio.departamento_nombre} <span className="text-muted">({municipio.departamento_codigo})</span></td>
                  <td>{municipio.region || '-'}</td>
                  <td>
                    <span className={`badge ${municipio.activo ? 'badge-success' : 'badge-muted'}`}>
                      {municipio.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="municipios-dane-actions">
                      <button className="btn-icon" type="button" onClick={() => abrirEditar(municipio)} aria-label={`Editar ${municipio.nombre}`}>
                        <Edit2 size={16} />
                      </button>
                      <button className="btn-icon" type="button" onClick={() => toggleActivo(municipio)} aria-label={municipio.activo ? `Inactivar ${municipio.nombre}` : `Activar ${municipio.nombre}`}>
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
              <h2 className="modal-title"><MapPin size={20} className="text-accent" /> {editando ? 'Editar municipio DANE' : 'Nuevo municipio DANE'}</h2>
              <button className="btn-icon" type="button" onClick={cerrarForm} aria-label="Cerrar modal">
                <X size={18} />
              </button>
            </div>
            <div className="modal-body municipios-dane-form">
              <div className="municipios-dane-form-grid">
                <div className="input-group">
                  <label>Código DANE *</label>
                  <input
                    className="input"
                    value={form.codigo_dane}
                    onChange={e => setField('codigo_dane', e.target.value)}
                    disabled={Boolean(editando)}
                    placeholder="Ej: 41298"
                    maxLength={8}
                  />
                </div>
                <div className="input-group">
                  <label>Departamento DANE *</label>
                  <input
                    className="input"
                    value={form.departamento_dane}
                    onChange={e => setField('departamento_dane', e.target.value)}
                    placeholder="Ej: 41"
                    maxLength={2}
                  />
                </div>
              </div>
              <div className="input-group">
                <label>Nombre del municipio *</label>
                <input className="input" value={form.municipio_nombre} onChange={e => setField('municipio_nombre', e.target.value)} placeholder="Ej: Garzón" />
              </div>
              <div className="municipios-dane-form-grid">
                <div className="input-group">
                  <label>Departamento *</label>
                  <input className="input" value={form.departamento_nombre} onChange={e => setField('departamento_nombre', e.target.value)} placeholder="Ej: Huila" />
                </div>
                <div className="input-group">
                  <label>Región</label>
                  <input className="input" value={form.region} onChange={e => setField('region', e.target.value)} placeholder="Ej: Andina" />
                </div>
              </div>
              <label className="municipios-dane-check">
                <input type="checkbox" checked={form.activo} onChange={e => setField('activo', e.target.checked)} />
                <span>Disponible en la búsqueda de terceros</span>
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
