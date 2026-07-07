import { useState } from 'react'
import { api } from '@/lib/api'
import { getErrorMessage } from '@/lib/errors'
import { getTenantId } from '@/services/auth.service'
import { Calculator, Calendar, Filter, Loader2 } from 'lucide-react'

type ReporteTipo = 'iva-bimestral' | 'retenciones-mensual' | 'retefuente-practicada'

const REPORTES: { id: ReporteTipo; titulo: string; descripcion: string }[] = [
  {
    id: 'iva-bimestral',
    titulo: 'Formulario 300 — IVA Bimestral',
    descripcion: 'Resumen bimestral del IVA generado por tarifa y descontable. Listo para diligenciar.',
  },
  {
    id: 'retenciones-mensual',
    titulo: 'Formulario 350 — Retenciones Mensual',
    descripcion: 'Total retefuente, ReteICA y ReteIVA practicadas en el mes. Con detalle por proveedor.',
  },
  {
    id: 'retefuente-practicada',
    titulo: 'Retefuente Practicada — Detallado',
    descripcion: 'Documento por documento las retenciones practicadas a proveedores en el período.',
  },
]

export default function ReportesTributariosPage() {
  const [activo, setActivo] = useState<ReporteTipo>('iva-bimestral')
  const tenant = getTenantId()

  if (!tenant) return <div className="page-container">Sin sesión activa</div>

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Calculator size={28} className="text-accent" />
            Reportes Tributarios DIAN
          </h1>
          <p className="page-subtitle">
            Formularios mensuales/bimestrales y detalles de retenciones para la DIAN.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {REPORTES.map((r) => (
          <button
            key={r.id}
            className={`px-4 py-2 -mb-px border-b-2 transition-colors ${
              activo === r.id
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-600 hover:text-blue-600'
            }`}
            onClick={() => setActivo(r.id)}
          >
            {r.titulo}
          </button>
        ))}
      </div>

      <p className="text-sm text-gray-600 mb-4">
        {REPORTES.find((r) => r.id === activo)?.descripcion}
      </p>

      {activo === 'iva-bimestral' && <IvaBimestralPanel tenant={tenant} />}
      {activo === 'retenciones-mensual' && <RetencionesMensualPanel tenant={tenant} />}
      {activo === 'retefuente-practicada' && <RetefuentePracticadaPanel tenant={tenant} />}
    </div>
  )
}

// ─── Sub-páginas por reporte ───────────────────────────────────────────────

function IvaBimestralPanel({ tenant }: { tenant: string }) {
  const [anio, setAnio] = useState<number>(new Date().getFullYear())
  const [bimestre, setBimestre] = useState<number>(1)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const consultar = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ ['año']: String(anio), bimestre: String(bimestre) })
      const res = await api.get(`/${tenant}/reports/iva-bimestral?${params.toString()}`)
      // El backend retorna los campos en el top-level (no envuelve en {data: ...})
      setData(res.data?.data ?? res.data ?? null)
    } catch (err) {
      alert('Error: ' + getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="card mb-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="input-group" style={{ width: '120px' }}>
            <label className="text-xs">Año</label>
            <input type="number" className="input" min={2020} max={2100}
                   value={anio} onChange={(e) => setAnio(parseInt(e.target.value || '0', 10))} />
          </div>
          <div className="input-group" style={{ width: '160px' }}>
            <label className="text-xs">Bimestre</label>
            <select className="input" value={bimestre}
                    onChange={(e) => setBimestre(parseInt(e.target.value, 10))}>
              <option value={1}>1 (Ene-Feb)</option>
              <option value={2}>2 (Mar-Abr)</option>
              <option value={3}>3 (May-Jun)</option>
              <option value={4}>4 (Jul-Ago)</option>
              <option value={5}>5 (Sept-Oct)</option>
              <option value={6}>6 (Nov-Dic)</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={consultar} disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Filter size={16} />}
            Consultar
          </button>
        </div>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="card">
              <h3 className="font-semibold mb-3">Ingresos gravados</h3>
              <table className="w-full text-sm">
                <thead><tr className="border-b"><th className="text-left py-1">Tarifa</th><th className="text-right">Base</th><th className="text-right">IVA</th></tr></thead>
                <tbody>
                  <Linea label="19%" base={data.ingresos?.por_tarifa?.tarifa_19?.base} iva={data.ingresos?.por_tarifa?.tarifa_19?.iva} />
                  <Linea label="5%"  base={data.ingresos?.por_tarifa?.tarifa_5?.base}  iva={data.ingresos?.por_tarifa?.tarifa_5?.iva} />
                  <Linea label="0%"  base={data.ingresos?.por_tarifa?.tarifa_0?.base}  iva={data.ingresos?.por_tarifa?.tarifa_0?.iva} />
                  <tr className="font-semibold border-t">
                    <td className="py-1">Total</td>
                    <td className="text-right">{fmt(data.ingresos?.base_total)}</td>
                    <td className="text-right">{fmt(data.ingresos?.iva_generado)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="card">
              <h3 className="font-semibold mb-3">IVA Descontable (compras)</h3>
              <div className="flex justify-between py-1">
                <span>Base compras</span>
                <strong>{fmt(data.compras?.base_compras)}</strong>
              </div>
              <div className="flex justify-between py-1">
                <span>IVA descontable</span>
                <strong>{fmt(data.compras?.iva_descontable)}</strong>
              </div>
              <div className="flex justify-between py-1 text-sm text-gray-500">
                <span>Documentos</span>
                <span>{data.compras?.num_compras ?? 0}</span>
              </div>
            </div>
          </div>

          <div className="card" style={{
            borderLeft: `4px solid ${data.balance?.saldo_a_pagar > 0 ? '#ef4444' : '#34d399'}`,
          }}>
            <h3 className="font-semibold mb-3">Balance del bimestre</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <Stat label="IVA generado"     valor={data.balance?.iva_generado} />
              <Stat label="IVA descontable"  valor={data.balance?.iva_descontable} />
              <Stat label="Saldo a pagar"    valor={data.balance?.saldo_a_pagar}  color="text-red-400" />
              <Stat label="Saldo a favor"    valor={data.balance?.saldo_a_favor}  color="text-green-400" />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function RetencionesMensualPanel({ tenant }: { tenant: string }) {
  const [anio, setAnio] = useState<number>(new Date().getFullYear())
  const [mes, setMes] = useState<number>(new Date().getMonth() + 1)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const consultar = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ ['año']: String(anio), mes: String(mes) })
      const res = await api.get(`/${tenant}/reports/retenciones-mensual?${params.toString()}`)
      // El backend retorna los campos en el top-level (no envuelve en {data: ...})
      setData(res.data?.data ?? res.data ?? null)
    } catch (err) {
      alert('Error: ' + getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="card mb-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="input-group" style={{ width: '120px' }}>
            <label className="text-xs">Año</label>
            <input type="number" className="input" value={anio}
                   onChange={(e) => setAnio(parseInt(e.target.value || '0', 10))} />
          </div>
          <div className="input-group" style={{ width: '120px' }}>
            <label className="text-xs">Mes</label>
            <select className="input" value={mes}
                    onChange={(e) => setMes(parseInt(e.target.value, 10))}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" onClick={consultar} disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Filter size={16} />}
            Consultar
          </button>
        </div>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <Stat label="Retefuente"        valor={data.totales?.retefuente} />
            <Stat label="ReteICA"           valor={data.totales?.reteica} />
            <Stat label="ReteIVA"           valor={data.totales?.reteiva} />
            <Stat label="Total a consignar" valor={data.totales?.total_a_consignar} color="text-blue-600" />
          </div>

          <div className="card">
            <h3 className="font-semibold mb-3">Detalle por proveedor</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left p-2">NIT</th>
                    <th className="text-left p-2">Proveedor</th>
                    <th className="text-right p-2">Docs.</th>
                    <th className="text-right p-2">Retefuente</th>
                    <th className="text-right p-2">ReteICA</th>
                    <th className="text-right p-2">ReteIVA</th>
                    <th className="text-right p-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.detalle_proveedor as any[])?.map((r: any) => (
                    <tr key={r.tercero_id} className="odd:bg-transparent even:bg-slate-800/40">
                      <td className="p-2">{r.nit}</td>
                      <td className="p-2">{r.proveedor}</td>
                      <td className="text-right p-2">{r.num_documentos}</td>
                      <td className="text-right p-2">{fmt(r.retefuente)}</td>
                      <td className="text-right p-2">{fmt(r.reteica)}</td>
                      <td className="text-right p-2">{fmt(r.reteiva)}</td>
                      <td className="text-right p-2 font-semibold">{fmt(r.total_retenido)}</td>
                    </tr>
                  ))}
                  {(!data.detalle_proveedor || (data.detalle_proveedor as any[]).length === 0) && (
                    <tr><td colSpan={7} className="text-center p-4 text-slate-400">Sin retenciones en este mes</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function RetefuentePracticadaPanel({ tenant }: { tenant: string }) {
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [data, setData] = useState<any[]>([])
  const [totales, setTotales] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const consultar = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('start_date', startDate)
      if (endDate)   params.append('end_date', endDate)
      const res = await api.get(`/${tenant}/reports/retefuente-practicada?${params.toString()}`)
      setData(res.data?.data ?? [])
      setTotales(res.data?.totales ?? null)
    } catch (err) {
      alert('Error: ' + getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="card mb-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="input-group">
            <label className="text-xs flex items-center gap-1"><Calendar size={12} /> Desde</label>
            <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="input-group">
            <label className="text-xs flex items-center gap-1"><Calendar size={12} /> Hasta</label>
            <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={consultar} disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Filter size={16} />}
            Consultar
          </button>
        </div>
      </div>

      {totales && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <Stat label="Retefuente" valor={totales.retefuente} />
          <Stat label="ReteICA"    valor={totales.reteica} />
          <Stat label="ReteIVA"    valor={totales.reteiva} />
          <Stat label="Total"      valor={totales.total_retenido} color="text-blue-600" />
        </div>
      )}

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2">Fecha</th>
                <th className="text-left p-2">Documento</th>
                <th className="text-left p-2">Proveedor</th>
                <th className="text-left p-2">Tipo</th>
                <th className="text-right p-2">Base</th>
                <th className="text-right p-2">Valor</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r, i) => (
                <tr key={i} className="odd:bg-transparent even:bg-slate-800/40">
                  <td className="p-2">{r.fecha}</td>
                  <td className="p-2">{r.numero}</td>
                  <td className="p-2">{r.proveedor}</td>
                  <td className="p-2">{r.tipo_retencion}</td>
                  <td className="text-right p-2">{fmt(r.base)}</td>
                  <td className="text-right p-2 font-semibold">{fmt(r.valor)}</td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={6} className="text-center p-4 text-slate-400">Sin retenciones en el período</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmt(v: any): string {
  const n = parseFloat(v ?? 0)
  if (isNaN(n)) return '0'
  return n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function Linea({ label, base, iva }: { label: string; base: any; iva: any }) {
  return (
    <tr className="border-b">
      <td className="py-1">{label}</td>
      <td className="text-right">{fmt(base)}</td>
      <td className="text-right">{fmt(iva)}</td>
    </tr>
  )
}

function Stat({ label, valor, color }: { label: string; valor: any; color?: string }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      padding: '12px',
      borderRadius: 'var(--radius)',
    }}>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div className={color ?? ''} style={{ fontSize: '1.25rem', fontWeight: 700, color: color ? undefined : 'var(--text-primary)' }}>
        {fmt(valor)}
      </div>
    </div>
  )
}
