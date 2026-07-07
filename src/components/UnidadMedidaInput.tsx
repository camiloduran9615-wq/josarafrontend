import { useState, useEffect, useRef } from 'react'
import { Search } from 'lucide-react'

export const UNIDADES_DIAN = [
  { code: '94',  label: 'Unidad' },
  { code: '70',  label: 'Actividad' },
  { code: 'KGM', label: 'Kilogramo' },
  { code: 'GRM', label: 'Gramo' },
  { code: 'TNE', label: 'Tonelada métrica' },
  { code: 'LTR', label: 'Litro' },
  { code: 'MLT', label: 'Mililitro' },
  { code: 'MTR', label: 'Metro' },
  { code: 'CMT', label: 'Centímetro' },
  { code: 'MMT', label: 'Milímetro' },
  { code: 'MTK', label: 'Metro cuadrado' },
  { code: 'CMK', label: 'Centímetro cuadrado' },
  { code: 'MTQ', label: 'Metro cúbico' },
  { code: 'CMQ', label: 'Centímetro cúbico' },
  { code: 'HUR', label: 'Hora' },
  { code: 'MIN', label: 'Minuto' },
  { code: 'DAY', label: 'Día' },
  { code: 'WEE', label: 'Semana' },
  { code: 'MON', label: 'Mes' },
  { code: 'ANN', label: 'Año' },
  { code: 'SET', label: 'Kit / Conjunto' },
  { code: 'PAR', label: 'Par' },
  { code: 'DZN', label: 'Docena' },
  { code: 'GLL', label: 'Galón americano' },
  { code: 'BX',  label: 'Caja' },
  { code: 'BG',  label: 'Bolsa' },
  { code: 'BO',  label: 'Botella' },
  { code: 'PK',  label: 'Paquete' },
  { code: 'RL',  label: 'Rollo' },
  { code: 'ST',  label: 'Hoja' },
  { code: 'GL',  label: 'Galón' },
  { code: 'E48', label: 'Servicio' },
  { code: 'ZZ',  label: 'Ítem mutualmente definido' },
]

export default function UnidadMedidaInput({
  value, onChange,
}: { value: string; onChange: (code: string) => void }) {
  const selected = UNIDADES_DIAN.find(u => u.code === value)
  const [search, setSearch] = useState(selected ? `${selected.code} - ${selected.label}` : '')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const s = UNIDADES_DIAN.find(u => u.code === value)
    setSearch(s ? `${s.code} - ${s.label}` : value)
  }, [value])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = UNIDADES_DIAN.filter(u => {
    const q = search.toLowerCase()
    return !q || u.code.toLowerCase().includes(q) || u.label.toLowerCase().includes(q)
  })

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search size={13} style={{
          position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--text-muted)', pointerEvents: 'none',
        }} />
        <input
          className="input"
          style={{ paddingLeft: 28 }}
          placeholder="Buscar unidad DIAN..."
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
        />
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          zIndex: 9999, maxHeight: 220, overflowY: 'auto',
        }}>
          {filtered.length === 0
            ? <div style={{ padding: '10px 12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sin resultados</div>
            : filtered.map(u => (
              <button
                key={u.code} type="button"
                onClick={() => { onChange(u.code); setSearch(`${u.code} - ${u.label}`); setOpen(false) }}
                style={{
                  width: '100%', display: 'flex', gap: 12, padding: '8px 12px',
                  border: 'none', background: u.code === value ? 'rgba(99,102,241,0.1)' : 'none',
                  cursor: 'pointer', textAlign: 'left', alignItems: 'center',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = u.code === value ? 'rgba(99,102,241,0.1)' : 'none')}
              >
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-light)', minWidth: 40 }}>{u.code}</span>
                <span style={{ fontSize: '0.8rem' }}>{u.label}</span>
              </button>
            ))
          }
        </div>
      )}
    </div>
  )
}
