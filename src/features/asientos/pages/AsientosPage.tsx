/**
 * Página principal del Libro Diario (Asientos).
 *
 * UX decisions:
 * - TanStack Table para sorting/filtering en servidor (no en cliente, el libro
 *   puede tener miles de registros).
 * - Skeleton loaders mientras carga la primera página.
 * - Columna "Acciones" condicional según el rol y el estado del asiento:
 *     borrador  → [Aprobar] [Editar] [Descartar]
 *     aprobado  → [Anular] [Reversar]
 *     anulado/reversado → solo lectura
 * - Botón "Nuevo asiento" abre un panel lateral (simplificado aquí como
 *   navegación a /asientos/nuevo).
 * - Segregación visual: el botón Aprobar está deshabilitado si el usuario
 *   es el creador del asiento (misma lógica que el backend).
 */
import { useState, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { Plus, RefreshCw, Filter } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { ApproveButton, VoidButton, ReverseButton } from '../components/AsientoActions'
import { useAsientos, useDiscardAsiento } from '../hooks/useAsientos'
import { useAuthStore, useIsContador } from '@/shared/stores/auth.store'
import type { Asiento, AsientoFilters, EstadoAsiento } from '../api/asientos.types'
import { formatDate, formatCOP } from '@/lib/utils'

const ESTADO_OPTIONS: { value: EstadoAsiento | ''; label: string }[] = [
  { value: '',           label: 'Todos los estados' },
  { value: 'borrador',  label: 'Borrador' },
  { value: 'aprobado',  label: 'Aprobado' },
  { value: 'anulado',   label: 'Anulado' },
  { value: 'reversado', label: 'Reversado' },
]

export function AsientosPage() {
  const navigate       = useNavigate()
  const user           = useAuthStore((s) => s.user)
  const isContador     = useIsContador()
  const isAdmin        = user?.role === 'admin'
  const discardMutation = useDiscardAsiento()

  // ── Filtros y paginación ─────────────────────────────────────────
  const [filters, setFilters] = useState<AsientoFilters>({
    page: 1, per_page: 25, sort: '-fecha',
  })
  const [sorting, setSorting] = useState<SortingState>([])

  // Sincronizar sorting de TanStack Table con los params de API
  const filtersWithSort = useMemo(() => {
    const sort = sorting[0]
      ? `${sorting[0].desc ? '-' : ''}${sorting[0].id}`
      : '-fecha'
    return { ...filters, sort }
  }, [filters, sorting])

  const { data, isLoading, isFetching, refetch } = useAsientos(filtersWithSort)

  // ── Definición de columnas ────────────────────────────────────────
  const columns = useMemo<ColumnDef<Asiento>[]>(
    () => [
      {
        id: 'numero',
        accessorKey: 'numero',
        header: 'N° Asiento',
        enableSorting: true,
        cell: ({ getValue }) => (
          <span className="font-mono text-xs font-semibold text-[var(--accent-light)]">
            {(getValue() as string | null) ?? '—'}
          </span>
        ),
      },
      {
        id: 'fecha',
        accessorKey: 'fecha',
        header: 'Fecha',
        enableSorting: true,
        cell: ({ getValue }) => formatDate(getValue() as string),
      },
      {
        id: 'tipo_comprobante',
        accessorKey: 'tipo_comprobante',
        header: 'Tipo',
        cell: ({ getValue }) => (
          <span className="badge badge-info">{getValue() as string}</span>
        ),
      },
      {
        id: 'descripcion',
        accessorKey: 'descripcion',
        header: 'Descripción',
        cell: ({ getValue }) => {
          const v = getValue() as string
          return <span title={v}>{v.length > 50 ? v.slice(0, 50) + '…' : v}</span>
        },
      },
      {
        id: 'debito_total',
        header: '∑ Débito',
        cell: ({ row }) => {
          const total = row.original.lineas?.reduce(
            (acc, l) => acc + parseFloat(l.debito), 0,
          ) ?? 0
          return <span className="font-mono text-xs text-right block">{formatCOP(total)}</span>
        },
      },
      {
        id: 'estado',
        accessorKey: 'estado',
        header: 'Estado',
        enableSorting: true,
        cell: ({ getValue }) => <StatusBadge value={getValue() as string} />,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const a    = row.original
          const uid  = user?.id ?? ''
          return (
            <div className="flex items-center gap-1.5 justify-end">
              {a.estado === 'borrador' && (isContador || isAdmin) && (
                <ApproveButton asiento={a} userId={uid} />
              )}
              {a.estado === 'aprobado' && (isContador || isAdmin) && (
                <>
                  <VoidButton asiento={a} />
                  <ReverseButton asiento={a} />
                </>
              )}
              {a.estado === 'borrador' && (
                <>
                  {/* Editar inline pendiente — por ahora se descarta y se crea de nuevo */}
                  <button
                    onClick={() => {
                      if (confirm('¿Descartar este borrador? No se puede deshacer.')) {
                        discardMutation.mutate(a.id)
                      }
                    }}
                    className="btn btn-danger btn-sm"
                  >
                    Descartar
                  </button>
                </>
              )}
            </div>
          )
        },
      },
    ],
    [isContador, isAdmin, navigate, user?.id, discardMutation],
  )

  const table = useReactTable({
    data:              data?.data ?? [],
    columns,
    state:             { sorting },
    onSortingChange:   setSorting,
    getCoreRowModel:   getCoreRowModel(),
    manualPagination:  true,
    manualSorting:     true,
    rowCount:          data?.meta.total ?? 0,
  })

  const meta = data?.meta

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="main-content fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Libro Diario</h1>
          <p className="page-subtitle">
            {meta ? `${meta.total.toLocaleString('es-CO')} asientos en total` : 'Cargando…'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn-icon"
            title="Actualizar"
          >
            <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => navigate('/asientos/nuevo')}
            className="btn btn-primary"
          >
            <Plus size={16} /> Nuevo asiento
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter size={15} className="text-[var(--text-muted)]" />

          <select
            value={filters.estado ?? ''}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                page: 1,
                estado: (e.target.value as EstadoAsiento) || undefined,
              }))
            }
            className="input"
            style={{ width: 'auto', minWidth: 180 }}
          >
            {ESTADO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <input
            type="date"
            value={filters.fecha_desde ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, page: 1, fecha_desde: e.target.value || undefined }))}
            className="input"
            style={{ width: 'auto' }}
            placeholder="Desde"
          />
          <input
            type="date"
            value={filters.fecha_hasta ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, page: 1, fecha_hasta: e.target.value || undefined }))}
            className="input"
            style={{ width: 'auto' }}
            placeholder="Hasta"
          />

          {(filters.estado || filters.fecha_desde || filters.fecha_hasta) && (
            <button
              onClick={() => setFilters({ page: 1, per_page: 25, sort: '-fecha' })}
              className="btn btn-secondary btn-sm"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          <table>
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      style={{ cursor: header.column.getCanSort() ? 'pointer' : 'default' }}
                    >
                      <span className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === 'asc'  && ' ↑'}
                        {header.column.getIsSorted() === 'desc' && ' ↓'}
                      </span>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {columns.map((_, j) => (
                        <td key={j}>
                          <div
                            className="h-4 rounded"
                            style={{
                              background: 'var(--bg-hover)',
                              animation: 'pulse 1.8s ease-in-out infinite',
                              width: `${60 + Math.random() * 30}%`,
                            }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))
                : table.getRowModel().rows.length === 0
                ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)' }}
                    >
                      No hay asientos que coincidan con los filtros aplicados.
                    </td>
                  </tr>
                )
                : table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => navigate(`/asientos/${row.original.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        onClick={cell.column.id === 'actions' ? (e) => e.stopPropagation() : undefined}
                      >
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
              Página {meta.current_page} de {meta.last_page} — {meta.total} registros
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
                disabled={(filters.page ?? 1) <= 1}
                className="btn btn-secondary btn-sm"
              >
                ← Anterior
              </button>
              <button
                onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
                disabled={(filters.page ?? 1) >= meta.last_page}
                className="btn btn-secondary btn-sm"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
