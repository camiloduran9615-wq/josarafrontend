import { useState, useEffect, useRef, useMemo } from 'react'
import { BookOpen, X, Search, Check } from 'lucide-react'
import { api } from '@/lib/api'
import { getTenantId } from '@/services/auth.service'

interface Cuenta {
  id:                  string
  codigo:              string
  nombre:              string
  acepta_movimientos?: boolean
  children?:           Cuenta[]
}

interface Props {
  value:        string                       // UUID seleccionado
  onChange:     (id: string, c: Cuenta | null) => void
  placeholder?: string
  disabled?:    boolean
  className?:   string
  /** Si true, solo permite cuentas hoja (acepta_movimientos=true). Default true. */
  onlyLeaves?:  boolean
  /** Si se pasa, solo muestra cuentas cuyo código empiece por estos prefijos (ej: ['1','5']) */
  prefixFilter?: string[]
}

// ── Cache compartido entre instancias para evitar refetch ────────────────────
let cuentasCache: Cuenta[] | null = null
let cuentasPromise: Promise<Cuenta[]> | null = null

function flatten(nodes: Cuenta[], onlyLeaves: boolean): Cuenta[] {
  const out: Cuenta[] = []
  const walk = (arr: Cuenta[]) => {
    for (const n of arr) {
      if (!onlyLeaves || n.acepta_movimientos) out.push(n)
      if (n.children?.length) walk(n.children)
    }
  }
  walk(nodes)
  return out.sort((a, b) => a.codigo.localeCompare(b.codigo))
}

async function fetchCuentas(): Promise<Cuenta[]> {
  if (cuentasCache) return cuentasCache
  if (cuentasPromise) return cuentasPromise
  cuentasPromise = api.get(`/${getTenantId()}/cuentas-contables`).then(res => {
    cuentasCache = res.data?.data ?? []
    return cuentasCache!
  })
  return cuentasPromise
}

/** Invalidar cache (llamar después de crear una cuenta nueva). */
export function invalidateCuentasCache() {
  cuentasCache = null
  cuentasPromise = null
}

/**
 * Autocomplete de cuentas contables. Busca por código o por nombre.
 * Carga TODAS las cuentas una sola vez (cache compartido) y filtra client-side
 * — el PUC tiene ~150 cuentas hoja, no justifica búsqueda en servidor.
 */
export default function CuentaAutocomplete({
  value, onChange,
  placeholder = 'Busca por código o nombre (ej: 1110, caja, ventas)',
  disabled, className, onlyLeaves = true, prefixFilter,
}: Props) {
  const [todas, setTodas]       = useState<Cuenta[]>([])
  const [query, setQuery]       = useState('')
  const [open, setOpen]         = useState(false)
  const [highlight, setHighlight] = useState(0)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Cargar cuentas al montar
  useEffect(() => {
    let cancelled = false
    fetchCuentas().then(arbol => {
      if (cancelled) return
      setTodas(flatten(arbol, onlyLeaves))
    })
    return () => { cancelled = true }
  }, [onlyLeaves])

  // Cerrar al clic fuera
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const selected = useMemo(
    () => todas.find(c => c.id === value) ?? null,
    [todas, value],
  )

  const candidatos = useMemo(() => {
    let base = todas
    if (prefixFilter?.length) {
      base = base.filter(c => prefixFilter.some(p => c.codigo.startsWith(p)))
    }
    if (!query.trim()) return base.slice(0, 30)
    const q = query.trim().toLowerCase()
    return base
      .filter(c => c.codigo.includes(q) || c.nombre.toLowerCase().includes(q))
      .slice(0, 30)
  }, [todas, query, prefixFilter])

  const seleccionar = (c: Cuenta) => {
    onChange(c.id, c)
    setQuery('')
    setOpen(false)
    setHighlight(0)
  }

  const limpiar = () => {
    onChange('', null)
    setQuery('')
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight(h => Math.min(h + 1, candidatos.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight(h => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (candidatos[highlight]) seleccionar(candidatos[highlight])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }} className={className}>
      {selected && !open ? (
        <div
          onClick={() => !disabled && setOpen(true)}
          style={{
            cursor: disabled ? 'not-allowed' : 'pointer',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '6px 10px',
            display: 'flex', alignItems: 'center', gap: 8,
            minHeight: 36,
            opacity: disabled ? 0.6 : 1,
          }}
        >
          <span style={{
            fontFamily: 'monospace', fontSize: '0.78rem',
            color: 'var(--accent)', fontWeight: 700, flexShrink: 0,
          }}>
            {selected.codigo}
          </span>
          <span style={{
            fontSize: '0.78rem', color: 'var(--text-primary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            flex: 1, minWidth: 0,
          }}>
            {selected.nombre}
          </span>
          {!disabled && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); limpiar() }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}
              title="Quitar"
            >
              <X size={13} />
            </button>
          )}
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <Search size={12} style={{
            position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
          }} />
          <input
            type="text"
            className="input"
            style={{ paddingLeft: 26, fontSize: '0.8rem' }}
            placeholder={placeholder}
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); setHighlight(0) }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            disabled={disabled}
            autoComplete="off"
          />
        </div>
      )}

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          zIndex: 9999,
          maxHeight: 320, overflowY: 'auto',
          minWidth: 320,
        }}>
          {candidatos.length === 0 ? (
            <div style={{ padding: 14, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              <BookOpen size={16} style={{ display: 'inline-block', marginRight: 6, opacity: 0.4 }} />
              Sin coincidencias
              {prefixFilter && (
                <div style={{ fontSize: '0.7rem', marginTop: 4 }}>
                  Filtrado por cuentas que inician con: {prefixFilter.join(', ')}
                </div>
              )}
            </div>
          ) : (
            candidatos.map((c, idx) => {
              const isHighlighted = idx === highlight
              const isSelected    = c.id === value
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => seleccionar(c)}
                  onMouseEnter={() => setHighlight(idx)}
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '7px 12px',
                    background: isHighlighted ? 'var(--bg-surface)' : 'transparent',
                    border: 'none', cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', gap: 10,
                    fontSize: '0.8rem',
                  }}
                >
                  <span style={{
                    fontFamily: 'monospace',
                    color: 'var(--accent)', fontWeight: 700,
                    minWidth: 64, flexShrink: 0,
                  }}>
                    {c.codigo}
                  </span>
                  <span style={{
                    color: 'var(--text-primary)',
                    flex: 1, minWidth: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {c.nombre}
                  </span>
                  {isSelected && <Check size={13} style={{ color: 'var(--accent)' }} />}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
