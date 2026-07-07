import { useState, useEffect, useRef } from 'react'
import {
  Landmark, Upload, Loader2, AlertCircle,
  X, CheckCircle2, Clock, ChevronRight, Zap, Link2,
  FileBarChart, XCircle,
} from 'lucide-react'
import { api } from '@/lib/api'
import { extractApiError } from '@/lib/errors'
import { getTenantId } from '@/services/auth.service'

const fmt = (n: number) =>
  Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })

interface Extracto {
  id: string; banco: string; numero_cuenta: string
  periodo_inicio: string; periodo_fin: string
  saldo_inicial: number; saldo_final: number
  estado: string; archivo_nombre?: string; created_at: string
}

interface LineaExtracto {
  id: string; fecha: string; descripcion: string
  referencia?: string; debito: number; credito: number
  saldo: number; estado_conciliacion: string
}

interface Stats {
  total: number; conciliadas: number; pendientes: number
  total_debito: number; total_credito: number
}

interface DocCandidato {
  id: string
  numero?: string
  fecha: string
  monto: number
  tercero?: string
}

interface ApiDocumentoCandidato {
  id: string
  numero?: string
  consecutivo?: string
  fecha: string
  valor_recibido?: number
  total?: number
  tercero?: { nombre?: string }
  nombre_tercero?: string
}

type ReporteRow = Record<string, string | number | null | undefined>

interface ReporteSeccion {
  total: number
  detalle: ReporteRow[]
}

interface ReporteConciliacion {
  extracto: {
    banco: string
    numero_cuenta: string
    periodo_inicio: string
    periodo_fin: string
    saldo_final: number
  }
  conciliacion_matematica: {
    saldo_banco_segun_extracto: number
    menos_cheques_no_cobrados: number
    saldo_banco_ajustado: number
    saldo_libro_segun_contabilidad: number | null
    mas_consignaciones_pendientes: number
    menos_notas_debito_banco: number
    saldo_libro_ajustado: number | null
    conciliado: boolean
    diferencia: number | null
  }
  partidas_conciliatorias: {
    consignaciones_no_registradas: ReporteSeccion
    cheques_no_cobrados: ReporteSeccion
    notas_debito_banco_no_registradas: ReporteSeccion
  }
}

function buildCandidatos(data: ApiDocumentoCandidato[], tipo: 'ReciboCaja' | 'ComprobanteEgreso'): DocCandidato[] {
  return (data ?? []).map((d) => ({
    id:      d.id,
    numero:  d.numero ?? d.consecutivo ?? '—',
    fecha:   d.fecha,
    monto:   tipo === 'ReciboCaja' ? (d.valor_recibido ?? d.total ?? 0) : (d.total ?? 0),
    tercero: d.tercero?.nombre ?? d.nombre_tercero ?? '',
  }))
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function ConciliacionPage() {
  const [extractos, setExtractos]           = useState<Extracto[]>([])
  const [extractoSel, setExtractoSel]       = useState<Extracto | null>(null)
  const [lineas, setLineas]                 = useState<LineaExtracto[]>([])
  const [stats, setStats]                   = useState<Stats | null>(null)
  const [loading, setLoading]               = useState(false)
  const [loadingLineas, setLoadingLineas]   = useState(false)
  const [conciliandoAuto, setConcAuto]      = useState(false)
  const [error, setError]                   = useState('')
  const [showImportar, setShowImportar]     = useState(false)
  const [saving, setSaving]                 = useState(false)
  const fileRef                             = useRef<HTMLInputElement>(null)
  const [formImport, setFormImport]         = useState({
    banco: '', numero_cuenta: '', periodo_inicio: '', periodo_fin: '', saldo_inicial: '',
  })
  const [archivo, setArchivo]               = useState<File | null>(null)
  const [filtroEstado, setFiltroEstado]     = useState('')

  // ── Estado modal conciliación manual ────────────────────────────────────
  const [lineaManual, setLineaManual]       = useState<LineaExtracto | null>(null)
  const [origenType, setOrigenType]         = useState<'ReciboCaja' | 'ComprobanteEgreso'>('ReciboCaja')
  const [candidatos, setCandidatos]         = useState<DocCandidato[]>([])
  const [loadingCand, setLoadingCand]       = useState(false)
  const [origenId, setOrigenId]             = useState('')
  const [notaManual, setNotaManual]         = useState('')
  const [savingManual, setSavingManual]     = useState(false)
  const [busquedaDoc, setBusquedaDoc]       = useState('')

  // ── Reporte de conciliación (papel de trabajo) ──────────────────────────
  const [reporteOpen, setReporteOpen]       = useState(false)
  const [reporteData, setReporteData]       = useState<ReporteConciliacion | null>(null)
  const [loadingReporte, setLoadingReporte] = useState(false)

  const T = getTenantId()

  useEffect(() => {
    fetchExtractos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cuando cambia tipo de origen, recargar candidatos
  useEffect(() => {
    if (!lineaManual) return
    fetchCandidatos(origenType, lineaManual.fecha)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origenType, lineaManual])

  async function fetchExtractos() {
    setLoading(true)
    try { const r = await api.get(`/${T}/extractos-bancarios`); setExtractos(r.data.data ?? []) }
    catch { setError('Error cargando extractos') }
    finally { setLoading(false) }
  }

  const fetchLineas = async (extracto: Extracto) => {
    setExtractoSel(extracto)
    setLoadingLineas(true)
    try {
      const r = await api.get(`/${T}/extractos-bancarios/${extracto.id}/lineas`)
      setLineas(r.data.data ?? [])
      setStats(r.data.stats ?? null)
    } catch { setError('Error cargando líneas') }
    finally { setLoadingLineas(false) }
  }

  async function fetchCandidatos(tipo: 'ReciboCaja' | 'ComprobanteEgreso', fecha: string) {
    setLoadingCand(true)
    setOrigenId('')
    try {
      const endpoint = tipo === 'ReciboCaja' ? 'recibos-caja' : 'comprobantes-egreso'
      const r = await api.get(`/${T}/${endpoint}`)
      const docs = buildCandidatos(r.data.data ?? [], tipo)
      // ordenar: más cercanos a la fecha de la línea primero
      const base = new Date(fecha).getTime()
      docs.sort((a, b) =>
        Math.abs(new Date(a.fecha).getTime() - base) -
        Math.abs(new Date(b.fecha).getTime() - base)
      )
      setCandidatos(docs)
    } catch { setCandidatos([]) }
    finally { setLoadingCand(false) }
  }

  const abrirManual = (linea: LineaExtracto) => {
    setLineaManual(linea)
    setOrigenId('')
    setNotaManual('')
    setBusquedaDoc('')
    // Sugerir tipo según si es crédito (ingreso→ReciboCaja) o débito (egreso→ComprobanteEgreso)
    const tipoSugerido: 'ReciboCaja' | 'ComprobanteEgreso' =
      linea.credito > 0 ? 'ReciboCaja' : 'ComprobanteEgreso'
    setOrigenType(tipoSugerido)
  }

  const cerrarManual = () => {
    setLineaManual(null)
    setCandidatos([])
    setOrigenId('')
    setNotaManual('')
  }

  const submitManual = async () => {
    if (!lineaManual || !origenId || !extractoSel) return
    setSavingManual(true); setError('')
    try {
      await api.post(`/${T}/extractos-bancarios/${extractoSel.id}/conciliar-manual`, {
        linea_id:    lineaManual.id,
        origen_type: origenType,
        origen_id:   origenId,
        nota:        notaManual || null,
      })
      cerrarManual()
      await fetchLineas(extractoSel)
    } catch (e: unknown) {
      setError(extractApiError(e, 'Error en conciliacion manual.'))
    } finally { setSavingManual(false) }
  }

  const importar = async () => {
    if (!archivo) { setError('Selecciona un archivo CSV'); return }
    setSaving(true); setError('')
    const fd = new FormData()
    fd.append('archivo', archivo)
    Object.entries(formImport).forEach(([k, v]) => { if (v) fd.append(k, v) })
    try {
      const r = await api.post(`/${T}/extractos-bancarios/importar`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      await fetchExtractos()
      setShowImportar(false)
      setArchivo(null)
      setFormImport({ banco: '', numero_cuenta: '', periodo_inicio: '', periodo_fin: '', saldo_inicial: '' })
      const d = r.data.data
      alert(`Importado: ${d.lineas} líneas. ${d.errores?.length ? `Errores: ${d.errores.slice(0, 3).join(', ')}` : ''}`)
    } catch (e: unknown) { setError(extractApiError(e, 'Error importando extracto.')) }
    finally { setSaving(false) }
  }

  const conciliarAuto = async () => {
    if (!extractoSel) return
    setConcAuto(true); setError('')
    try {
      const r = await api.post(`/${T}/extractos-bancarios/${extractoSel.id}/conciliar-auto`)
      const d = r.data.data
      alert(`Conciliación automática: ${d.conciliadas} conciliadas, ${d.pendientes} pendientes.`)
      await fetchLineas(extractoSel)
    } catch (e: unknown) { setError(extractApiError(e, 'Error en conciliacion automatica.')) }
    finally { setConcAuto(false) }
  }

  const generarReporte = async () => {
    if (!extractoSel) return
    setLoadingReporte(true); setError(''); setReporteOpen(true)
    try {
      const r = await api.get(`/${T}/extractos-bancarios/${extractoSel.id}/reporte-conciliacion`)
      setReporteData(r.data.data)
    } catch (e: unknown) {
      setError(extractApiError(e, 'Error generando reporte de conciliacion.'))
      setReporteOpen(false)
    } finally { setLoadingReporte(false) }
  }

  const cerrarReporte = () => {
    setReporteOpen(false)
    setReporteData(null)
  }

  const lineasFiltradas = filtroEstado
    ? lineas.filter(l => l.estado_conciliacion === filtroEstado)
    : lineas

  const candidatosFiltrados = busquedaDoc
    ? candidatos.filter(c =>
        (c.numero ?? '').toLowerCase().includes(busquedaDoc.toLowerCase()) ||
        (c.tercero ?? '').toLowerCase().includes(busquedaDoc.toLowerCase()) ||
        fmt(c.monto).includes(busquedaDoc)
      )
    : candidatos

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="bank-reconcile-page page-container">
      <div className="page-header bank-reconcile-header">
        <div className="bank-reconcile-title-row">
          <div className="bank-reconcile-icon"><Landmark size={20} aria-hidden="true" /></div>
          <div>
            <h1 className="page-title">Conciliacion Bancaria</h1>
            <p className="page-subtitle">Cruce automatico y manual de extractos vs. movimientos del sistema</p>
          </div>
        </div>
        <button onClick={() => setShowImportar(true)}
          className="btn btn-primary">
          <Upload size={14} /> Importar extracto CSV
        </button>
      </div>

      {error && (
        <div className="alert alert-error bank-reconcile-alert">
          <AlertCircle size={16} />{error}
          <button onClick={() => setError('')} className="btn-icon" aria-label="Cerrar alerta"><X size={14} /></button>
        </div>
      )}

      <div className="bank-reconcile-layout">

        <aside className="bank-reconcile-sidebar">
          <h2>Extractos importados</h2>
          {loading ? (
            <div className="bank-reconcile-loading">
              <Loader2 size={16} className="animate-spin" />
            </div>
          ) : (
            <div className="bank-reconcile-extract-list">
              {extractos.map(e => (
                <button
                  key={e.id}
                  onClick={() => fetchLineas(e)}
                  className={`bank-reconcile-extract ${extractoSel?.id === e.id ? 'active' : ''}`}>
                  <div className="bank-reconcile-extract-top">
                    <span>{e.banco}</span>
                    <ChevronRight size={12} />
                  </div>
                  <p className="bank-reconcile-account">{e.numero_cuenta}</p>
                  <p className="bank-reconcile-period">{e.periodo_inicio} - {e.periodo_fin}</p>
                  <div className="bank-reconcile-extract-balance">
                    <span>Saldo final:</span>
                    <strong>${fmt(e.saldo_final)}</strong>
                  </div>
                </button>
              ))}
              {extractos.length === 0 && (
                <p className="bank-reconcile-empty-text">No hay extractos importados</p>
              )}
            </div>
          )}
        </aside>

        <main className="bank-reconcile-main">
          {extractoSel ? (
            <>
              {/* Stats */}
              {stats && (
                <div className="bank-reconcile-stats">
                  {[
                    { label: 'Total lineas', value: stats.total, tone: 'muted' },
                    { label: 'Conciliadas',  value: stats.conciliadas, tone: 'success' },
                    { label: 'Pendientes',   value: stats.pendientes, tone: 'warning' },
                    { label: '% Avance',     value: stats.total > 0 ? Math.round((stats.conciliadas / stats.total) * 100) + '%' : '0%', tone: 'emphasis' },
                  ].map(({ label, value, tone }) => (
                    <div key={label} className="card bank-reconcile-stat">
                      <p>{label}</p>
                      <strong className={`tone-${tone}`}>{value}</strong>
                    </div>
                  ))}
                </div>
              )}

              <div className="card bank-reconcile-actions">
                <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
                  className="input">
                  <option value="">Todos los estados</option>
                  <option value="pendiente">Pendientes</option>
                  <option value="conciliado">Conciliados</option>
                </select>
                <button
                  onClick={conciliarAuto}
                  disabled={conciliandoAuto}
                  className="btn btn-primary bank-reconcile-auto">
                  {conciliandoAuto
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Zap size={14} />}
                  Conciliar automáticamente
                </button>
                <button
                  onClick={generarReporte}
                  disabled={loadingReporte}
                  title="Papel de trabajo de conciliación bancaria"
                  className="btn btn-secondary">
                  {loadingReporte
                    ? <Loader2 size={14} className="animate-spin" />
                    : <FileBarChart size={14} />}
                  Papel de trabajo
                </button>
              </div>

              {/* Tabla de líneas */}
              <div className="card bank-reconcile-table-card">
                {loadingLineas ? (
                  <div className="bank-reconcile-loading">
                    <Loader2 size={18} className="animate-spin" />Cargando lineas...
                  </div>
                ) : (
                  <table className="table bank-reconcile-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Descripcion</th>
                        <th>Ref.</th>
                        <th className="text-right">Debito</th>
                        <th className="text-right">Credito</th>
                        <th className="text-right">Saldo</th>
                        <th className="text-center">Estado</th>
                        <th className="text-center">Accion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineasFiltradas.map(l => (
                        <tr key={l.id} className={l.estado_conciliacion === 'conciliado' ? 'bank-reconcile-row-muted' : ''}>
                          <td className="bank-reconcile-date">{l.fecha}</td>
                          <td className="bank-reconcile-description" title={l.descripcion}>
                            {l.descripcion}
                          </td>
                          <td className="bank-reconcile-ref">{l.referencia ?? '-'}</td>
                          <td className="bank-reconcile-money tone-danger">
                            {l.debito > 0 ? `$${fmt(l.debito)}` : '-'}
                          </td>
                          <td className="bank-reconcile-money tone-success">
                            {l.credito > 0 ? `$${fmt(l.credito)}` : '-'}
                          </td>
                          <td className="bank-reconcile-money">${fmt(l.saldo)}</td>
                          <td className="text-center">
                            {l.estado_conciliacion === 'conciliado' ? (
                              <CheckCircle2 size={14} className="tone-success" />
                            ) : (
                              <Clock size={14} className="tone-warning" />
                            )}
                          </td>
                          <td className="text-center">
                            {l.estado_conciliacion === 'pendiente' && (
                              <button
                                onClick={() => abrirManual(l)}
                                title="Conciliar manualmente"
                                className="btn-icon"
                                aria-label="Conciliar manualmente">
                                <Link2 size={13} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {lineasFiltradas.length === 0 && (
                        <tr><td colSpan={8} className="bank-reconcile-empty-cell">Sin lineas</td></tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            <div className="empty-state bank-reconcile-placeholder">
              <Landmark size={32} />
              <p>Selecciona un extracto para ver sus movimientos</p>
            </div>
          )}
        </main>
      </div>

      {/* ── Modal Conciliación Manual ────────────────────────────────────────── */}
      {lineaManual && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700 shrink-0">
              <div className="flex items-center gap-2">
                <Link2 size={16} className="text-teal-400" />
                <h2 className="font-semibold text-white text-sm">Conciliación manual</h2>
              </div>
              <button onClick={cerrarManual}><X size={18} className="text-slate-400 hover:text-white" /></button>
            </div>

            {/* Línea seleccionada */}
            <div className="p-4 bg-slate-700/40 border-b border-slate-700 shrink-0">
              <p className="text-xs text-slate-400 mb-1">Línea del extracto:</p>
              <div className="flex gap-4 text-xs">
                <span className="text-slate-300">{lineaManual.fecha}</span>
                <span className="text-slate-300 truncate max-w-[200px]">{lineaManual.descripcion}</span>
                {lineaManual.credito > 0 && (
                  <span className="text-green-300 font-mono font-semibold ml-auto">+${fmt(lineaManual.credito)}</span>
                )}
                {lineaManual.debito > 0 && (
                  <span className="text-red-300 font-mono font-semibold ml-auto">-${fmt(lineaManual.debito)}</span>
                )}
              </div>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Tipo de documento */}
              <div>
                <label className="block text-xs text-slate-400 mb-2">Tipo de documento</label>
                <div className="flex gap-2">
                  {(['ReciboCaja', 'ComprobanteEgreso'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setOrigenType(t)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors
                        ${origenType === t
                          ? 'bg-teal-600 border-teal-500 text-white'
                          : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'}`}>
                      {t === 'ReciboCaja' ? 'Recibo de Caja' : 'Comprobante Egreso'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Búsqueda */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Buscar documento</label>
                <input
                  value={busquedaDoc}
                  onChange={e => setBusquedaDoc(e.target.value)}
                  placeholder="Número, tercero o valor…"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500" />
              </div>

              {/* Lista de candidatos */}
              <div>
                <label className="block text-xs text-slate-400 mb-2">
                  Seleccionar documento
                  {loadingCand && <Loader2 size={10} className="inline ml-2 animate-spin" />}
                </label>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {candidatosFiltrados.length === 0 && !loadingCand && (
                    <p className="text-xs text-slate-500 text-center py-4">Sin documentos disponibles</p>
                  )}
                  {candidatosFiltrados.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setOrigenId(c.id)}
                      className={`w-full text-left rounded-lg px-3 py-2 border text-xs transition-colors
                        ${origenId === c.id
                          ? 'bg-teal-900/40 border-teal-500 text-white'
                          : 'bg-slate-700/50 border-slate-600/50 text-slate-300 hover:border-slate-500'}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-semibold text-teal-300">#{c.numero}</span>
                        <span className="font-mono text-slate-200">${fmt(c.monto)}</span>
                      </div>
                      <div className="flex justify-between mt-0.5 text-slate-400">
                        <span>{c.fecha}</span>
                        {c.tercero && <span className="truncate max-w-[180px]">{c.tercero}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Nota */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nota (opcional)</label>
                <textarea
                  value={notaManual}
                  onChange={e => setNotaManual(e.target.value)}
                  rows={2}
                  placeholder="Observación de la conciliación…"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 resize-none" />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-4 border-t border-slate-700 shrink-0">
              <button onClick={cerrarManual}
                className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600">
                Cancelar
              </button>
              <button
                onClick={submitManual}
                disabled={!origenId || savingManual}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-teal-700">
                {savingManual ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                Conciliar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Papel de Trabajo Conciliación ─────────────────────────────── */}
      {reporteOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-700 shrink-0">
              <div className="flex items-center gap-2">
                <FileBarChart size={18} className="text-indigo-400" />
                <h2 className="font-semibold text-white text-sm">Papel de Trabajo — Conciliación Bancaria</h2>
              </div>
              <button onClick={cerrarReporte}>
                <X size={18} className="text-slate-400 hover:text-white" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {loadingReporte ? (
                <div className="p-12 flex items-center justify-center gap-2 text-slate-400">
                  <Loader2 size={20} className="animate-spin" /> Generando reporte…
                </div>
              ) : reporteData ? (
                <>
                  {/* Encabezado */}
                  <div className="bg-slate-700/40 rounded-lg p-3 mb-4 text-xs">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <div className="text-slate-500">Banco</div>
                        <div className="text-white font-semibold">{reporteData.extracto.banco}</div>
                      </div>
                      <div>
                        <div className="text-slate-500">Cuenta</div>
                        <div className="text-white font-mono">{reporteData.extracto.numero_cuenta}</div>
                      </div>
                      <div>
                        <div className="text-slate-500">Periodo</div>
                        <div className="text-white">{reporteData.extracto.periodo_inicio} → {reporteData.extracto.periodo_fin}</div>
                      </div>
                      <div>
                        <div className="text-slate-500">Saldo banco</div>
                        <div className="text-white font-mono font-bold">${fmt(reporteData.extracto.saldo_final)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Conciliación matemática */}
                  <div className="bg-slate-700/30 rounded-lg p-4 mb-4">
                    <h3 className="text-sm font-bold text-white mb-3">Conciliación Matemática</h3>
                    <table className="w-full text-xs">
                      <tbody>
                        <tr className="border-b border-slate-700/40">
                          <td className="py-1.5 text-slate-300">Saldo según extracto bancario</td>
                          <td className="py-1.5 text-right font-mono text-white">${fmt(reporteData.conciliacion_matematica.saldo_banco_segun_extracto)}</td>
                        </tr>
                        <tr className="border-b border-slate-700/40">
                          <td className="py-1.5 text-slate-400">(−) Cheques girados no cobrados</td>
                          <td className="py-1.5 text-right font-mono text-red-300">${fmt(reporteData.conciliacion_matematica.menos_cheques_no_cobrados)}</td>
                        </tr>
                        <tr className="border-b border-slate-700 font-semibold">
                          <td className="py-1.5 text-white">Saldo banco ajustado</td>
                          <td className="py-1.5 text-right font-mono text-white">${fmt(reporteData.conciliacion_matematica.saldo_banco_ajustado)}</td>
                        </tr>
                        <tr className="border-b border-slate-700/40">
                          <td className="py-1.5 text-slate-300 pt-3">Saldo según libros contables</td>
                          <td className="py-1.5 text-right font-mono text-white pt-3">
                            {reporteData.conciliacion_matematica.saldo_libro_segun_contabilidad !== null
                              ? `$${fmt(reporteData.conciliacion_matematica.saldo_libro_segun_contabilidad)}`
                              : '— sin cuenta'}
                          </td>
                        </tr>
                        <tr className="border-b border-slate-700/40">
                          <td className="py-1.5 text-slate-400">(+) Consignaciones pendientes</td>
                          <td className="py-1.5 text-right font-mono text-green-300">${fmt(reporteData.conciliacion_matematica.mas_consignaciones_pendientes)}</td>
                        </tr>
                        <tr className="border-b border-slate-700/40">
                          <td className="py-1.5 text-slate-400">(−) Notas débito banco no registradas</td>
                          <td className="py-1.5 text-right font-mono text-red-300">${fmt(reporteData.conciliacion_matematica.menos_notas_debito_banco)}</td>
                        </tr>
                        <tr className="border-b border-slate-700 font-semibold">
                          <td className="py-1.5 text-white">Saldo libro ajustado</td>
                          <td className="py-1.5 text-right font-mono text-white">
                            {reporteData.conciliacion_matematica.saldo_libro_ajustado !== null
                              ? `$${fmt(reporteData.conciliacion_matematica.saldo_libro_ajustado)}`
                              : '—'}
                          </td>
                        </tr>
                        <tr className={reporteData.conciliacion_matematica.conciliado ? 'bg-green-900/30' : 'bg-red-900/30'}>
                          <td className="py-2 font-bold flex items-center gap-2">
                            {reporteData.conciliacion_matematica.conciliado
                              ? <CheckCircle2 size={14} className="text-green-400" />
                              : <XCircle size={14} className="text-red-400" />}
                            <span className={reporteData.conciliacion_matematica.conciliado ? 'text-green-300' : 'text-red-300'}>
                              Diferencia
                            </span>
                          </td>
                          <td className={`py-2 text-right font-mono font-bold ${reporteData.conciliacion_matematica.conciliado ? 'text-green-300' : 'text-red-300'}`}>
                            {reporteData.conciliacion_matematica.diferencia !== null
                              ? `$${fmt(reporteData.conciliacion_matematica.diferencia)}`
                              : 'N/A'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Partidas conciliatorias - secciones */}
                  {[
                    {
                      titulo: 'Consignaciones no registradas en libros',
                      data: reporteData.partidas_conciliatorias.consignaciones_no_registradas,
                      cols: ['fecha', 'descripcion', 'referencia', 'credito'],
                      color: 'text-green-300',
                    },
                    {
                      titulo: 'Cheques girados no cobrados',
                      data: reporteData.partidas_conciliatorias.cheques_no_cobrados,
                      cols: ['fecha', 'numero', 'beneficiario', 'concepto', 'valor'],
                      color: 'text-amber-300',
                    },
                    {
                      titulo: 'Notas débito banco no registradas',
                      data: reporteData.partidas_conciliatorias.notas_debito_banco_no_registradas,
                      cols: ['fecha', 'descripcion', 'referencia', 'debito'],
                      color: 'text-red-300',
                    },
                  ].map(seccion => (
                    <div key={seccion.titulo} className="bg-slate-700/30 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold text-white uppercase">{seccion.titulo}</h4>
                        <span className={`font-mono text-sm font-bold ${seccion.color}`}>
                          ${fmt(seccion.data.total)}
                        </span>
                      </div>
                      {seccion.data.detalle.length === 0 ? (
                        <div className="text-xs text-slate-500 italic py-2">Sin partidas pendientes.</div>
                      ) : (
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-700 text-slate-500 uppercase text-[10px]">
                              {seccion.cols.map(c => (
                                <th key={c} className={`py-1 ${c === 'credito' || c === 'debito' || c === 'valor' ? 'text-right' : 'text-left'}`}>
                                  {c === 'credito' ? 'Crédito'
                                    : c === 'debito' ? 'Débito'
                                    : c === 'valor' ? 'Valor'
                                    : c === 'descripcion' ? 'Descripción'
                                    : c === 'numero' ? 'Número'
                                    : c === 'referencia' ? 'Ref.'
                                    : c === 'beneficiario' ? 'Beneficiario'
                                    : c === 'concepto' ? 'Concepto'
                                    : 'Fecha'}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {seccion.data.detalle.map((row: ReporteRow, i: number) => (
                              <tr key={i} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                                {seccion.cols.map(c => (
                                  <td key={c} className={`py-1 ${c === 'credito' || c === 'debito' || c === 'valor' ? `text-right font-mono ${seccion.color}` : 'text-slate-300'}`}>
                                    {c === 'credito' || c === 'debito' || c === 'valor'
                                      ? `$${fmt(Number(row[c] || 0))}`
                                      : (row[c] ?? '—')}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  ))}
                </>
              ) : (
                <div className="p-8 text-center text-slate-500 text-sm">Sin datos</div>
              )}
            </div>

            <div className="flex gap-3 p-4 border-t border-slate-700 shrink-0">
              <button onClick={cerrarReporte}
                className="ml-auto px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Importar CSV ───────────────────────────────────────────────── */}
      {showImportar && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h2 className="font-semibold text-white text-sm">Importar extracto bancario</h2>
              <button onClick={() => setShowImportar(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Archivo CSV</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-slate-600 rounded-lg p-4 text-center cursor-pointer hover:border-teal-500 transition-colors">
                  {archivo ? (
                    <p className="text-sm text-teal-300">{archivo.name}</p>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Haz clic para seleccionar CSV<br />
                      <span className="text-slate-600">Columnas: fecha, descripcion, referencia, debito, credito, saldo</span>
                    </p>
                  )}
                </div>
                <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden"
                  onChange={e => setArchivo(e.target.files?.[0] ?? null)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Banco</label>
                  <input value={formImport.banco} onChange={e => setFormImport(f => ({ ...f, banco: e.target.value }))}
                    placeholder="Bancolombia"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Número de cuenta</label>
                  <input value={formImport.numero_cuenta} onChange={e => setFormImport(f => ({ ...f, numero_cuenta: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Período inicio</label>
                  <input type="date" value={formImport.periodo_inicio} onChange={e => setFormImport(f => ({ ...f, periodo_inicio: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Período fin</label>
                  <input type="date" value={formImport.periodo_fin} onChange={e => setFormImport(f => ({ ...f, periodo_fin: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Saldo inicial ($)</label>
                <input type="number" value={formImport.saldo_inicial} onChange={e => setFormImport(f => ({ ...f, saldo_inicial: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white" />
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
            <div className="flex gap-3 p-4 border-t border-slate-700">
              <button onClick={() => setShowImportar(false)}
                className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm">Cancelar</button>
              <button onClick={importar} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Importar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
