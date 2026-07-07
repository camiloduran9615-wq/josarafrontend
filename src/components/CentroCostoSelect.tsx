/**
 * CentroCostoSelect — selector jerárquico en CASCADA (3 niveles).
 *
 * Comportamiento:
 *  1. Siempre visible el selector Nivel 1 (centros raíz).
 *  2. Si el Nivel 1 tiene hijos → aparece el selector Nivel 2.
 *  3. Si el Nivel 2 tiene hijos → aparece el selector Nivel 3.
 *  4. El valor reportado es el ID del nivel más profundo seleccionado.
 *     Si el usuario solo escoge Nivel 1 (aunque tenga hijos), el ID es de Nivel 1.
 *
 * Mejoras sobre SIIGO:
 *  ✔ Los dropdowns de subcentros solo aparecen si existen (sin selects vacíos)
 *  ✔ Cada opción muestra código + nombre + conteo de hijos disponibles
 *  ✔ Breadcrumb con la ruta completa del centro elegido
 *  ✔ Botón "limpiar" independiente por nivel
 *  ✔ Conector visual entre niveles (└─)
 *  ✔ Color coding por nivel idéntico al panel de gestión
 *  ✔ Caché de módulo: una sola llamada por sesión
 *  ✔ Compatible con modo edición: reconstruye la cascada desde el id guardado
 */
import { useState, useEffect } from 'react'
import { X, ChevronRight } from 'lucide-react'
import { centrosCostoService, type CentroCosto } from '@/services/inventario.service'

// ── Paleta por nivel (igual que CentrosCostoPage) ─────────────────────────
const NIVEL_COLOR: Record<number, string> = {
  1: 'var(--accent)',
  2: '#10b981',
  3: '#f59e0b',
}
const NIVEL_LABEL: Record<number, string> = {
  1: 'Centro',
  2: 'Subcentro',
  3: 'Sub-subcentro',
}

// ── Caché de módulo ────────────────────────────────────────────────────────
let _cache: CentroCosto[] | null = null

export function invalidateCentrosCostoCache() {
  _cache = null
}

// ── Props ──────────────────────────────────────────────────────────────────
interface Props {
  value:      string
  onChange:   (id: string) => void
  className?: string
  style?:     React.CSSProperties
  required?:  boolean
  label?:     string
  /** Oculta el label exterior (útil cuando el padre ya lo muestra) */
  hideLabel?: boolean
}

// ── Helpers ────────────────────────────────────────────────────────────────

function childrenOf(centros: CentroCosto[], parentId: string): CentroCosto[] {
  return centros
    .filter(c => c.parent_id === parentId)
    .sort((a, b) => a.codigo.localeCompare(b.codigo))
}

function childCount(centros: CentroCosto[], parentId: string): number {
  return centros.filter(c => c.parent_id === parentId).length
}

// ── Sub-componente: un nivel de la cascada ─────────────────────────────────

interface LevelSelectProps {
  nivel:    number
  items:    CentroCosto[]
  value:    string
  centros:  CentroCosto[]
  onChange: (id: string) => void
  onClear:  () => void
  required: boolean
  isFirst:  boolean
}

function LevelSelect({
  nivel, items, value, centros, onChange, onClear, required, isFirst,
}: LevelSelectProps) {
  const color = NIVEL_COLOR[nivel] ?? '#a78bfa'
  const label = NIVEL_LABEL[nivel] ?? `Nivel ${nivel}`

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {/* Conector visual entre niveles */}
      {!isFirst && (
        <ChevronRight
          size={13}
          style={{
            color: NIVEL_COLOR[nivel - 1] ?? 'var(--text-muted)',
            flexShrink: 0,
            marginLeft: (nivel - 2) * 12,
          }}
        />
      )}

      {/* Badge de nivel */}
      <span style={{
        fontSize: '0.68rem',
        fontWeight: 700,
        color,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
        borderRadius: 20,
        padding: '2px 8px',
        flexShrink: 0,
        whiteSpace: 'nowrap',
        minWidth: isFirst ? 66 : undefined,
        textAlign: 'center',
      }}>
        {label}
      </span>

      {/* Select */}
      <select
        className="input"
        value={value}
        required={required && isFirst}
        onChange={e => onChange(e.target.value)}
        style={{
          flex: 1,
          fontSize: '0.85rem',
          borderColor: value
            ? `color-mix(in srgb, ${color} 40%, var(--border))`
            : undefined,
          boxShadow: value
            ? `0 0 0 1px color-mix(in srgb, ${color} 20%, transparent)`
            : undefined,
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
      >
        <option value="">
          {isFirst ? '— Sin centro de costo —' : '— Sin subcentro —'}
        </option>

        {items.map(c => {
          const subs = childCount(centros, c.id)
          return (
            <option key={c.id} value={c.id}>
              [{c.codigo}] {c.nombre}
              {subs > 0 ? `  (${subs} sub${subs > 1 ? 'centros' : 'centro'})` : ''}
            </option>
          )
        })}
      </select>

      {/* Botón limpiar este nivel */}
      {value && (
        <button
          type="button"
          onClick={onClear}
          title={`Limpiar ${label.toLowerCase()}`}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 22, height: 22, borderRadius: 6, flexShrink: 0,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'background 0.12s, color 0.12s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = '#ef44441a'
            ;(e.currentTarget as HTMLButtonElement).style.color = '#ef4444'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface)'
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'
          }}
        >
          <X size={11} />
        </button>
      )}
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────

export default function CentroCostoSelect({
  value,
  onChange,
  className: _className,
  style,
  required = false,
  label = 'Centro de Costo',
  hideLabel = false,
}: Props) {
  const [centros, setCentros] = useState<CentroCosto[]>(_cache ?? [])
  const [loading, setLoading]   = useState(!_cache)

  // Selecciones internas por nivel
  const [sel1, setSel1] = useState('')
  const [sel2, setSel2] = useState('')
  const [sel3, setSel3] = useState('')

  // ── Carga de datos ────────────────────────────────────────────────────────
  useEffect(() => {
    if (_cache) return
    setLoading(true)
    centrosCostoService.getAllActivos()
      .then(data => { _cache = data; setCentros(data) })
      .catch(() => setCentros([]))
      .finally(() => setLoading(false))
  }, [])

  // ── Reconstrucción desde valor externo (modo edición) ─────────────────────
  // Se ejecuta al montar y cuando cambia `value` (p.ej. el padre resetea el form)
  useEffect(() => {
    if (!centros.length) return

    if (!value) {
      setSel1(''); setSel2(''); setSel3('')
      return
    }

    const centro = centros.find(c => c.id === value)
    if (!centro) return

    if (centro.nivel === 1) {
      setSel1(centro.id); setSel2(''); setSel3('')
    } else if (centro.nivel === 2) {
      setSel1(centro.parent_id ?? ''); setSel2(centro.id); setSel3('')
    } else if (centro.nivel === 3) {
      const parent = centros.find(c => c.id === centro.parent_id)
      setSel1(parent?.parent_id ?? ''); setSel2(centro.parent_id ?? ''); setSel3(centro.id)
    }
  }, [value, centros])

  // ── Listas derivadas ───────────────────────────────────────────────────────
  const nivel1Items = centros.filter(c => c.nivel === 1).sort((a, b) => a.codigo.localeCompare(b.codigo))
  const nivel2Items = sel1 ? childrenOf(centros, sel1) : []
  const nivel3Items = sel2 ? childrenOf(centros, sel2) : []

  const showLevel2 = sel1 !== '' && nivel2Items.length > 0
  const showLevel3 = sel2 !== '' && nivel3Items.length > 0

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSel1 = (id: string) => {
    setSel1(id); setSel2(''); setSel3('')
    onChange(id)
  }

  const handleSel2 = (id: string) => {
    setSel2(id); setSel3('')
    // Si deselecciona nivel 2, el valor sube a nivel 1
    onChange(id || sel1)
  }

  const handleSel3 = (id: string) => {
    setSel3(id)
    // Si deselecciona nivel 3, el valor sube a nivel 2 (o 1 si tampoco hay 2)
    onChange(id || sel2 || sel1)
  }

  const clearLevel1 = () => { setSel1(''); setSel2(''); setSel3(''); onChange('') }
  const clearLevel2 = () => { setSel2(''); setSel3(''); onChange(sel1) }
  const clearLevel3 = () => { setSel3(''); onChange(sel2 || sel1) }

  // ── Breadcrumb del path seleccionado ─────────────────────────────────────
  const getInfo = (id: string) => centros.find(c => c.id === id)

  const selectedLevels = [sel1, sel2, sel3].filter(Boolean)
  const breadcrumb = selectedLevels.map(id => {
    const c = getInfo(id)
    return c ? { label: `[${c.codigo}] ${c.nombre}`, nivel: c.nivel } : null
  }).filter(Boolean) as { label: string; nivel: number }[]

  const finalNivel = sel3 ? 3 : sel2 ? 2 : sel1 ? 1 : 0

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="input-group" style={{ margin: 0, ...(style ?? {}) }}>
        {!hideLabel && <label style={{ fontSize: '0.82rem' }}>{label}</label>}
        <div
          className="input"
          style={{ display: 'flex', alignItems: 'center', gap: 8,
                   color: 'var(--text-muted)', fontSize: '0.82rem', cursor: 'default' }}
        >
          <span className="spinner" style={{ width: 12, height: 12 }} />
          Cargando centros de costo...
        </div>
      </div>
    )
  }

  if (centros.length === 0) {
    return (
      <div className="input-group" style={{ margin: 0, ...(style ?? {}) }}>
        {!hideLabel && <label style={{ fontSize: '0.82rem' }}>{label}</label>}
        <div className="input" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          color: 'var(--text-muted)', fontSize: '0.82rem', cursor: 'default',
          fontStyle: 'italic',
        }}>
          Sin centros de costo configurados
        </div>
      </div>
    )
  }

  return (
    <div style={{ margin: 0, ...(style ?? {}) }}>
      {/* Label */}
      {!hideLabel && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 6,
        }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {label}
            {required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
          </label>
          {value && (
            <button
              type="button"
              onClick={clearLevel1}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: '0.7rem', color: 'var(--text-muted)',
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '2px 6px', borderRadius: 4,
                transition: 'color 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <X size={11} /> Limpiar todo
            </button>
          )}
        </div>
      )}

      {/* Cascada de selects */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        padding: '10px 12px',
        background: 'var(--bg-surface)',
        border: `1px solid ${finalNivel > 0
          ? `color-mix(in srgb, ${NIVEL_COLOR[finalNivel]} 35%, var(--border))`
          : 'var(--border)'}`,
        borderRadius: 'var(--radius)',
        transition: 'border-color 0.2s',
      }}>

        {/* Nivel 1 — siempre visible */}
        <LevelSelect
          nivel={1}
          items={nivel1Items}
          value={sel1}
          centros={centros}
          onChange={handleSel1}
          onClear={clearLevel1}
          required={required}
          isFirst={true}
        />

        {/* Nivel 2 — aparece si el Nivel 1 tiene hijos */}
        {showLevel2 && (
          <LevelSelect
            nivel={2}
            items={nivel2Items}
            value={sel2}
            centros={centros}
            onChange={handleSel2}
            onClear={clearLevel2}
            required={false}
            isFirst={false}
          />
        )}

        {/* Nivel 3 — aparece si el Nivel 2 tiene hijos */}
        {showLevel3 && (
          <LevelSelect
            nivel={3}
            items={nivel3Items}
            value={sel3}
            centros={centros}
            onChange={handleSel3}
            onClear={clearLevel3}
            required={false}
            isFirst={false}
          />
        )}

        {/* Breadcrumb del path seleccionado */}
        {breadcrumb.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            paddingTop: 6,
            borderTop: '1px solid var(--border)',
            fontSize: '0.72rem',
            flexWrap: 'wrap',
          }}>
            <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>Seleccionado:</span>
            {breadcrumb.map((seg, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                {i > 0 && (
                  <ChevronRight size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                )}
                <span style={{
                  color: NIVEL_COLOR[seg.nivel] ?? 'var(--text-primary)',
                  fontWeight: i === breadcrumb.length - 1 ? 700 : 500,
                  background: i === breadcrumb.length - 1
                    ? `color-mix(in srgb, ${NIVEL_COLOR[seg.nivel]} 10%, transparent)`
                    : 'transparent',
                  borderRadius: 4,
                  padding: i === breadcrumb.length - 1 ? '1px 6px' : '0',
                }}>
                  {seg.label}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
