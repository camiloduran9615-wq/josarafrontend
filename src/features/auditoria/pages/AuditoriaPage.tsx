/**
 * Página de Auditoría — Audit Logs + verificación de hash chain.
 *
 * UX decisions:
 * - Tabla densa con paginación en servidor (audit logs pueden ser millones).
 * - Criticidad con badge de color prominente (critical = rojo pulsante).
 * - "Verificar integridad" lanza el SHA-256 chain check y muestra el resultado
 *   con un panel verde/rojo que el auditor puede interpretar de un vistazo.
 * - "Exportar CSV" dispara el blob download; botón deshabilitado mientras
 *   isPending para evitar descargas duplicadas.
 * - Panel de detalle lateral (drawer) al hacer click en un log — muestra
 *   old_values/new_values formateados como JSON con syntax highlighting simple.
 * - Solo roles auditor/admin/contador pueden ver esta página (guard en route).
 */
import { useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import {
  Shield, Download, RefreshCw, CheckCircle2,
  XCircle, X, ChevronRight,
} from 'lucide-react'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { useAuditLogs, useExportAuditLogs, useVerifyChain } from '../hooks/useAuditLogs'
import type { AuditFilters, AuditLog, CriticidadAudit } from '../api/audit.types'
import { formatDateTime, shortId, cn } from '@/lib/utils'

// ── JSON Viewer simple ───────────────────────────────────────────────
function JsonViewer({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return <span className="text-[var(--text-muted)] text-xs">—</span>
  return (
    <pre className="text-xs bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-3 overflow-auto max-h-48 text-emerald-300">
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}

// ── Drawer de detalle ────────────────────────────────────────────────
function AuditLogDrawer({
  log,
  onClose,
}: {
  log: AuditLog | null
  onClose: () => void
}) {
  if (!log) return null
  return (
    <div className="fixed inset-0 z-40 flex justify-end" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}>
      <div
        className="w-full max-w-lg h-full bg-[var(--bg-card)] border-l border-[var(--border)] overflow-y-auto"
        style={{ animation: 'slideInRight 0.25s ease' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] sticky top-0 bg-[var(--bg-card)]">
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">Detalle del log</h3>
            <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">{log.id}</p>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X size={15} />
          </button>
        </div>

        {/* Contenido */}
        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-0.5">Acción</p>
              <p className="font-mono text-[var(--accent-light)]">{log.action}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-0.5">Criticidad</p>
              <StatusBadge value={log.criticidad} />
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-0.5">Fecha</p>
              <p>{formatDateTime(log.created_at)}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-0.5">Usuario</p>
              <p>{log.user_email_snapshot ?? '—'}</p>
              {log.user_role_snapshot && (
                <span className="badge badge-info mt-1">{log.user_role_snapshot}</span>
              )}
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-0.5">IP</p>
              <p className="font-mono text-xs">{log.ip_address}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-0.5">Entidad</p>
              <p className="text-xs">{log.auditable_type?.split('\\').pop() ?? '—'}</p>
              {log.auditable_id && (
                <p className="font-mono text-xs text-[var(--text-muted)]">{shortId(log.auditable_id)}</p>
              )}
            </div>
          </div>

          {log.motivo && (
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-1">Motivo</p>
              <p className="text-sm text-[var(--text-primary)] bg-[var(--bg-surface)] rounded-lg px-3 py-2 border border-[var(--border)]">
                {log.motivo}
              </p>
            </div>
          )}

          <div>
            <p className="text-xs text-[var(--text-muted)] mb-1">Valores anteriores</p>
            <JsonViewer data={log.old_values} />
          </div>

          <div>
            <p className="text-xs text-[var(--text-muted)] mb-1">Valores nuevos</p>
            <JsonViewer data={log.new_values} />
          </div>

          {/* Hash chain */}
          <div className="space-y-2">
            <p className="text-xs text-[var(--text-muted)]">Hash chain</p>
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-3 space-y-1">
              <p className="text-[10px] text-[var(--text-muted)]">Anterior:</p>
              <p className="font-mono text-[10px] text-[var(--text-subtle)] break-all">
                {log.hash_anterior ?? '(primer registro)'}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] mt-2">Actual:</p>
              <p className="font-mono text-[10px] text-emerald-400 break-all">
                {log.hash_actual}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────────
export function AuditoriaPage() {
  const [filters, setFilters] = useState<AuditFilters>({ page: 1, per_page: 25 })
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [chainResult, setChainResult] = useState<{
    ok: boolean; invalidId?: string | null
  } | null>(null)

  const { data, isLoading, isFetching, refetch } = useAuditLogs(filters)
  const exportMutation  = useExportAuditLogs()
  const verifyMutation  = useVerifyChain()

  const logs = data?.data ?? []
  const meta = data?.meta

  const columns: ColumnDef<AuditLog>[] = [
    {
      id: 'created_at',
      accessorKey: 'created_at',
      header: 'Fecha',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs">{formatDateTime(getValue() as string)}</span>
      ),
    },
    {
      id: 'criticidad',
      accessorKey: 'criticidad',
      header: 'Crit.',
      cell: ({ getValue }) => <StatusBadge value={getValue() as string} size="sm" />,
    },
    {
      id: 'action',
      accessorKey: 'action',
      header: 'Acción',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-[var(--accent-light)]">{getValue() as string}</span>
      ),
    },
    {
      id: 'user_email_snapshot',
      accessorKey: 'user_email_snapshot',
      header: 'Usuario',
      cell: ({ getValue }) => <span className="text-xs">{(getValue() as string | null) ?? '—'}</span>,
    },
    {
      id: 'auditable_type',
      accessorKey: 'auditable_type',
      header: 'Entidad',
      cell: ({ getValue }) => {
        const v = (getValue() as string | null)
        return <span className="text-xs text-[var(--text-muted)]">{v?.split('\\').pop() ?? '—'}</span>
      },
    },
    {
      id: 'ip_address',
      accessorKey: 'ip_address',
      header: 'IP',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-[var(--text-muted)]">{getValue() as string}</span>
      ),
    },
    {
      id: 'detail',
      header: '',
      cell: () => (
        <ChevronRight size={14} className="text-[var(--text-muted)]" />
      ),
    },
  ]

  const table = useReactTable({
    data:             logs,
    columns,
    getCoreRowModel:  getCoreRowModel(),
    manualPagination: true,
    rowCount:         meta?.total ?? 0,
  })

  return (
    <div className="main-content fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Auditoría</h1>
          <p className="page-subtitle">Trazabilidad completa de operaciones del sistema</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => refetch()} disabled={isFetching} className="btn-icon" title="Refrescar">
            <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
          </button>

          {/* Verificar integridad de cadena SHA-256 */}
          <button
            onClick={() =>
              verifyMutation.mutate(undefined, {
                onSuccess: (r) => setChainResult({ ok: r.integrity_ok, invalidId: r.first_invalid_id }),
              })
            }
            disabled={verifyMutation.isPending}
            className="btn btn-secondary"
          >
            {verifyMutation.isPending
              ? <span className="spinner" style={{ width: 16, height: 16 }} />
              : <Shield size={15} />
            }
            Verificar integridad
          </button>

          {/* Exportar CSV */}
          <button
            onClick={() => exportMutation.mutate(filters)}
            disabled={exportMutation.isPending}
            className="btn btn-primary"
          >
            {exportMutation.isPending
              ? <span className="spinner" style={{ width: 16, height: 16 }} />
              : <Download size={15} />
            }
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Banner de resultado de verificación */}
      {chainResult && (
        <div
          className={cn(
            'flex items-center gap-3 px-5 py-3 rounded-xl mb-4 text-sm border',
            chainResult.ok
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-red-500/10 border-red-500/20 text-red-300',
          )}
        >
          {chainResult.ok
            ? <><CheckCircle2 size={18} /> Cadena de hashes íntegra. No se detectó tampering en ningún registro.</>
            : <><XCircle size={18} /> ¡Integridad comprometida! Primer registro inválido: <code className="font-mono ml-1">{chainResult.invalidId}</code></>
          }
          <button onClick={() => setChainResult(null)} className="ml-auto btn-icon">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filtros rápidos por criticidad */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {(['', 'info', 'warning', 'critical'] as (CriticidadAudit | '')[]).map((c) => (
          <button
            key={c}
            onClick={() => setFilters((f) => ({ ...f, page: 1, criticidad: c || undefined }))}
            className={cn(
              'btn btn-sm',
              filters.criticidad === c || (!c && !filters.criticidad)
                ? 'btn-primary'
                : 'btn-secondary',
            )}
          >
            {c === ''        ? 'Todos'       : ''}
            {c === 'info'    ? 'Info'        : ''}
            {c === 'warning' ? 'Advertencia' : ''}
            {c === 'critical'? 'Crítico'     : ''}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          <table>
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}>
                      {columns.map((_, j) => (
                        <td key={j}>
                          <div className="h-3 rounded" style={{ background: 'var(--bg-hover)', animation: 'pulse 1.8s ease-in-out infinite' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                : table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedLog(row.original)}
                    style={{ cursor: 'pointer' }}
                    className={cn(row.original.criticidad === 'critical' && 'border-l-2 border-l-red-500')}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
            <p className="text-xs text-[var(--text-muted)]">
              {meta.total.toLocaleString('es-CO')} eventos — Página {meta.current_page}/{meta.last_page}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
                disabled={(filters.page ?? 1) <= 1}
                className="btn btn-secondary btn-sm"
              >← Anterior</button>
              <button
                onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
                disabled={(filters.page ?? 1) >= meta.last_page}
                className="btn btn-secondary btn-sm"
              >Siguiente →</button>
            </div>
          </div>
        )}
      </div>

      {/* Drawer de detalle */}
      {selectedLog && (
        <AuditLogDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  )
}
