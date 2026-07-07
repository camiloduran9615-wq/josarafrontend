import { useState, useEffect, useRef } from 'react'
import { MapPin, Search, X, Loader2, Check } from 'lucide-react'
import { api } from '@/lib/api'

interface Municipio {
  codigo:              string
  nombre:              string
  departamento_codigo: string
  departamento_nombre: string
  nombre_completo:     string
  region?:             string | null
}

interface Props {
  value:          string                 // codigo DANE seleccionado (ej "41298")
  onChange:       (codigo: string, m: Municipio | null) => void
  placeholder?:   string
  disabled?:      boolean
  className?:     string
}

/**
 * Autocomplete reutilizable de municipios DANE.
 *
 * Busca contra /api/v1/municipios?search=... con debounce de 250ms.
 * Endpoint público — no requiere tenant ni autenticación.
 *
 * Uso:
 *   <MunicipioAutocomplete
 *     value={formData.municipio_id}
 *     onChange={(codigo, m) => set({ municipio_id: codigo })}
 *   />
 */
export default function MunicipioAutocomplete({
  value, onChange, placeholder = 'Busca por nombre o código (ej: Garzón, 41298)', disabled, className,
}: Props) {
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState<Municipio[]>([])
  const [open, setOpen]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const [selected, setSelected] = useState<Municipio | null>(null)
  const debounceRef = useRef<number | null>(null)
  const wrapperRef  = useRef<HTMLDivElement>(null)

  // Hidratar el municipio inicial si value tiene código
  useEffect(() => {
    if (!value) {
      setSelected(null)
      return
    }
    if (selected?.codigo === value) return
    api.get(`/municipios/${value}`)
      .then(res => {
        if (res.data?.success && res.data.data) {
          setSelected(res.data.data)
        }
      })
      .catch(() => { /* código inválido — no romper */ })
  }, [value])

  // Cerrar al hacer click fuera
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // Buscar con debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 2) {
      setResults([])
      return
    }
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true)
      try {
        const res = await api.get(`/municipios?search=${encodeURIComponent(query)}&limit=15`)
        setResults(res.data?.data ?? [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  const seleccionar = (m: Municipio) => {
    setSelected(m)
    onChange(m.codigo, m)
    setQuery('')
    setOpen(false)
    setResults([])
  }

  const limpiar = () => {
    setSelected(null)
    onChange('', null)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }} className={className}>
      {/* Estado seleccionado vs input de búsqueda */}
      {selected && !open ? (
        <div
          onClick={() => !disabled && setOpen(true)}
          style={{
            cursor: disabled ? 'not-allowed' : 'pointer',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '10px 12px',
            display: 'flex', alignItems: 'center', gap: 10,
            opacity: disabled ? 0.6 : 1,
          }}
        >
          <MapPin size={16} className="text-accent" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {selected.nombre}, {selected.departamento_nombre}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              Código DANE: {selected.codigo}
            </div>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); limpiar() }}
              style={{
                background: 'none', border: 'none',
                color: 'var(--text-muted)', cursor: 'pointer', padding: 4,
              }}
              title="Quitar municipio"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <Search
            size={14}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            className="input"
            style={{ paddingLeft: 36, paddingRight: 36 }}
            placeholder={placeholder}
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            disabled={disabled}
            autoComplete="off"
          />
          {loading && (
            <Loader2
              size={14}
              className="spinner"
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--accent)' }}
            />
          )}
        </div>
      )}

      {/* Dropdown de resultados */}
      {open && (query.length >= 2) && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          zIndex: 30,
          maxHeight: 280, overflowY: 'auto',
        }}>
          {loading ? (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              <Loader2 size={16} className="spinner" style={{ display: 'inline-block', marginRight: 6 }} />
              Buscando...
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              {query.length < 2
                ? 'Escribe al menos 2 caracteres'
                : `Sin resultados para "${query}"`}
              <div style={{ fontSize: '0.7rem', marginTop: 6, color: 'var(--text-muted)' }}>
                Si tu municipio no aparece, contacta al admin para sincronizar el catálogo completo DANE.
              </div>
            </div>
          ) : (
            results.map(m => {
              const isSelected = selected?.codigo === m.codigo
              return (
                <button
                  key={m.codigo}
                  type="button"
                  onClick={() => seleccionar(m)}
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '10px 14px',
                    background: isSelected ? 'rgba(99,102,241,0.1)' : 'transparent',
                    border: 'none', cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', gap: 10,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-surface)' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                >
                  <MapPin size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      <span style={{ fontWeight: 600 }}>{m.nombre}</span>
                      <span style={{ color: 'var(--text-muted)' }}>, {m.departamento_nombre}</span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 2 }}>
                      DANE: {m.codigo}
                      {m.region && <span style={{ marginLeft: 8 }}>· {m.region}</span>}
                    </div>
                  </div>
                  {isSelected && <Check size={14} className="text-accent" />}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
