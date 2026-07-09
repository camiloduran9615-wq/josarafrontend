import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { UNIDADES_DIAN_FALLBACK, unidadesMedidaDianService, type UnidadMedidaOption } from '@/services/unidadesMedidaDian.service'

export default function UnidadMedidaInput({
  value,
  onChange,
}: {
  value: string
  onChange: (code: string) => void
}) {
  const [unidades, setUnidades] = useState<UnidadMedidaOption[]>(UNIDADES_DIAN_FALLBACK)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [usingFallback, setUsingFallback] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let mounted = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setUsingFallback(false)

    unidadesMedidaDianService.getActivas()
      .then(options => {
        if (!mounted) return
        if (options.length > 0) {
          setUnidades(options)
          setUsingFallback(false)
        } else {
          setUnidades(UNIDADES_DIAN_FALLBACK)
          setUsingFallback(true)
        }
      })
      .catch(() => {
        if (!mounted) return
        setUnidades(UNIDADES_DIAN_FALLBACK)
        setUsingFallback(true)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => { mounted = false }
  }, [])

  useEffect(() => {
    const selected = unidades.find(u => u.code === value) ?? UNIDADES_DIAN_FALLBACK.find(u => u.code === value)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearch(selected ? `${selected.code} - ${selected.label}` : value)
  }, [value, unidades])

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return unidades.filter(unidad => (
      !q || unidad.code.toLowerCase().includes(q) || unidad.label.toLowerCase().includes(q)
    ))
  }, [search, unidades])

  return (
    <div ref={ref} className="unit-measure-input">
      <div className="unit-measure-input__control">
        <Search size={13} className="unit-measure-input__icon" aria-hidden="true" />
        <input
          className="input unit-measure-input__field"
          placeholder="Buscar unidad DIAN..."
          value={search}
          onChange={event => { setSearch(event.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          aria-autocomplete="list"
          aria-expanded={open}
        />
        {loading && <Loader2 size={14} className="spinner unit-measure-input__loader" aria-hidden="true" />}
      </div>

      {usingFallback && (
        <div className="unit-measure-input__status">Usando catálogo base de unidades DIAN.</div>
      )}

      {open && (
        <div className="unit-measure-input__menu" role="listbox">
          {filtered.length === 0
            ? <div className="unit-measure-input__empty">Sin resultados</div>
            : filtered.map(unidad => (
              <button
                key={unidad.code}
                type="button"
                className={`unit-measure-input__option ${unidad.code === value ? 'unit-measure-input__option--active' : ''}`}
                onClick={() => { onChange(unidad.code); setSearch(`${unidad.code} - ${unidad.label}`); setOpen(false) }}
                role="option"
                aria-selected={unidad.code === value}
              >
                <span className="unit-measure-input__code">{unidad.code}</span>
                <span className="unit-measure-input__label">{unidad.label}</span>
              </button>
            ))
          }
        </div>
      )}
    </div>
  )
}
