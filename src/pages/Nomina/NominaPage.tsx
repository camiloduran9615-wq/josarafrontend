import { useState, useEffect } from 'react'
import {
  Plus, Loader2, AlertCircle,
  CheckCircle2, X, Download, Play, UserCheck,
} from 'lucide-react'
import { api } from '@/lib/api'
import { getTenantId } from '@/services/auth.service'

const fmt = (n: number) =>
  Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })

type Tab = 'empleados' | 'periodos' | 'liquidaciones'

interface Empleado {
  id: string; primer_nombre: string; segundo_nombre?: string
  primer_apellido: string; segundo_apellido?: string
  numero_documento: string; tipo_documento: string
  email?: string; activo: boolean
  contratos: Contrato[]
}

interface Contrato {
  id: string; tipo_contrato: string; salario_basico: number
  fecha_inicio: string; fecha_fin?: string; cargo?: string; activo: boolean
}

interface PeriodoNomina {
  id: string; codigo: string; tipo: string
  fecha_inicio: string; fecha_fin: string
  año: number; mes: number; estado: string
}

interface Liquidacion {
  id: string; estado: string
  total_devengado: number; total_deduccion: number; neto_pagar: number
  dias_laborados: number
  empleado: Empleado
  periodo: PeriodoNomina
  nomina_dian?: { cune: string; estado_dian: string }
}

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const estadoColor: Record<string, string> = {
  borrador:     'bg-slate-700 text-slate-300',
  aprobado:     'bg-green-900/40 text-green-300 border border-green-700',
  transmitido:  'bg-blue-900/40 text-blue-300 border border-blue-700',
  rechazado:    'bg-red-900/40 text-red-300 border border-red-700',
}

export default function NominaPage() {
  const [tab, setTab]               = useState<Tab>('empleados')
  const [empleados, setEmpleados]   = useState<Empleado[]>([])
  const [periodos, setPeriodos]     = useState<PeriodoNomina[]>([])
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([])
  const [periodoSel, setPeriodoSel] = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [showNuevoEmp, setShowNuevoEmp] = useState(false)
  const [showLiquidar, setShowLiquidar] = useState(false)
  const [formEmp, setFormEmp]       = useState({ tipo_documento: 'CC', numero_documento: '', primer_nombre: '', primer_apellido: '', email: '' })
  const [formLiq, setFormLiq]       = useState({ empleado_id: '', periodo_id: '', horas_extra_diurnas: '', bonificacion: '' })
  const [saving, setSaving]         = useState(false)

  const T = getTenantId()

  useEffect(() => { fetchEmpleados(); fetchPeriodos() }, [])
  useEffect(() => { if (periodoSel) fetchLiquidaciones() }, [periodoSel])

  const fetchEmpleados = async () => {
    setLoading(true)
    try { const r = await api.get(`/${T}/empleados`); setEmpleados(r.data.data ?? []) }
    catch { setError('Error cargando empleados') }
    finally { setLoading(false) }
  }

  const fetchPeriodos = async () => {
    try {
      const r = await api.get(`/${T}/periodos-nomina`)
      setPeriodos(r.data.data ?? [])
      if (r.data.data?.length) setPeriodoSel(r.data.data[0].id)
    } catch { /* silencioso */ }
  }

  const fetchLiquidaciones = async () => {
    if (!periodoSel) return
    try {
      const r = await api.get(`/${T}/liquidaciones`, { params: { periodo_id: periodoSel } })
      setLiquidaciones(r.data.data ?? [])
    } catch { /* silencioso */ }
  }

  const guardarEmpleado = async () => {
    setSaving(true); setError('')
    try {
      await api.post(`/${T}/empleados`, formEmp)
      await fetchEmpleados()
      setShowNuevoEmp(false)
      setFormEmp({ tipo_documento: 'CC', numero_documento: '', primer_nombre: '', primer_apellido: '', email: '' })
    } catch (e: any) { setError(e?.response?.data?.message ?? 'Error guardando') }
    finally { setSaving(false) }
  }

  const ejecutarLiquidacion = async () => {
    if (!formLiq.empleado_id || !formLiq.periodo_id) { setError('Selecciona empleado y período'); return }
    setSaving(true); setError('')
    try {
      await api.post(`/${T}/liquidaciones/${formLiq.empleado_id}/${formLiq.periodo_id}`, {
        horas_extra_diurnas: formLiq.horas_extra_diurnas ? Number(formLiq.horas_extra_diurnas) : 0,
        bonificacion:        formLiq.bonificacion ? Number(formLiq.bonificacion) : 0,
      })
      await fetchLiquidaciones()
      setShowLiquidar(false)
      setTab('liquidaciones')
    } catch (e: any) { setError(e?.response?.data?.message ?? 'Error liquidando') }
    finally { setSaving(false) }
  }

  const aprobarLiquidacion = async (id: string) => {
    try { await api.post(`/${T}/liquidaciones/${id}/aprobar`); await fetchLiquidaciones() }
    catch (e: any) { setError(e?.response?.data?.message ?? 'Error aprobando') }
  }

  const generarXml = async (id: string) => {
    try {
      const r = await api.get(`/${T}/liquidaciones/${id}/xml`)
      alert(`XML generado — CUNE: ${r.data.data.cune?.slice(0, 20)}...`)
    } catch (e: any) { setError(e?.response?.data?.message ?? 'Error generando XML') }
  }

  const crearPeriodoMes = async () => {
    const hoy   = new Date()
    const año   = hoy.getFullYear()
    const mes   = hoy.getMonth() + 1
    const inicio = `${año}-${String(mes).padStart(2,'0')}-01`
    const fin    = new Date(año, mes, 0).toISOString().split('T')[0]
    try {
      await api.post(`/${T}/periodos-nomina`, { tipo: 'mensual', fecha_inicio: inicio, fecha_fin: fin, año, mes })
      await fetchPeriodos()
    } catch (e: any) { setError(e?.response?.data?.message ?? 'Error creando período') }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg"><UserCheck size={20} className="text-white" /></div>
          <div>
            <h1 className="text-xl font-bold text-white">Nómina Electrónica</h1>
            <p className="text-xs text-slate-400">Liquidación y transmisión DIAN — Anexo técnico 1.0</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowLiquidar(true)}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">
            <Play size={14} /> Liquidar empleado
          </button>
          <button onClick={() => setShowNuevoEmp(true)}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">
            <Plus size={14} /> Nuevo empleado
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-900/30 border border-red-700 rounded-lg p-3 mb-4 text-red-300 text-sm">
          <AlertCircle size={16} />{error}
          <button onClick={() => setError('')} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-800 p-1 rounded-lg w-fit">
        {([['empleados','Empleados'],['periodos','Períodos'],['liquidaciones','Liquidaciones']] as [Tab,string][]).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors
              ${tab === id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* TAB: Empleados */}
      {tab === 'empleados' && (
        <div className="bg-slate-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 flex items-center justify-center gap-2 text-slate-500">
              <Loader2 size={18} className="animate-spin" />Cargando...
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-700/60">
                <tr>
                  <th className="py-2 px-4 text-left text-xs font-semibold text-slate-400">Empleado</th>
                  <th className="py-2 px-4 text-left text-xs font-semibold text-slate-400">Documento</th>
                  <th className="py-2 px-4 text-left text-xs font-semibold text-slate-400">Cargo</th>
                  <th className="py-2 px-4 text-right text-xs font-semibold text-slate-400">Salario</th>
                  <th className="py-2 px-4 text-center text-xs font-semibold text-slate-400">Estado</th>
                </tr>
              </thead>
              <tbody>
                {empleados.map(e => {
                  const contrato = e.contratos?.find(c => c.activo)
                  return (
                    <tr key={e.id} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                      <td className="py-2 px-4">
                        <p className="text-slate-200 font-medium">{e.primer_nombre} {e.primer_apellido}</p>
                        <p className="text-xs text-slate-500">{e.email}</p>
                      </td>
                      <td className="py-2 px-4 text-slate-400 text-xs font-mono">{e.tipo_documento} {e.numero_documento}</td>
                      <td className="py-2 px-4 text-slate-400 text-xs">{contrato?.cargo ?? '—'}</td>
                      <td className="py-2 px-4 text-right font-mono text-slate-200">
                        {contrato ? `$${fmt(contrato.salario_basico)}` : '—'}
                      </td>
                      <td className="py-2 px-4 text-center">
                        <span className={`text-xs rounded px-2 py-0.5 ${e.activo ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'}`}>
                          {e.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {empleados.length === 0 && (
                  <tr><td colSpan={5} className="py-10 text-center text-slate-500 text-sm">No hay empleados registrados</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB: Períodos */}
      {tab === 'periodos' && (
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={crearPeriodoMes}
              className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm">
              <Plus size={14} /> Crear período mes actual
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {periodos.map(p => (
              <div key={p.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
                <p className="font-semibold text-white">{MESES[p.mes - 1]} {p.año}</p>
                <p className="text-xs text-slate-400 mt-1">{p.fecha_inicio} → {p.fecha_fin}</p>
                <p className="text-xs font-mono text-slate-500 mt-1">{p.codigo}</p>
                <span className={`mt-2 inline-block text-xs rounded px-2 py-0.5 ${estadoColor[p.estado] ?? 'bg-slate-700 text-slate-400'}`}>
                  {p.estado}
                </span>
              </div>
            ))}
            {periodos.length === 0 && (
              <p className="col-span-3 text-center text-slate-500 py-8 text-sm">No hay períodos creados</p>
            )}
          </div>
        </div>
      )}

      {/* TAB: Liquidaciones */}
      {tab === 'liquidaciones' && (
        <div>
          {periodos.length > 0 && (
            <div className="flex items-center gap-3 mb-4">
              <label className="text-xs text-slate-400">Período:</label>
              <select value={periodoSel} onChange={e => setPeriodoSel(e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white">
                {periodos.map(p => (
                  <option key={p.id} value={p.id}>{MESES[p.mes - 1]} {p.año}</option>
                ))}
              </select>
            </div>
          )}
          <div className="bg-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-700/60">
                <tr>
                  <th className="py-2 px-4 text-left text-xs font-semibold text-slate-400">Empleado</th>
                  <th className="py-2 px-3 text-right text-xs font-semibold text-green-400">Devengado</th>
                  <th className="py-2 px-3 text-right text-xs font-semibold text-red-400">Deducción</th>
                  <th className="py-2 px-3 text-right text-xs font-semibold text-white">Neto</th>
                  <th className="py-2 px-4 text-center text-xs font-semibold text-slate-400">Estado</th>
                  <th className="py-2 px-4 text-center text-xs font-semibold text-slate-400">DIAN</th>
                  <th className="py-2 px-4 text-center text-xs font-semibold text-slate-400">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {liquidaciones.map(liq => (
                  <tr key={liq.id} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                    <td className="py-2 px-4 text-slate-200">
                      {liq.empleado?.primer_nombre} {liq.empleado?.primer_apellido}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-green-300">${fmt(liq.total_devengado)}</td>
                    <td className="py-2 px-3 text-right font-mono text-red-300">${fmt(liq.total_deduccion)}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-white">${fmt(liq.neto_pagar)}</td>
                    <td className="py-2 px-4 text-center">
                      <span className={`text-xs rounded px-2 py-0.5 ${estadoColor[liq.estado] ?? 'bg-slate-700 text-slate-300'}`}>
                        {liq.estado}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-center">
                      {liq.nomina_dian ? (
                        <span className="text-xs text-blue-300">{liq.nomina_dian.estado_dian}</span>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex items-center justify-center gap-2">
                        {liq.estado === 'borrador' && (
                          <button onClick={() => aprobarLiquidacion(liq.id)} title="Aprobar"
                            className="p-1 text-green-400 hover:text-green-300">
                            <CheckCircle2 size={14} />
                          </button>
                        )}
                        {liq.estado === 'aprobado' && (
                          <button onClick={() => generarXml(liq.id)} title="Generar XML DIAN"
                            className="p-1 text-blue-400 hover:text-blue-300">
                            <Download size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {liquidaciones.length === 0 && (
                  <tr><td colSpan={7} className="py-10 text-center text-slate-500 text-sm">
                    No hay liquidaciones para este período
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Nuevo Empleado */}
      {showNuevoEmp && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h2 className="font-semibold text-white text-sm">Nuevo empleado</h2>
              <button onClick={() => setShowNuevoEmp(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Tipo documento</label>
                  <select value={formEmp.tipo_documento} onChange={e => setFormEmp(f => ({...f, tipo_documento: e.target.value}))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white">
                    {['CC','CE','PA','NIT'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Número documento</label>
                  <input value={formEmp.numero_documento} onChange={e => setFormEmp(f => ({...f, numero_documento: e.target.value}))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Primer nombre</label>
                  <input value={formEmp.primer_nombre} onChange={e => setFormEmp(f => ({...f, primer_nombre: e.target.value}))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Primer apellido</label>
                  <input value={formEmp.primer_apellido} onChange={e => setFormEmp(f => ({...f, primer_apellido: e.target.value}))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Email</label>
                <input type="email" value={formEmp.email} onChange={e => setFormEmp(f => ({...f, email: e.target.value}))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white" />
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
            <div className="flex gap-3 p-4 border-t border-slate-700">
              <button onClick={() => setShowNuevoEmp(false)}
                className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm">Cancelar</button>
              <button onClick={guardarEmpleado} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : null} Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Liquidar */}
      {showLiquidar && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h2 className="font-semibold text-white text-sm">Liquidar empleado</h2>
              <button onClick={() => setShowLiquidar(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Empleado</label>
                <select value={formLiq.empleado_id} onChange={e => setFormLiq(f => ({...f, empleado_id: e.target.value}))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white">
                  <option value="">Seleccionar…</option>
                  {empleados.filter(e => e.activo).map(e => (
                    <option key={e.id} value={e.id}>{e.primer_nombre} {e.primer_apellido}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Período</label>
                <select value={formLiq.periodo_id} onChange={e => setFormLiq(f => ({...f, periodo_id: e.target.value}))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white">
                  <option value="">Seleccionar…</option>
                  {periodos.map(p => (
                    <option key={p.id} value={p.id}>{MESES[p.mes - 1]} {p.año}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Hrs extra diurnas</label>
                  <input type="number" min="0" value={formLiq.horas_extra_diurnas}
                    onChange={e => setFormLiq(f => ({...f, horas_extra_diurnas: e.target.value}))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Bonificación</label>
                  <input type="number" min="0" value={formLiq.bonificacion}
                    onChange={e => setFormLiq(f => ({...f, bonificacion: e.target.value}))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white" />
                </div>
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
            <div className="flex gap-3 p-4 border-t border-slate-700">
              <button onClick={() => setShowLiquidar(false)}
                className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm">Cancelar</button>
              <button onClick={ejecutarLiquidacion} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Liquidar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
