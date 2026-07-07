import { useState } from 'react'
import {
  Landmark, RefreshCcw, Loader2, AlertCircle, Download,
  ChevronDown, ChevronRight, TrendingUp, TrendingDown,
} from 'lucide-react'
import { api } from '@/lib/api'
import { getTenantId } from '@/services/auth.service'
import { extractApiError } from '@/lib/errors'

const fmt = (n: number) =>
  Number(n || 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

interface CuentaECP {
  codigo: string
  nombre: string
  saldo_inicial: number
  aumentos: number
  disminuciones: number
  saldo_final: number
}

interface CategoriaECP {
  codigo: string
  nombre: string
  cuentas: CuentaECP[]
  saldo_inicial: number
  aumentos: number
  disminuciones: number
  saldo_final: number
}

interface DataECP {
  anio: number
  fecha_inicio: string
  fecha_fin: string
  categorias: CategoriaECP[]
  totales: {
    saldo_inicial: number
    aumentos: number
    disminuciones: number
    saldo_final: number
  }
  empresa?: { nombre: string; nit: string }
}

function CategoriaRow({ cat }: { cat: CategoriaECP }) {
  const [open, setOpen] = useState(true)
  return (
    <>
      <tr className="equity-changes-category-row">
        <td>
          <button
            onClick={() => setOpen(o => !o)}
            className="equity-changes-category-toggle"
            type="button"
            aria-expanded={open}
          >
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span>{cat.codigo}</span>
            {cat.nombre}
          </button>
        </td>
        <td className="equity-changes-money">${fmt(cat.saldo_inicial)}</td>
        <td className="equity-changes-money tone-success">${fmt(cat.aumentos)}</td>
        <td className="equity-changes-money tone-danger">${fmt(cat.disminuciones)}</td>
        <td className="equity-changes-money strong">${fmt(cat.saldo_final)}</td>
      </tr>
      {open &&
        cat.cuentas.map(c => (
          <tr key={c.codigo} className="equity-changes-account-row">
            <td className="equity-changes-account">
              <span>{c.codigo}</span>
              {c.nombre}
            </td>
            <td className="equity-changes-money muted">${fmt(c.saldo_inicial)}</td>
            <td className="equity-changes-money tone-success">${fmt(c.aumentos)}</td>
            <td className="equity-changes-money tone-danger">${fmt(c.disminuciones)}</td>
            <td className="equity-changes-money">${fmt(c.saldo_final)}</td>
          </tr>
        ))}
    </>
  )
}

export default function EstadoCambiosPatrimonioPage() {
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [data, setData] = useState<DataECP | null>(null)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  const T = getTenantId()

  const cargar = async () => {
    setLoading(true); setError('')
    try {
      const res = await api.get(`/${T}/reports/estado-cambios-patrimonio`, {
        params: { ['año']: anio },
      })
      setData(res.data.data)
    } catch (e: unknown) {
      setError(extractApiError(e, 'Error al cargar el estado de cambios en el patrimonio.'))
    } finally {
      setLoading(false)
    }
  }

  const descargarCsv = async () => {
    setDownloading(true)
    try {
      const res = await api.get(`/${T}/reports/csv/estado-cambios-patrimonio`, {
        params: { ['año']: anio },
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `estado-cambios-patrimonio-${anio}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (e: unknown) {
      setError('Error al descargar CSV: ' + extractApiError(e, 'No se pudo descargar el CSV.'))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="equity-changes-page page-container">
      <div className="page-header equity-changes-header">
        <div className="equity-changes-title-row">
        <div className="equity-changes-icon">
          <Landmark size={20} aria-hidden="true" />
        </div>
        <div>
          <h1 className="page-title">Estado de Cambios en el Patrimonio</h1>
          <p className="page-subtitle">NIC 1 - Movimientos de capital, reservas y resultados</p>
        </div>
        </div>
      </div>

      <div className="card equity-changes-toolbar">
        <div className="input-group">
          <label>Año fiscal</label>
          <input
            type="number" min={2020} max={2100} value={anio}
            onChange={e => setAnio(parseInt(e.target.value || '0', 10))}
            className="input equity-changes-year-input"
          />
        </div>
        <button
          onClick={cargar} disabled={loading}
          className="btn btn-primary"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
          Generar
        </button>
        {data && (
          <button
            onClick={descargarCsv} disabled={downloading}
            className="btn btn-secondary equity-changes-download"
          >
            {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Descargar CSV
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-error equity-changes-alert">
          <AlertCircle size={16} />{error}
        </div>
      )}

      {data && data.categorias.length === 0 && (
        <div className="empty-state">
          No hay movimientos de patrimonio en {data.anio}.
        </div>
      )}

      {data && data.categorias.length > 0 && (
        <div className="card equity-changes-card">
          {data.empresa?.nombre && (
            <div className="equity-changes-entity">
              <div className="equity-changes-entity__name">{data.empresa.nombre}</div>
              {data.empresa.nit && <div>NIT {data.empresa.nit}</div>}
              <div>
                Del {data.fecha_inicio} al {data.fecha_fin}
              </div>
            </div>
          )}

          <table className="table equity-changes-table">
            <thead>
              <tr>
                <th>Concepto</th>
                <th className="text-right">Saldo Inicial</th>
                <th className="text-right">
                  <span className="equity-changes-heading">
                    <TrendingUp size={11} />Aumentos
                  </span>
                </th>
                <th className="text-right">
                  <span className="equity-changes-heading">
                    <TrendingDown size={11} />Disminuciones
                  </span>
                </th>
                <th className="text-right">Saldo Final</th>
              </tr>
            </thead>
            <tbody>
              {data.categorias.map(cat => (
                <CategoriaRow key={cat.codigo} cat={cat} />
              ))}
              <tr className="equity-changes-total-row">
                <td>Total patrimonio</td>
                <td className="equity-changes-money strong">${fmt(data.totales.saldo_inicial)}</td>
                <td className="equity-changes-money tone-success strong">${fmt(data.totales.aumentos)}</td>
                <td className="equity-changes-money tone-danger strong">${fmt(data.totales.disminuciones)}</td>
                <td className="equity-changes-money tone-emphasis strong">${fmt(data.totales.saldo_final)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
