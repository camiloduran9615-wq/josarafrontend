import { useEffect, useState } from 'react'
import { FileX, Plus, ExternalLink, Loader2 } from 'lucide-react'
import { notaCreditoService, type NotaCredito } from '@/services/notaCredito.service'
import NuevaNotaCreditoModal from './NuevaNotaCreditoModal'

const fmt = (n: number) => n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

export default function NotasCreditoPage() {
  const [notas, setNotas]     = useState<NotaCredito[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen]       = useState(false)

  const cargar = async () => {
    setLoading(true)
    try {
      const r = await notaCreditoService.list()
      setNotas(r.data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const totalAnulado = notas.reduce((s, n) => s + Number(n.valor_total || 0), 0)

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 className="page-title">
            <FileX size={22} style={{ display: 'inline', marginRight: 8, verticalAlign: '-4px' }} />
            Notas Crédito
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
            Anula facturas validadas y reversa contablemente (ventas, IVA, cartera, inventario y costo).
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>
          <Plus size={16} /> Nueva Nota Crédito
        </button>
      </div>

      {/* KPI compacto */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12,
        marginBottom: 16,
      }}>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total anulado</div>
          <div style={{ fontWeight: 800, fontSize: '1.4rem', color: '#ef4444' }}>
            ${fmt(totalAnulado)}
          </div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Notas emitidas</div>
          <div style={{ fontWeight: 800, fontSize: '1.4rem' }}>{notas.length}</div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <Loader2 size={24} className="spinner" />
          </div>
        ) : notas.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            <FileX size={36} style={{ opacity: 0.3, marginBottom: 8 }} />
            <div style={{ fontSize: '0.9rem' }}>Aún no has emitido notas crédito.</div>
          </div>
        ) : (
          <table style={{ width: '100%', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface)', textAlign: 'left' }}>
                <th style={{ padding: 10 }}>Fecha</th>
                <th style={{ padding: 10 }}>Nº NC</th>
                <th style={{ padding: 10 }}>Factura original</th>
                <th style={{ padding: 10 }}>Cliente</th>
                <th style={{ padding: 10 }}>Motivo</th>
                <th style={{ padding: 10, textAlign: 'right' }}>Valor</th>
                <th style={{ padding: 10 }}>Estado</th>
                <th style={{ padding: 10 }}></th>
              </tr>
            </thead>
            <tbody>
              {notas.map(n => {
                const esLocal = n.numero_completo?.startsWith('NC-LOCAL') || !n.cufe
                return (
                  <tr key={n.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: 10 }}>{n.created_at?.split('T')[0]}</td>
                    <td style={{ padding: 10, fontFamily: 'monospace', fontWeight: 600 }}>
                      {n.numero_completo}
                      {esLocal && (
                        <span style={{
                          marginLeft: 6, fontSize: '0.6rem', padding: '1px 5px',
                          background: '#94a3b822', color: '#94a3b8',
                          borderRadius: 10, fontWeight: 700,
                        }}>LOCAL</span>
                      )}
                    </td>
                    <td style={{ padding: 10, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      {n.factura?.numero_completo ?? '—'}
                    </td>
                    <td style={{ padding: 10 }}>{n.factura?.tercero?.razon_social ?? '—'}</td>
                    <td style={{ padding: 10, fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {n.discrepancy_response_description}
                    </td>
                    <td style={{ padding: 10, textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>
                      ${fmt(Number(n.valor_total))}
                    </td>
                    <td style={{ padding: 10 }}>
                      <span style={{
                        fontSize: '0.7rem',
                        padding: '2px 8px',
                        borderRadius: 12,
                        background: n.estado === 'validado' ? '#34d39922' : '#ef444422',
                        color: n.estado === 'validado' ? '#34d399' : '#ef4444',
                        fontWeight: 700,
                      }}>
                        {n.estado}
                      </span>
                    </td>
                    <td style={{ padding: 10 }}>
                      {n.public_url && (
                        <a href={n.public_url} target="_blank" rel="noreferrer" className="btn-icon" title="Ver en Factus">
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <NuevaNotaCreditoModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onSuccess={cargar}
      />
    </div>
  )
}
