import { useEffect, useState, type ReactNode } from 'react'
import { TrendingUp, TrendingDown, Minus, Search, Download, BarChart3, Loader2, AlertCircle } from 'lucide-react'
import { kardexService, bodegasService, type KardexLinea, type Bodega, type ProductoStockBodega } from '@/services/inventario.service'
import { api } from '@/lib/api'
import { extractApiError } from '@/lib/errors'
import { getTenantId } from '@/services/auth.service'

const fmt = (n: number) => n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
const fmtDec = (n: number) => n.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 4 })

const today = () => new Date().toISOString().split('T')[0]
const firstDay = () => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
}

interface ProductoOption {
  id: string | number
  codigo: string
  nombre: string
}

interface KardexFilters {
  producto_id: string
  bodega_id: string
  desde: string
  hasta: string
}

type KardexTab = 'kardex' | 'valorizacion'
type TipoTone = 'success' | 'danger' | 'info' | 'warning' | 'emphasis' | 'muted'

const tipoInfo: Record<string, { icon: ReactNode; tone: TipoTone; label: string }> = {
  entrada_compra:       { icon: <TrendingUp size={12} />, tone: 'success', label: 'Entrada Compra' },
  salida_venta:         { icon: <TrendingDown size={12} />, tone: 'danger', label: 'Salida Venta' },
  traslado_entrada:     { icon: <TrendingUp size={12} />, tone: 'info', label: 'Traslado Entrada' },
  traslado_salida:      { icon: <TrendingDown size={12} />, tone: 'muted', label: 'Traslado Salida' },
  devolucion_compra:    { icon: <TrendingDown size={12} />, tone: 'warning', label: 'Dev. Compra' },
  devolucion_venta:     { icon: <TrendingUp size={12} />, tone: 'emphasis', label: 'Dev. Venta' },
  ajuste_positivo:      { icon: <TrendingUp size={12} />, tone: 'info', label: 'Ajuste +' },
  ajuste_negativo:      { icon: <TrendingDown size={12} />, tone: 'danger', label: 'Ajuste -' },
  produccion_consumo:   { icon: <TrendingDown size={12} />, tone: 'warning', label: 'Consumo MP' },
  produccion_terminado: { icon: <TrendingUp size={12} />, tone: 'success', label: 'Prod. Terminado' },
}

function getTipoInfo(tipo: string) {
  return tipoInfo[tipo] ?? { icon: <Minus size={12} />, tone: 'muted' as TipoTone, label: tipo }
}

function TabKardex() {
  const [productos, setProductos] = useState<ProductoOption[]>([])
  const [bodegas, setBodegas] = useState<Bodega[]>([])
  const [lineas, setLineas] = useState<KardexLinea[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [filters, setFilters] = useState<KardexFilters>({
    producto_id: '',
    bodega_id: '',
    desde: firstDay(),
    hasta: today(),
  })

  useEffect(() => {
    Promise.all([
      api.get(`/${getTenantId()}/productos`).then(r => r.data.data ?? []),
      bodegasService.getAll(),
    ])
      .then(([p, b]: [ProductoOption[], Bodega[]]) => {
        setProductos(p)
        setBodegas(b)
      })
      .catch((err: unknown) => {
        setError(extractApiError(err, 'No se pudieron cargar los filtros de kardex.'))
      })
  }, [])

  const buscar = async () => {
    if (!filters.producto_id || !filters.bodega_id) {
      setError('Selecciona producto y bodega.')
      return
    }

    setError('')
    setLoading(true)
    try {
      const data = await kardexService.getKardex(filters)
      setLineas(data)
    } catch (err: unknown) {
      setError(extractApiError(err, 'Error al cargar KARDEX.'))
    } finally {
      setLoading(false)
    }
  }

  const exportCsv = () => {
    if (!lineas.length) return
    const headers = ['Fecha', 'Tipo', 'Concepto', 'E.Unid', 'E.Valor', 'S.Unid', 'S.Valor', 'Saldo Unid.', 'Saldo Valor', 'CPP']
    const rows = lineas.map(l => [
      l.fecha, l.tipo, l.concepto,
      l.entrada_unidades ?? '', l.entrada_valor ?? '',
      l.salida_unidades ?? '', l.salida_valor ?? '',
      l.saldo_unidades, l.saldo_valor, l.costo_promedio,
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'kardex.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="kardex-tab-panel">
      <div className="card kardex-filters">
        <div className="input-group">
          <label>Producto</label>
          <select className="input" value={filters.producto_id} onChange={e => setFilters(f => ({ ...f, producto_id: e.target.value }))}>
            <option value="">Seleccione...</option>
            {productos.map(p => <option key={p.id} value={p.id}>{p.codigo} - {p.nombre}</option>)}
          </select>
        </div>
        <div className="input-group">
          <label>Bodega</label>
          <select className="input" value={filters.bodega_id} onChange={e => setFilters(f => ({ ...f, bodega_id: e.target.value }))}>
            <option value="">Seleccione...</option>
            {bodegas.map(b => <option key={b.id} value={b.id}>{b.sucursal?.nombre} - {b.nombre}</option>)}
          </select>
        </div>
        <div className="input-group">
          <label>Desde</label>
          <input type="date" className="input" value={filters.desde} onChange={e => setFilters(f => ({ ...f, desde: e.target.value }))} />
        </div>
        <div className="input-group">
          <label>Hasta</label>
          <input type="date" className="input" value={filters.hasta} onChange={e => setFilters(f => ({ ...f, hasta: e.target.value }))} />
        </div>
        <div className="kardex-filter-actions">
          <button className="btn btn-primary" onClick={buscar} disabled={loading}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Consultar
          </button>
          {lineas.length > 0 && (
            <button className="btn btn-secondary" onClick={exportCsv} title="Exportar CSV" aria-label="Exportar kardex a CSV">
              <Download size={14} />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-error kardex-alert">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {lineas.length > 0 && (
        <div className="card kardex-table-card">
          <table className="table kardex-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Concepto</th>
                <th className="text-right">Entrada Unid.</th>
                <th className="text-right">Entrada Valor</th>
                <th className="text-right">Salida Unid.</th>
                <th className="text-right">Salida Valor</th>
                <th className="text-right">Saldo Unid.</th>
                <th className="text-right">Saldo Valor</th>
                <th className="text-right">CPP</th>
              </tr>
            </thead>
            <tbody>
              {lineas.map(l => {
                const info = getTipoInfo(l.tipo)
                return (
                  <tr key={l.id}>
                    <td className="kardex-date">{l.fecha.split(' ')[0]}</td>
                    <td>
                      <span className={`kardex-type tone-${info.tone}`}>
                        {info.icon} {info.label}
                      </span>
                    </td>
                    <td className="kardex-concept">{l.concepto}</td>
                    <td className="kardex-money tone-success">{l.entrada_unidades != null ? fmtDec(l.entrada_unidades) : '-'}</td>
                    <td className="kardex-money tone-success">{l.entrada_valor != null ? `$${fmt(l.entrada_valor)}` : '-'}</td>
                    <td className="kardex-money tone-danger">{l.salida_unidades != null ? fmtDec(l.salida_unidades) : '-'}</td>
                    <td className="kardex-money tone-danger">{l.salida_valor != null ? `$${fmt(l.salida_valor)}` : '-'}</td>
                    <td className="kardex-money strong">{fmtDec(l.saldo_unidades)}</td>
                    <td className="kardex-money strong">${fmt(l.saldo_valor)}</td>
                    <td className="kardex-money tone-emphasis strong">${fmtDec(l.costo_promedio)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {lineas.length === 0 && !loading && filters.producto_id && (
        <div className="empty-state kardex-empty">
          Sin movimientos en el periodo seleccionado.
        </div>
      )}
    </div>
  )
}

function TabValorizacion() {
  const [data, setData] = useState<ProductoStockBodega[]>([])
  const [loading, setLoading] = useState(false)
  const [bodegas, setBodegas] = useState<Bodega[]>([])
  const [filtBodega, setFiltBodega] = useState('')
  const [error, setError] = useState('')

  async function cargar(bodegaId?: string) {
    setLoading(true)
    setError('')
    try {
      const res = await kardexService.getValorizacion(bodegaId ? { bodega_id: bodegaId } : undefined)
      setData(res)
    } catch (err: unknown) {
      setError(extractApiError(err, 'No se pudo cargar la valorizacion de inventario.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    bodegasService.getAll()
      .then(setBodegas)
      .catch((err: unknown) => setError(extractApiError(err, 'No se pudieron cargar las bodegas.')))
    cargar()
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  const totalValor = data.reduce((s, r) => s + r.saldo_valor, 0)

  return (
    <div className="kardex-tab-panel">
      <div className="card kardex-valuation-toolbar">
        <div className="input-group kardex-warehouse-filter">
          <label>Filtrar por bodega</label>
          <select className="input" value={filtBodega}
            onChange={e => { setFiltBodega(e.target.value); cargar(e.target.value || undefined) }}>
            <option value="">Todas las bodegas</option>
            {bodegas.map(b => <option key={b.id} value={b.id}>{b.sucursal?.nombre} - {b.nombre}</option>)}
          </select>
        </div>
        <div className="kardex-valuation-total">
          <span>Total inventario valorizado</span>
          <strong>${totalValor.toLocaleString('es-CO', { minimumFractionDigits: 0 })}</strong>
        </div>
      </div>

      {error && (
        <div className="alert alert-error kardex-alert">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {loading ? (
        <div className="card kardex-loading"><Loader2 size={24} className="animate-spin" /></div>
      ) : (
        <div className="card kardex-table-card">
          <table className="table kardex-table kardex-valuation-table">
            <thead>
              <tr>
                <th>Sucursal</th>
                <th>Bodega</th>
                <th>Producto</th>
                <th>Categoria</th>
                <th>Cuenta PUC</th>
                <th className="text-right">Saldo Unid.</th>
                <th className="text-right">CPP</th>
                <th className="text-right">Valor Total</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r, i) => (
                <tr key={`${r.producto_codigo}-${r.bodega}-${i}`}>
                  <td>{r.sucursal}</td>
                  <td>{r.bodega}</td>
                  <td>
                    <div className="kardex-product-name">{r.producto_nombre}</div>
                    <div className="kardex-code">{r.producto_codigo}</div>
                  </td>
                  <td className="kardex-muted-cell">{r.categoria}</td>
                  <td className="kardex-code tone-emphasis">{r.cuenta_puc}</td>
                  <td className="kardex-money strong">{fmtDec(r.saldo_unidades)}</td>
                  <td className="kardex-money muted">${fmtDec(r.costo_promedio)}</td>
                  <td className="kardex-money tone-success strong">${fmt(r.saldo_valor)}</td>
                </tr>
              ))}
            </tbody>
            {data.length > 0 && (
              <tfoot>
                <tr className="kardex-total-row">
                  <td colSpan={7}>Total</td>
                  <td className="kardex-money tone-success strong">${fmt(totalValor)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  )
}

export default function KardexPage() {
  const [tab, setTab] = useState<KardexTab>('kardex')

  return (
    <div className="kardex-page page-container">
      <div className="page-header kardex-header">
        <div className="kardex-title-row">
          <div className="kardex-icon">
            <BarChart3 size={20} aria-hidden="true" />
          </div>
          <div>
            <h1 className="page-title">Inventario</h1>
            <p className="page-subtitle">Kardex, movimientos y valorizacion por bodega.</p>
          </div>
        </div>
      </div>

      <div className="kardex-tabs" role="tablist" aria-label="Vistas de inventario">
        {[
          { key: 'kardex' as const, label: 'KARDEX' },
          { key: 'valorizacion' as const, label: 'Valorizacion' },
        ].map(t => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={tab === t.key ? 'active' : ''}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'kardex' && <TabKardex />}
      {tab === 'valorizacion' && <TabValorizacion />}
    </div>
  )
}
