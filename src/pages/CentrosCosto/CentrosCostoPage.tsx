import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Pencil, Power, Search, Loader2, Save, X,
  AlertCircle, Grid3X3, Building2, ChevronRight, ChevronDown,
  Layers, FolderTree,
} from 'lucide-react'
import {
  centrosCostoService,
  type CentroCosto,
  type CentrosCostoPayload,
} from '@/services/inventario.service'
import { invalidateCentrosCostoCache } from '@/components/CentroCostoSelect'
import { api } from '@/lib/api'
import { getAxiosErrorData } from '@/lib/errors'
import { getTenantId } from '@/services/auth.service'

interface Sucursal { id: string; nombre: string }

interface FormState {
  codigo:      string
  nombre:      string
  sucursal_id: string
  parent_id:   string
  activo:      boolean
}

interface TreeNode extends CentroCosto {
  _children: TreeNode[]
}

interface Props { embedded?: boolean }

const empty = (): FormState => ({
  codigo: '', nombre: '', sucursal_id: '', parent_id: '', activo: true,
})

// ── Helpers árbol ──────────────────────────────────────────────────────────

function buildTree(items: CentroCosto[]): TreeNode[] {
  const map = new Map<string, TreeNode>()
  items.forEach(i => map.set(i.id, { ...i, _children: [] }))

  const roots: TreeNode[] = []
  map.forEach(node => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!._children.push(node)
    } else {
      roots.push(node)
    }
  })

  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.codigo.localeCompare(b.codigo))
    nodes.forEach(n => sort(n._children))
  }
  sort(roots)
  return roots
}

// ── Niveles ────────────────────────────────────────────────────────────────

const NIVEL_LABEL: Record<number, string>  = { 1: 'Centro raíz', 2: 'Subcentro', 3: 'Sub-subcentro' }
const NIVEL_COLOR: Record<number, string>  = { 1: 'var(--accent)', 2: '#10b981', 3: '#f59e0b' }

// ── Componente ────────────────────────────────────────────────────────────

export default function CentrosCostoPage({ embedded }: Props) {
  const [centros, setCentros]       = useState<CentroCosto[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [search, setSearch]         = useState('')
  const [showModal, setShowModal]   = useState(false)
  const [editId, setEditId]         = useState<string | null>(null)
  const [form, setForm]             = useState<FormState>(empty())
  const [error, setError]           = useState('')
  const [expanded, setExpanded]     = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [cc, suc] = await Promise.all([
        centrosCostoService.getAll(),
        api.get(`/${getTenantId()}/sucursales`).then(r => r.data.data ?? []),
      ])
      setCentros(cc)
      setSucursales(suc)
      // Auto-expandir todo al cargar
      setExpanded(new Set(cc.filter(c => c.nivel < 3).map(c => c.id)))
    } catch {
      setError('Error cargando datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Modal handlers ────────────────────────────────────────────────────────

  const openCreate = (parentId = '') => {
    setEditId(null)
    setForm({ ...empty(), parent_id: parentId })
    setError('')
    setShowModal(true)
  }

  const openEdit = (c: CentroCosto) => {
    setEditId(c.id)
    setForm({
      codigo:      c.codigo,
      nombre:      c.nombre,
      sucursal_id: (c as any).sucursal_id ?? '',
      parent_id:   c.parent_id ?? '',
      activo:      c.activo,
    })
    setError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    setError('')
    if (!form.codigo.trim()) return setError('El código es obligatorio.')
    if (!form.nombre.trim()) return setError('El nombre es obligatorio.')

    setSaving(true)
    try {
      const payload: CentrosCostoPayload = {
        codigo:      form.codigo.toUpperCase().trim(),
        nombre:      form.nombre.trim(),
        sucursal_id: form.sucursal_id || undefined,
        parent_id:   form.parent_id   || null,
        activo:      form.activo,
      }

      if (editId) {
        await centrosCostoService.update(editId, payload)
      } else {
        await centrosCostoService.create(payload)
      }

      invalidateCentrosCostoCache()   // limpia caché del selector
      setShowModal(false)
      await load()
    } catch (err) {
      const resp = getAxiosErrorData(err)?.data
      if (resp?.errors && typeof resp.errors === 'object') {
        // Errores de validación de Laravel — mostrar cada campo
        const msgs = Object.values(resp.errors as Record<string, string[]>).flat()
        setError(msgs.join(' • '))
      } else {
        setError(resp?.message ?? 'Error al guardar')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (c: CentroCosto) => {
    try {
      if (c.activo) {
        await centrosCostoService.destroy(c.id)
      } else {
        await centrosCostoService.update(c.id, { activo: true })
      }
      invalidateCentrosCostoCache()
      await load()
    } catch (err) {
      const resp = getAxiosErrorData(err)?.data
      if (resp?.errors && typeof resp.errors === 'object') {
        const msgs = Object.values(resp.errors as Record<string, string[]>).flat()
        setError(msgs.join(' • '))
      } else {
        setError(resp?.message ?? 'Error al cambiar el estado')
      }
    }
  }

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // ── Filtro de búsqueda ────────────────────────────────────────────────────

  const q = search.toLowerCase()
  const matchIds = new Set(
    centros
      .filter(c => c.codigo.toLowerCase().includes(q) || c.nombre.toLowerCase().includes(q))
      .map(c => c.id)
  )

  // Incluir ancestors de los matches para mantener coherencia del árbol
  const visibleIds = new Set(matchIds)
  if (search) {
    centros.forEach(c => {
      if (matchIds.has(c.id) && c.parent_id) visibleIds.add(c.parent_id)
    })
    centros.forEach(c => {
      if (visibleIds.has(c.id) && c.parent_id) visibleIds.add(c.parent_id)
    })
  }

  const filteredCentros = search
    ? centros.filter(c => visibleIds.has(c.id))
    : centros

  const tree = buildTree(filteredCentros)

  // ── KPIs ──────────────────────────────────────────────────────────────────

  const raices   = centros.filter(c => c.nivel === 1).length
  const activos  = centros.filter(c => c.activo).length
  const total    = centros.length

  // ── Render árbol ──────────────────────────────────────────────────────────

  const renderNode = (node: TreeNode, depth = 0): React.ReactNode => {
    const hasChildren = node._children.length > 0
    const isExpanded  = expanded.has(node.id)
    const canAddChild = node.nivel < 3

    const indentPx = depth * 28

    return (
      <div key={node.id}>
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 18px',
            paddingLeft: 18 + indentPx,
            borderBottom: '1px solid var(--border)',
            opacity: node.activo ? 1 : 0.45,
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
          onMouseLeave={e => (e.currentTarget.style.background = '')}
        >
          {/* Expand / collapse */}
          <button
            type="button"
            onClick={() => hasChildren && toggleExpand(node.id)}
            style={{
              width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: 'none', cursor: hasChildren ? 'pointer' : 'default',
              color: 'var(--text-muted)', flexShrink: 0, borderRadius: 4,
              opacity: hasChildren ? 1 : 0,
            }}
          >
            {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>

          {/* Ícono nivel */}
          {node.nivel === 1
            ? <FolderTree size={15} style={{ color: NIVEL_COLOR[1], flexShrink: 0 }} />
            : <Layers    size={13} style={{ color: NIVEL_COLOR[node.nivel] ?? '#a78bfa', flexShrink: 0 }} />
          }

          {/* Código */}
          <span style={{
            fontFamily: 'monospace', fontWeight: 700, fontSize: '0.82rem',
            background: node.activo ? `color-mix(in srgb, ${NIVEL_COLOR[node.nivel] ?? '#a78bfa'} 12%, transparent)` : 'var(--bg-surface)',
            color: NIVEL_COLOR[node.nivel] ?? '#a78bfa',
            border: `1px solid color-mix(in srgb, ${NIVEL_COLOR[node.nivel] ?? '#a78bfa'} 30%, transparent)`,
            borderRadius: 6, padding: '1px 8px',
            flexShrink: 0,
          }}>
            {node.codigo}
          </span>

          {/* Nombre */}
          <span style={{ fontWeight: node.nivel === 1 ? 700 : 500, fontSize: '0.88rem', flex: 1 }}>
            {node.nombre}
          </span>

          {/* Nivel badge */}
          <span style={{
            fontSize: '0.68rem', fontWeight: 600, padding: '2px 8px',
            borderRadius: 20, background: 'var(--bg-surface)',
            color: 'var(--text-muted)', border: '1px solid var(--border)',
            flexShrink: 0,
          }}>
            {NIVEL_LABEL[node.nivel] ?? 'Nivel ' + node.nivel}
          </span>

          {/* Sucursal */}
          {(node as any).sucursal?.nombre && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0,
            }}>
              <Building2 size={11} /> {(node as any).sucursal.nombre}
            </span>
          )}

          {/* Hijos count */}
          {hasChildren && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>
              {node._children.length} sub{node._children.length > 1 ? 'centros' : 'centro'}
            </span>
          )}

          {/* Estado */}
          <span className={`badge ${node.activo ? 'badge-success' : 'badge-secondary'}`} style={{ flexShrink: 0 }}>
            {node.activo ? 'Activo' : 'Inactivo'}
          </span>

          {/* Acciones */}
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            {canAddChild && node.activo && (
              <button
                type="button"
                onClick={() => openCreate(node.id)}
                className="btn btn-secondary btn-sm"
                title={`Agregar subcentro de "${node.nombre}"`}
                style={{ fontSize: '0.7rem', padding: '3px 8px', gap: 4 }}
              >
                <Plus size={11} /> Subcentro
              </button>
            )}
            <button onClick={() => openEdit(node)} className="btn-icon" title="Editar">
              <Pencil size={14} />
            </button>
            <button
              onClick={() => handleToggle(node)}
              className="btn-icon"
              style={{ color: node.activo ? '#ef4444' : '#10b981' }}
              title={node.activo ? 'Desactivar' : 'Activar'}
            >
              <Power size={14} />
            </button>
          </div>
        </div>

        {/* Hijos (si expandido) */}
        {hasChildren && isExpanded && (
          <div style={{
            borderLeft: `2px solid color-mix(in srgb, ${NIVEL_COLOR[node.nivel]} 25%, transparent)`,
            marginLeft: 18 + indentPx + 10,
          }}>
            {node._children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <div className={embedded ? '' : 'page-container'}>

      {/* Header */}
      <div className={embedded ? 'flex items-start justify-between mb-6' : 'page-header'}>
        <div>
          {!embedded && (
            <h1 className="page-title flex items-center gap-3">
              <Grid3X3 size={26} className="text-accent" />
              Centros de Costo
            </h1>
          )}
          <p className={embedded ? 'text-sm text-muted' : 'page-subtitle'}>
            Organiza tus operaciones en centros y subcentros para reportes de P&L segmentados.
          </p>
        </div>
        <button onClick={() => openCreate()} className="btn btn-primary">
          <Plus size={18} /> Nuevo Centro
        </button>
      </div>

      {error && !showModal && (
        <div className="alert alert-error mb-4" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Centros raíz',      value: raices,  color: NIVEL_COLOR[1] },
          { label: 'Total (todos niveles)', value: total, color: 'var(--text-primary)' },
          { label: 'Activos',            value: activos, color: '#10b981' },
        ].map(k => (
          <div key={k.label} className="card" style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontWeight: 800, fontSize: '1.5rem', color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Barra búsqueda */}
      <div className="card mb-4" style={{ padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 380 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" style={{ paddingLeft: 34 }}
            placeholder="Buscar por código o nombre..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {tree.length > 0 && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="btn btn-secondary btn-sm"
              onClick={() => setExpanded(new Set(centros.map(c => c.id)))}>
              Expandir todo
            </button>
            <button type="button" className="btn btn-secondary btn-sm"
              onClick={() => setExpanded(new Set())}>
              Colapsar
            </button>
          </div>
        )}
      </div>

      {/* Árbol */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 48, color: 'var(--text-muted)' }}>
            <Loader2 size={20} className="animate-spin" /> Cargando...
          </div>
        ) : tree.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            <Grid3X3 size={32} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
            <div style={{ marginBottom: 12 }}>
              {search ? 'Sin resultados para la búsqueda.' : 'No hay centros de costo creados aún.'}
            </div>
            {!search && (
              <button onClick={() => openCreate()} className="btn btn-primary" style={{ fontSize: '0.82rem' }}>
                <Plus size={14} /> Crear primer centro
              </button>
            )}
          </div>
        ) : (
          <div>
            {/* Encabezados */}
            <div style={{
              display: 'flex', gap: 8, padding: '10px 18px',
              borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)',
              fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              <span style={{ width: 20 }} />
              <span style={{ width: 15 }} />
              <span style={{ width: 90 }}>Código</span>
              <span style={{ flex: 1 }}>Nombre</span>
              <span>Nivel</span>
            </div>
            {tree.map(node => renderNode(node))}
          </div>
        )}
      </div>

      {/* Leyenda de niveles */}
      <div style={{
        marginTop: 16, padding: '12px 16px',
        background: 'color-mix(in srgb, var(--accent) 5%, transparent)',
        border: '1px solid color-mix(in srgb, var(--accent) 18%, transparent)',
        borderRadius: 'var(--radius-lg)', fontSize: '0.78rem', color: 'var(--text-muted)',
        display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center',
      }}>
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>💡 Jerarquía (máx. 3 niveles):</span>
        {[1, 2, 3].map(n => (
          <span key={n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              background: NIVEL_COLOR[n], flexShrink: 0,
            }} />
            <strong style={{ color: NIVEL_COLOR[n] }}>{NIVEL_LABEL[n]}</strong>
          </span>
        ))}
        <span style={{ marginLeft: 'auto', opacity: 0.7 }}>
          Los documentos pueden asignarse a cualquier nivel. Los reportes agrupan subcentros en su centro raíz.
        </span>
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2 className="page-title" style={{ fontSize: '1.05rem' }}>
                {editId ? 'Editar Centro de Costo' : (
                  form.parent_id
                    ? `Nuevo Subcentro de "${centros.find(c => c.id === form.parent_id)?.nombre ?? ''}"`
                    : 'Nuevo Centro de Costo'
                )}
              </h2>
              <button onClick={() => setShowModal(false)} className="btn-icon"><X size={18} /></button>
            </div>

            {error && (
              <div className="alert alert-error mb-4" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Centro padre */}
              <div className="input-group" style={{ margin: 0 }}>
                <label>Centro Padre <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcional — dejar vacío para crear raíz)</span></label>
                <select className="input" value={form.parent_id}
                  onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))}>
                  <option value="">— Raíz (sin padre) —</option>
                  {/* Solo mostrar centros que pueden ser padre (nivel 1 o 2) */}
                  {centros
                    .filter(c => c.activo && c.nivel < 3 && c.id !== editId)
                    .sort((a, b) => a.nivel - b.nivel || a.codigo.localeCompare(b.codigo))
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {'  '.repeat(c.nivel - 1)}{c.nivel > 1 ? '└─ ' : ''}[{c.codigo}] {c.nombre}
                      </option>
                    ))
                  }
                </select>
                {form.parent_id && (
                  <span style={{
                    fontSize: '0.72rem', marginTop: 4,
                    color: NIVEL_COLOR[Math.min(3, (centros.find(c => c.id === form.parent_id)?.nivel ?? 0) + 1)],
                    fontWeight: 600,
                  }}>
                    → Se creará como {NIVEL_LABEL[Math.min(3, (centros.find(c => c.id === form.parent_id)?.nivel ?? 0) + 1)]}
                  </span>
                )}
              </div>

              {/* Código + Nombre */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                <div className="input-group" style={{ margin: 0 }}>
                  <label>Código *</label>
                  <input className="input" placeholder="VEN-NORTE" maxLength={20}
                    value={form.codigo}
                    onChange={e => setForm(f => ({ ...f, codigo: e.target.value.toUpperCase() }))} />
                </div>
                <div className="input-group" style={{ margin: 0 }}>
                  <label>Nombre *</label>
                  <input className="input" placeholder="Ventas — Región Norte" maxLength={100}
                    value={form.nombre}
                    onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
                </div>
              </div>

              {/* Sucursal */}
              <div className="input-group" style={{ margin: 0 }}>
                <label>Sucursal asociada <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcional)</span></label>
                <select className="input" value={form.sucursal_id}
                  onChange={e => setForm(f => ({ ...f, sucursal_id: e.target.value }))}>
                  <option value="">— Global (todas las sucursales) —</option>
                  {sucursales.map(s => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Activo (solo al editar) */}
              {editId && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none', fontSize: '0.88rem' }}>
                  <input type="checkbox" checked={form.activo}
                    onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} />
                  <span>Centro de costo <strong>{form.activo ? 'activo' : 'inactivo'}</strong></span>
                </label>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary">Cancelar</button>
              <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {saving ? 'Guardando...' : (editId ? 'Guardar Cambios' : 'Crear')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
