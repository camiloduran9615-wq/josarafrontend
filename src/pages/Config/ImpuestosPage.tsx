import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { getTenantId } from '@/services/auth.service'
import { Percent, Plus, Edit2, Power, X, Check, Loader2, AlertCircle } from 'lucide-react'

interface Impuesto {
  id:                 string
  codigo:             string
  nombre:             string
  tipo:               string
  tarifa_porcentaje:  string | number  // backend serializa decimal como string
  base_minima_uvt:    string | number | null
  aplica_compras:     boolean
  aplica_ventas:      boolean
  vigencia_desde:     string
  vigencia_hasta:     string | null
  sistema:            boolean
  activa:             boolean
  editable?:          boolean
}

const TIPO_LABELS: Record<string, string> = {
  iva:        'IVA',
  retefuente: 'ReteFuente',
  reteiva:    'ReteIVA',
  reteica:    'ReteICA',
}

const TIPO_COLORS: Record<string, string> = {
  iva:        'bg-blue-900/40 text-blue-300 border border-blue-700',
  retefuente: 'bg-orange-900/40 text-orange-300 border border-orange-700',
  reteiva:    'bg-purple-900/40 text-purple-300 border border-purple-700',
  reteica:    'bg-teal-900/40 text-teal-300 border border-teal-700',
}

const emptyForm = {
  codigo:            '',
  nombre:            '',
  tipo:              'iva',
  tarifa_porcentaje: 0,
  base_minima_uvt:   '',
  aplica_compras:    true,
  aplica_ventas:     false,
}

export default function ImpuestosPage({ embedded = false }: { embedded?: boolean }) {
  const [impuestos, setImpuestos]   = useState<Impuesto[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [showForm, setShowForm]     = useState(false)
  const [editando, setEditando]     = useState<Impuesto | null>(null)
  const [saving, setSaving]         = useState(false)
  const [form, setForm]             = useState({ ...emptyForm })
  const [filtroTipo, setFiltroTipo] = useState('')

  useEffect(() => { fetchImpuestos() }, [])

  const fetchImpuestos = async () => {
    try {
      setLoading(true); setError('')
      const res = await api.get(`/${getTenantId()}/impuestos`)
      setImpuestos(res.data.data ?? [])
    } catch {
      setError('No se pudieron cargar los impuestos.')
    } finally {
      setLoading(false)
    }
  }

  const abrirNuevo = () => {
    setEditando(null)
    setForm({ ...emptyForm })
    setShowForm(true)
  }

  const abrirEditar = (imp: Impuesto) => {
    if (imp.sistema) return
    setEditando(imp)
    setForm({
      codigo:            imp.codigo,
      nombre:            imp.nombre,
      tipo:              imp.tipo,
      tarifa_porcentaje: Number(imp.tarifa_porcentaje),
      base_minima_uvt:   imp.base_minima_uvt != null ? String(imp.base_minima_uvt) : '',
      aplica_compras:    imp.aplica_compras,
      aplica_ventas:     imp.aplica_ventas,
    })
    setShowForm(true)
  }

  const cerrarForm = () => { setShowForm(false); setEditando(null) }

  const guardar = async () => {
    setSaving(true); setError('')
    const payload = {
      ...form,
      tarifa_porcentaje: Number(form.tarifa_porcentaje),
      base_minima_uvt:   form.base_minima_uvt ? Number(form.base_minima_uvt) : null,
    }
    try {
      if (editando) {
        await api.put(`/${getTenantId()}/impuestos/${editando.id}`, payload)
      } else {
        await api.post(`/${getTenantId()}/impuestos`, payload)
      }
      await fetchImpuestos()
      cerrarForm()
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Error al guardar.')
    } finally {
      setSaving(false)
    }
  }

  const toggleActivo = async (imp: Impuesto) => {
    if (imp.sistema) return
    try {
      await api.delete(`/${getTenantId()}/impuestos/${imp.id}`)
      await fetchImpuestos()
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Error al cambiar estado.')
    }
  }

  const filtrados = filtroTipo
    ? impuestos.filter(i => i.tipo === filtroTipo)
    : impuestos

  return (
    <div className={embedded ? '' : 'p-6 max-w-5xl mx-auto'}>
      {!embedded && (
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-600 rounded-lg"><Percent size={20} className="text-white" /></div>
          <div>
            <h1 className="text-xl font-bold text-white">Impuestos</h1>
            <p className="text-xs text-slate-400">IVA, ReteFuente, ReteIVA, ReteICA — catálogo parametrizable</p>
          </div>
        </div>
      )}

      {/* Barra de acciones */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={filtroTipo}
          onChange={e => setFiltroTipo(e.target.value)}
          className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="">Todos los tipos</option>
          {Object.entries(TIPO_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button
          onClick={abrirNuevo}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
        >
          <Plus size={14} /> Nuevo impuesto
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-900/30 border border-red-700 rounded-lg p-3 mb-4 text-red-300 text-sm">
          <AlertCircle size={16} />{error}
        </div>
      )}

      {/* Modal formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h2 className="font-semibold text-white text-sm">
                {editando ? 'Editar impuesto' : 'Nuevo impuesto'}
              </h2>
              <button onClick={cerrarForm}><X size={18} className="text-slate-400 hover:text-white" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Código DIAN</label>
                  <input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
                    placeholder="Ej: IVA19" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Tipo</label>
                  <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white">
                    {Object.entries(TIPO_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nombre</label>
                <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
                  placeholder="Ej: IVA General 19%" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Tarifa (%)</label>
                  <input type="number" step="0.0001" min="0" max="100"
                    value={form.tarifa_porcentaje}
                    onChange={e => setForm(f => ({ ...f, tarifa_porcentaje: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Base mínima (UVT)</label>
                  <input type="number" min="0" step="0.01"
                    value={form.base_minima_uvt}
                    onChange={e => setForm(f => ({ ...f, base_minima_uvt: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
                    placeholder="Vacío = sin mínimo" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Aplica a</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white cursor-pointer">
                    <input type="checkbox"
                      checked={form.aplica_compras}
                      onChange={e => setForm(f => ({ ...f, aplica_compras: e.target.checked }))} />
                    Compras
                  </label>
                  <label className="flex items-center gap-2 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white cursor-pointer">
                    <input type="checkbox"
                      checked={form.aplica_ventas}
                      onChange={e => setForm(f => ({ ...f, aplica_ventas: e.target.checked }))} />
                    Ventas
                  </label>
                </div>
                <p className="text-xs text-slate-500 mt-1">Debe marcarse al menos una.</p>
              </div>
              {error && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle size={12} />{error}
                </p>
              )}
            </div>
            <div className="flex gap-3 p-4 border-t border-slate-700">
              <button onClick={cerrarForm}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm">
                Cancelar
              </button>
              <button onClick={guardar} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-slate-800 rounded-xl overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2">
            <Loader2 size={18} className="animate-spin" />Cargando...
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-slate-700/60">
              <tr>
                <th className="py-2 px-3 text-left text-xs font-semibold text-slate-400">Código</th>
                <th className="py-2 px-3 text-left text-xs font-semibold text-slate-400">Nombre</th>
                <th className="py-2 px-3 text-left text-xs font-semibold text-slate-400">Tipo</th>
                <th className="py-2 px-2 text-right text-xs font-semibold text-slate-400">Tarifa</th>
                <th className="py-2 px-2 text-right text-xs font-semibold text-slate-400">Base UVT</th>
                <th className="py-2 px-3 text-left text-xs font-semibold text-slate-400">Aplica a</th>
                <th className="py-2 px-3 text-center text-xs font-semibold text-slate-400">Estado</th>
                <th className="py-2 px-3 text-center text-xs font-semibold text-slate-400">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(imp => {
                const aplicaLabel = imp.aplica_compras && imp.aplica_ventas
                  ? 'Compras + Ventas'
                  : imp.aplica_compras ? 'Compras'
                  : imp.aplica_ventas  ? 'Ventas'
                  : '—'
                return (
                <tr key={imp.id} className={`border-b border-slate-700/30 hover:bg-slate-700/20 ${!imp.activa ? 'opacity-50' : ''}`}>
                  <td className="py-2 px-3 font-mono text-slate-300">{imp.codigo}</td>
                  <td className="py-2 px-3 text-slate-200">
                    {imp.nombre}
                    {imp.sistema && (
                      <span className="ml-2 text-xs bg-slate-600 text-slate-400 rounded px-1">sistema</span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <span className={`text-xs rounded px-2 py-0.5 ${TIPO_COLORS[imp.tipo] ?? 'bg-slate-700 text-slate-300'}`}>
                      {TIPO_LABELS[imp.tipo] ?? imp.tipo}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-slate-200">
                    {Number(imp.tarifa_porcentaje).toFixed(2)}%
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-slate-400">
                    {imp.base_minima_uvt != null && imp.base_minima_uvt !== '' ? Number(imp.base_minima_uvt).toFixed(2) : '—'}
                  </td>
                  <td className="py-2 px-3 text-slate-400">{aplicaLabel}</td>
                  <td className="py-2 px-3 text-center">
                    <span className={`text-xs rounded px-2 py-0.5 ${imp.activa ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'}`}>
                      {imp.activa ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => abrirEditar(imp)}
                        disabled={imp.sistema}
                        title={imp.sistema ? 'Impuesto de sistema — no editable' : 'Editar'}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => toggleActivo(imp)}
                        disabled={imp.sistema}
                        title={imp.sistema ? 'Impuesto de sistema' : imp.activa ? 'Desactivar' : 'Activar'}
                        className={`p-1 disabled:opacity-30 disabled:cursor-not-allowed
                          ${imp.activa ? 'text-green-400 hover:text-red-400' : 'text-slate-500 hover:text-green-400'}`}
                      >
                        <Power size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
                )
              })}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    <Percent size={20} className="mx-auto mb-1" />
                    No hay impuestos configurados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-right text-xs text-slate-600 mt-2">{impuestos.length} impuestos registrados</p>
    </div>
  )
}
