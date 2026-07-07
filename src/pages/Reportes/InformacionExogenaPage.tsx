import { useState, type ReactNode } from 'react'
import { api } from '@/lib/api'
import { getErrorMessage } from '@/lib/errors'
import { getTenantId } from '@/services/auth.service'
import { FileText, Download, Calendar, Loader2, Eye, X } from 'lucide-react'

/** Forma genérica de los formatos de Información Exógena (1001-1009): varía por registro, solo se sabe que hay filas y opcionalmente totales. */
interface ExogenaPreviewData {
  registros?: Record<string, unknown>[]
  totales?: Record<string, unknown>
}

type FormatoCfg = {
  formato: number
  titulo: string
  descripcion: string
}

const FORMATOS: FormatoCfg[] = [
  { formato: 1001, titulo: 'Formato 1001', descripcion: 'Pagos y retenciones a proveedores' },
  { formato: 1003, titulo: 'Formato 1003', descripcion: 'Retenciones que nos practicaron clientes' },
  { formato: 1005, titulo: 'Formato 1005', descripcion: 'IVA descontable por proveedor' },
  { formato: 1006, titulo: 'Formato 1006', descripcion: 'IVA generado por cliente' },
  { formato: 1007, titulo: 'Formato 1007', descripcion: 'Ingresos recibidos por tercero' },
  { formato: 1008, titulo: 'Formato 1008', descripcion: 'Saldos CxC al cierre del año' },
  { formato: 1009, titulo: 'Formato 1009', descripcion: 'Saldos CxP al cierre del año' },
]

export default function InformacionExogenaPage() {
  const [anio, setAnio] = useState<number>(new Date().getFullYear() - 1)
  const [preview, setPreview] = useState<{ formato: number; data: ExogenaPreviewData } | null>(null)
  const [loadingFormato, setLoadingFormato] = useState<number | null>(null)
  const [downloading, setDownloading] = useState<number | null>(null)

  const tenant = getTenantId()
  if (!tenant) return <div className="page-container">Sin sesión activa</div>

  const verPreview = async (formato: number) => {
    setLoadingFormato(formato)
    try {
      const params = new URLSearchParams({ ['año']: String(anio) })
      const res = await api.get(`/${tenant}/reports/exogena-${formato}?${params.toString()}`)
      setPreview({ formato, data: res.data?.data ?? null })
    } catch (err) {
      alert('Error: ' + getErrorMessage(err))
    } finally {
      setLoadingFormato(null)
    }
  }

  const descargarCsv = async (formato: number) => {
    setDownloading(formato)
    try {
      // Forzamos la URL absoluta con el token en query no es ideal — mejor blob via axios
      const res = await api.get(`/${tenant}/reports/exogena-${formato}/csv`, {
        params: { ['año']: anio },
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `exogena-${formato}-${anio}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('Error al descargar: ' + getErrorMessage(err))
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <FileText size={28} className="text-accent" />
            Información Exógena DIAN
          </h1>
          <p className="page-subtitle">
            Medios magnéticos anuales — descarga el CSV listo para subir al portal MUISCA o
            mapéalo en la plantilla oficial Excel del año.
          </p>
        </div>
      </div>

      <div className="card mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="input-group" style={{ width: '160px' }}>
            <label className="text-xs flex items-center gap-1">
              <Calendar size={12} /> Año fiscal
            </label>
            <input
              type="number"
              className="input"
              min={2020}
              max={2100}
              value={anio}
              onChange={(e) => setAnio(parseInt(e.target.value || '0', 10))}
            />
          </div>
          <div className="text-sm text-gray-500 ml-auto">
            Período: <strong>1-ene-{anio}</strong> al <strong>31-dic-{anio}</strong>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {FORMATOS.map((f) => (
          <div key={f.formato} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-lg text-white">{f.titulo}</h3>
                <p className="text-sm text-slate-400">{f.descripcion}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                className="btn btn-secondary flex-1"
                onClick={() => verPreview(f.formato)}
                disabled={loadingFormato === f.formato}
              >
                {loadingFormato === f.formato
                  ? <Loader2 size={16} className="animate-spin" />
                  : <Eye size={16} />}
                Ver
              </button>
              <button
                className="btn btn-primary flex-1"
                onClick={() => descargarCsv(f.formato)}
                disabled={downloading === f.formato}
              >
                {downloading === f.formato
                  ? <Loader2 size={16} className="animate-spin" />
                  : <Download size={16} />}
                CSV
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal con preview JSON */}
      {preview && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
             onClick={() => setPreview(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-w-6xl w-full max-h-[85vh] overflow-hidden flex flex-col"
               onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white">
                Vista previa — Formato {preview.formato}
              </h2>
              <button onClick={() => setPreview(null)} className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="overflow-auto p-4 flex-1">
              {Array.isArray(preview.data?.registros) && preview.data.registros.length > 0 ? (
                <PreviewTabla data={preview.data} />
              ) : (
                <div className="text-center text-slate-400 py-8">
                  Sin registros para el año {anio}.
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-700 bg-slate-800/50 flex justify-end gap-2">
              <button onClick={() => setPreview(null)} className="btn btn-secondary">
                Cerrar
              </button>
              <button
                onClick={() => descargarCsv(preview.formato)}
                className="btn btn-primary"
              >
                <Download size={16} /> Descargar CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Tabla simple para el preview — toma los primeros 50 registros
function PreviewTabla({ data }: { data: ExogenaPreviewData }) {
  const registros = (data.registros ?? []).slice(0, 50)
  if (registros.length === 0) return null

  const cols = Object.keys(registros[0])
  const fmt = (v: unknown): ReactNode => {
    if (typeof v === 'number') return v.toLocaleString('es-CO')
    if (v === null || v === undefined) return ''
    if (typeof v === 'string') return v
    return String(v)
  }

  return (
    <div>
      {data.totales && (
        <div className="mb-4 p-3 bg-blue-900/30 border border-blue-700 rounded text-sm text-blue-100">
          <strong className="text-blue-300">Totales:</strong>{' '}
          {Object.entries(data.totales).map(([k, v]) => (
            <span key={k} className="ml-3">
              {k}: <strong className="text-white">{typeof v === 'number' ? v.toLocaleString('es-CO') : String(v)}</strong>
            </span>
          ))}
        </div>
      )}
      <div className="overflow-x-auto rounded border border-slate-700">
        <table className="table-auto w-full text-sm">
          <thead className="bg-slate-800 text-slate-200">
            <tr>
              {cols.map(c => (
                <th key={c} className="px-3 py-2 text-left border-b border-slate-700 font-semibold uppercase text-xs tracking-wide">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-slate-200">
            {registros.map((r, i) => (
              <tr key={i} className="odd:bg-slate-900 even:bg-slate-800/40 hover:bg-slate-700/50">
                {cols.map(c => (
                  <td key={c} className="px-3 py-1.5 border-b border-slate-700/50 whitespace-nowrap">
                    {fmt(r[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {(data.registros as any[]).length > 50 && (
          <p className="text-xs text-slate-400 mt-2 px-2">
            Mostrando primeros 50 de {(data.registros as any[]).length} registros — descarga el CSV para ver todos.
          </p>
        )}
      </div>
    </div>
  )
}
