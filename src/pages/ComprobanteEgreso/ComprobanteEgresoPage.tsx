import { useState, useEffect } from 'react'
import { Plus, RefreshCcw, Search, Send, AlertCircle } from 'lucide-react'
import {
  comprobanteEgresoService,
  type ComprobanteEgreso,
} from '@/services/comprobanteEgreso.service'
import NuevoComprobanteEgresoModal from './NuevoComprobanteEgresoModal'

const FORMA_PAGO_LABELS: Record<string, string> = {
  transferencia: 'Transferencia',
  consignacion:  'Consignación',
  cheque:        'Cheque',
  efectivo:      'Efectivo',
  otro:          'Otro',
}

const fmt = (n: number) =>
  Number(n).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

export default function ComprobanteEgresoPage() {
  const [comprobantes, setComprobantes] = useState<ComprobanteEgreso[]>([])
  const [loading, setLoading]           = useState(true)
  const [isModalOpen, setIsModalOpen]   = useState(false)
  const [search, setSearch]             = useState('')
  const [error, setError]               = useState('')

  const fetch = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await comprobanteEgresoService.getAll()
      setComprobantes(res.data || [])
    } catch {
      setError('No se pudieron cargar los comprobantes.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetch() }, [])

  const filtered = comprobantes.filter(c =>
    c.numero.toLowerCase().includes(search.toLowerCase()) ||
    c.tercero.razon_social.toLowerCase().includes(search.toLowerCase()) ||
    c.concepto.toLowerCase().includes(search.toLowerCase())
  )

  const totalPagado = filtered
    .filter(c => c.estado === 'registrado')
    .reduce((s, c) => s + Number(c.valor_pagado), 0)

  const getEstadoBadge = (estado: string) => {
    const map: Record<string, string> = {
      registrado: 'badge-success',
      borrador:   'badge-warning',
      anulado:    'badge-muted',
    }
    return <span className={`badge ${map[estado] ?? 'badge-muted'}`}>{estado}</span>
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Send size={26} className="text-accent" />
            Comprobantes de Egreso
          </h1>
          <p className="page-subtitle">
            Registra los pagos realizados a proveedores. Genera asiento contable automáticamente.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={fetch} disabled={loading}>
            <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> Nuevo Comprobante
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error mb-4 flex items-center gap-2">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* KPI rápido */}
      {filtered.length > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20,
        }}>
          {[
            { label: 'Total pagado (filtrado)', value: `$${fmt(totalPagado)}`, color: '#ef4444' },
            { label: 'Comprobantes registrados', value: filtered.filter(c => c.estado === 'registrado').length, color: '#10b981' },
            { label: 'Anulados', value: filtered.filter(c => c.estado === 'anulado').length, color: 'var(--text-muted)' },
          ].map(kpi => (
            <div key={kpi.label} className="card" style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>{kpi.label}</div>
              <div style={{ fontWeight: 800, fontSize: '1.35rem', color: kpi.color }}>{kpi.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Búsqueda */}
      <div className="card mb-4" style={{ padding: '14px 16px' }}>
        <div style={{ position: 'relative', maxWidth: 420 }}>
          <Search size={16} style={{
            position: 'absolute', left: 12, top: '50%',
            transform: 'translateY(-50%)', color: 'var(--text-muted)',
          }} />
          <input
            type="text" className="input" style={{ paddingLeft: 40 }}
            placeholder="Buscar por número, proveedor o concepto..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading && comprobantes.length === 0 ? (
          <div className="spinner-center">
            <span className="animate-spin" style={{ width: 32, height: 32 }} />
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Número</th>
                  <th>Proveedor</th>
                  <th>Concepto</th>
                  <th>Forma de Pago</th>
                  <th style={{ textAlign: 'right' }}>Valor Pagado</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {new Date(c.fecha).toLocaleDateString('es-CO')}
                    </td>
                    <td>
                      <span style={{
                        fontFamily: 'monospace', fontWeight: 700,
                        color: 'var(--accent)',
                      }}>{c.numero}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                        {c.tercero.razon_social}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {c.tercero.identificacion}
                      </div>
                    </td>
                    <td style={{
                      maxWidth: 220, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      color: 'var(--text-muted)', fontSize: '0.84rem',
                    }}>
                      {c.concepto}
                    </td>
                    <td>
                      <span className="badge badge-info">
                        {FORMA_PAGO_LABELS[c.forma_pago] ?? c.forma_pago}
                      </span>
                      {c.referencia_pago && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          Ref: {c.referencia_pago}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{
                        fontWeight: 800, fontSize: '0.95rem',
                        color: c.estado === 'anulado' ? 'var(--text-muted)' : '#ef4444',
                        textDecoration: c.estado === 'anulado' ? 'line-through' : 'none',
                      }}>
                        ${fmt(c.valor_pagado)}
                      </span>
                    </td>
                    <td>{getEstadoBadge(c.estado)}</td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                      <Send size={32} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
                      <div>No hay comprobantes de egreso registrados.</div>
                      <button
                        onClick={() => setIsModalOpen(true)}
                        className="btn btn-primary"
                        style={{ marginTop: 14, fontSize: '0.82rem' }}
                      >
                        <Plus size={14} /> Registrar primer pago
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <NuevoComprobanteEgresoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetch}
      />
    </div>
  )
}
