import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { getAxiosErrorData } from '@/lib/errors'
import { getTenantId } from '@/services/auth.service'
import { Building, Plus, MapPin, Phone, Edit2, Power, Star, X, Save, Loader2 } from 'lucide-react'

interface Sucursal {
  id:           string
  nombre:       string
  direccion:    string | null
  ciudad:       string | null
  telefono:     string | null
  es_principal: boolean
  activa:       boolean
}

const emptyForm = {
  nombre:       '',
  direccion:    '',
  ciudad:       '',
  telefono:     '',
  es_principal: false,
}

export default function SucursalesPage({ embedded = false }: { embedded?: boolean }) {
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [editando, setEditando]     = useState<Sucursal | null>(null)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')
  const [form, setForm]             = useState({ ...emptyForm })

  useEffect(() => { fetchSucursales() }, [])

  const fetchSucursales = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/${getTenantId()}/sucursales`)
      setSucursales(res.data.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const abrirNuevo = () => {
    setEditando(null)
    setForm({ ...emptyForm })
    setError('')
    setShowForm(true)
  }

  const abrirEditar = (s: Sucursal) => {
    setEditando(s)
    setForm({
      nombre:       s.nombre ?? '',
      direccion:    s.direccion ?? '',
      ciudad:       s.ciudad ?? '',
      telefono:     s.telefono ?? '',
      es_principal: s.es_principal,
    })
    setError('')
    setShowForm(true)
  }

  const cerrarModal = () => {
    setShowForm(false)
    setEditando(null)
    setError('')
  }

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editando) {
        await api.put(`/${getTenantId()}/sucursales/${editando.id}`, form)
      } else {
        await api.post(`/${getTenantId()}/sucursales`, form)
      }
      await fetchSucursales()
      cerrarModal()
    } catch (err) {
      const data = getAxiosErrorData(err)?.data
      const msg = data?.message
        ?? Object.values((data?.errors as Record<string, unknown>) ?? {}).flat().join(' · ')
        ?? 'Error al guardar la sucursal.'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (id: string) => {
    try {
      await api.delete(`/${getTenantId()}/sucursales/${id}`)
      fetchSucursales()
    } catch (err) { console.error(err) }
  }

  return (
    <div className={embedded ? "" : "page-container"}>
      <div className="page-header">
        <div>
          {!embedded && (
            <h1 className="page-title flex items-center gap-3">
              <Building size={28} className="text-accent" />
              Sucursales de la Empresa
            </h1>
          )}
          <p className="page-subtitle">Administra las sedes físicas de tu negocio para el control de inventario y ventas.</p>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-primary" onClick={abrirNuevo}>
            <Plus size={18} /> Nueva Sucursal
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-10"><span className="spinner" /></div>
        ) : sucursales.length === 0 ? (
          <div className="col-span-full card p-10 text-center">
            <Building size={48} className="mx-auto mb-4 text-muted opacity-20" />
            <p className="text-muted">No has registrado sucursales adicionales.</p>
          </div>
        ) : sucursales.map(s => (
          <div key={s.id} className={`card border-t-4 ${s.es_principal ? 'border-t-accent' : 'border-t-muted'} hover:shadow-xl transition-all`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  {s.nombre}
                  {s.es_principal && <Star size={16} className="text-accent fill-accent" />}
                </h3>
                <span className={`badge ${s.activa ? 'badge-success' : 'badge-danger'} mt-1`}>
                  {s.activa ? 'Activa' : 'Inactiva'}
                </span>
              </div>
              <div className="flex gap-1">
                <button
                  className="btn-icon btn-icon-sm"
                  title="Editar"
                  onClick={() => abrirEditar(s)}
                >
                  <Edit2 size={12} />
                </button>
                <button
                  className="btn-icon btn-icon-sm text-danger"
                  onClick={() => handleToggle(s.id)}
                  title="Cambiar Estado"
                >
                  <Power size={12} />
                </button>
              </div>
            </div>

            <div className="space-y-2 text-sm text-muted">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-accent" />
                {[s.direccion, s.ciudad].filter(Boolean).join(', ') || 'Sin dirección'}
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-accent" />
                {s.telefono || 'Sin teléfono'}
              </div>
            </div>

            {s.es_principal && (
              <div className="mt-6 pt-4 border-t border-muted flex justify-center items-center text-xs">
                <span className="badge badge-secondary">Sede principal — usada por defecto</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Modal de crear / editar ──────────────────────────────────────── */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={cerrarModal}
        >
          <div
            className="card w-full max-w-lg animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Building size={22} className="text-accent" />
                {editando ? 'Editar Sucursal' : 'Nueva Sucursal'}
              </h2>
              <button className="btn-icon" onClick={cerrarModal}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGuardar} className="flex flex-col gap-4">
              <div className="input-group">
                <label>Nombre de la sucursal *</label>
                <input
                  type="text" className="input"
                  placeholder="Ej: Sede Principal Garzón"
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              <div className="input-group">
                <label>Dirección</label>
                <input
                  type="text" className="input"
                  placeholder="Ej: Calle 12 # 5-23"
                  value={form.direccion}
                  onChange={e => setForm({ ...form, direccion: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="input-group">
                  <label>Ciudad</label>
                  <input
                    type="text" className="input"
                    placeholder="Ej: Garzón, Huila"
                    value={form.ciudad}
                    onChange={e => setForm({ ...form, ciudad: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label>Teléfono</label>
                  <input
                    type="text" className="input"
                    placeholder="3155792078"
                    value={form.telefono}
                    onChange={e => setForm({ ...form, telefono: e.target.value })}
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-muted hover:bg-surface-light transition-colors">
                <input
                  type="checkbox"
                  checked={form.es_principal}
                  onChange={e => setForm({ ...form, es_principal: e.target.checked })}
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <div className="font-medium flex items-center gap-2">
                    <Star size={14} className="text-accent" />
                    Marcar como sede principal
                  </div>
                  <p className="text-xs text-muted mt-1">
                    Será la sucursal por defecto en facturas y reportes. Solo puede haber una.
                  </p>
                </div>
              </label>

              {error && (
                <p className="text-sm text-danger">⚠ {error}</p>
              )}

              <div className="flex justify-end gap-3 mt-2">
                <button type="button" className="btn btn-secondary" onClick={cerrarModal} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving
                    ? <Loader2 size={16} className="spinner" />
                    : <><Save size={16} /> {editando ? 'Guardar cambios' : 'Crear sucursal'}</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
