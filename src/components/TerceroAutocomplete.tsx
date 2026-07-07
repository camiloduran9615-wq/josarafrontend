import { useState, useEffect, useRef, useMemo } from 'react'
import { Users, X, Search, Check, Building2, User as UserIcon } from 'lucide-react'
import { tercerosService, type Tercero } from '@/services/terceros.service'

interface Props {
  value:        string  // ID UUID seleccionado
  onChange:     (id: string, t: Tercero | null) => void
  /** Filtro: 'clientes' | 'proveedores' | 'todos' */
  filtro?:      'clientes' | 'proveedores' | 'todos'
  placeholder?: string
  disabled?:    boolean
  className?:   string
  required?:    boolean
}

// Cache compartido entre instancias para evitar refetch en cada modal
let tercerosCache: Tercero[] | null = null
let tercerosPromise: Promise<Tercero[]> | null = null

async function fetchTerceros(): Promise<Tercero[]> {
  if (tercerosCache) return tercerosCache
  if (tercerosPromise) return tercerosPromise
  tercerosPromise = tercerosService.getAll().then(r => {
    tercerosCache = r.data ?? []
    return tercerosCache
  })
  return tercerosPromise
}

/** Invalidar cache (llamar después de crear/editar un tercero). */
export function invalidateTercerosCache() {
  tercerosCache = null
  tercerosPromise = null
}

/**
 * Autocomplete reutilizable de terceros (clientes/proveedores).
 * Busca por razón social, nombres+apellidos, o número de identificación.
 * Cache compartido — una sola llamada API por sesión.
 */
export default function TerceroAutocomplete({
  value, onChange, filtro = 'todos',
  placeholder, disabled, className, required,
}: Props) {
  const [todos, setTodos]         = useState<Tercero[]>([])
  const [query, setQuery]         = useState('')
  const [open, setOpen]           = useState(false)
  const [highlight, setHighlight] = useState(0)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Cargar terceros al montar
  useEffect(() => {
    let cancelled = false
    fetchTerceros().then(list => { if (!cancelled) setTodos(list) })
    return () => { cancelled = true }
  }, [])

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

  // Filtrar por rol
  const filtrados = useMemo(() => {
    return todos.filter(t => {
      if (!t.activo) return false
      if (filtro === 'clientes')   return t.es_cliente
      if (filtro === 'proveedores') return t.es_proveedor
      return true
    })
  }, [todos, filtro])

  const selected = useMemo(
    () => todos.find(t => t.id === value) ?? null,
    [todos, value],
  )

  const candidatos = useMemo(() => {
    if (!query.trim()) return filtrados.slice(0, 30)
    const q = query.trim().toLowerCase()
    return filtrados
      .filter(t => {
        const nombre = (t.razon_social ?? `${t.nombres ?? ''} ${t.apellidos ?? ''}`.trim()).toLowerCase()
        const ident  = (t.identificacion ?? '').toLowerCase()
        return nombre.includes(q) || ident.includes(q)
      })
      .slice(0, 30)
  }, [filtrados, query])

  const seleccionar = (t: Tercero) => {
    onChange(t.id, t)
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
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, candidatos.length - 1)) }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)) }
    else if (e.key === 'Enter')     { e.preventDefault(); if (candidatos[highlight]) seleccionar(candidatos[highlight]) }
    else if (e.key === 'Escape')    { setOpen(false) }
  }

  const labelTercero = (t: Tercero) =>
    t.razon_social ?? (`${t.nombres ?? ''} ${t.apellidos ?? ''}`.trim() || '(sin nombre)')

  const ph = placeholder ?? (
    filtro === 'clientes'    ? 'Busca cliente por nombre o NIT...' :
    filtro === 'proveedores' ? 'Busca proveedor por nombre o NIT...' :
                                'Busca tercero por nombre o documento...'
  )

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
            padding: '8px 12px',
            display: 'flex', alignItems: 'center', gap: 10,
            minHeight: 40,
            opacity: disabled ? 0.6 : 1,
          }}
        >
          {selected.tipo_persona === 'Persona Natural' ? (
            <UserIcon size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          ) : (
            <Building2 size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {labelTercero(selected)}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              {selected.identificacion}{selected.dv ? `-${selected.dv}` : ''}
              {selected.es_cliente   && <span style={{ marginLeft: 8, color: '#34d399' }}>Cliente</span>}
              {selected.es_proveedor && <span style={{ marginLeft: 8, color: '#a78bfa' }}>Proveedor</span>}
            </div>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); limpiar() }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
              title="Quitar"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
          }} />
          <input
            type="text"
            className="input"
            style={{ paddingLeft: 32 }}
            placeholder={ph}
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); setHighlight(0) }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            disabled={disabled}
            required={required && !value}
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
          zIndex: 100,
          maxHeight: 320, overflowY: 'auto',
          minWidth: 280,
        }}>
          {candidatos.length === 0 ? (
            <div style={{ padding: 14, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              <Users size={16} style={{ display: 'inline-block', marginRight: 6, opacity: 0.4 }} />
              {todos.length === 0 ? 'Cargando...' : `Sin ${filtro === 'todos' ? 'terceros' : filtro}`}
              {query && <div style={{ fontSize: '0.7rem', marginTop: 4 }}>para "{query}"</div>}
            </div>
          ) : (
            candidatos.map((t, idx) => {
              const isHighlighted = idx === highlight
              const isSelected    = t.id === value
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => seleccionar(t)}
                  onMouseEnter={() => setHighlight(idx)}
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '8px 12px',
                    background: isHighlighted ? 'var(--bg-surface)' : 'transparent',
                    border: 'none', cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', gap: 10,
                    fontSize: '0.8rem',
                  }}
                >
                  {t.tipo_persona === 'Persona Natural'
                    ? <UserIcon size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    : <Building2 size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      color: 'var(--text-primary)', fontWeight: 600,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {labelTercero(t)}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 1 }}>
                      {t.identificacion}{t.dv ? `-${t.dv}` : ''}
                      {t.es_cliente    && <span style={{ marginLeft: 6, color: '#34d399' }}>· Cli</span>}
                      {t.es_proveedor  && <span style={{ marginLeft: 6, color: '#a78bfa' }}>· Prov</span>}
                    </div>
                  </div>
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
