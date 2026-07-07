import { useState, useEffect } from 'react'
import { pucService, type CuentaContable, type CreateAuxiliarPayload } from '@/services/puc.service'
import { getAxiosErrorData } from '@/lib/errors'
import { Folder, FolderOpen, FileText, Plus, Search, Layers, Pencil, X } from 'lucide-react'

export default function PucPage() {
  const [cuentas, setCuentas] = useState<CuentaContable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [hideInactive, setHideInactive] = useState(false)
  
  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingCuenta, setEditingCuenta] = useState<CuentaContable | null>(null)
  const [parentCuenta, setParentCuenta] = useState<CuentaContable | null>(null)
  const [form, setForm] = useState<Partial<CreateAuxiliarPayload & { activo: boolean }>>({
    codigo: '', nombre: '', acepta_movimientos: true, exige_tercero: false, exige_centro_costo: false, exige_base_impuesto: false, activo: true
  })
  const [submitting, setSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({})

  const fetchPuc = async () => {
    try {
      setLoading(true)
      const res = await pucService.getTree()
      const data = res.data || []
      setCuentas(data)
      
      // Expand level 1 (clases) by default if it's the first load
      if (expanded.size === 0) {
        const defaultExpanded = new Set<string>()
        data.forEach(c => defaultExpanded.add(c.id))
        setExpanded(defaultExpanded)
      }
    } catch (err) {
      setError('Error al cargar el Plan de Cuentas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPuc()
  }, [])

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleOpenCreate = (parent?: CuentaContable) => {
    setValidationErrors({})
    if (parent) {
      setParentCuenta(parent)
      setForm({
        parent_id: parent.id,
        codigo: parent.codigo, // Sugerir el prefijo del padre
        nombre: '',
        acepta_movimientos: parent.nivel === 'subcuenta', // Sugerir según nivel
        exige_tercero: false,
        exige_centro_costo: false,
        exige_base_impuesto: false
      })
    } else {
      // Nueva Clase (Nivel 1)
      setParentCuenta(null)
      setForm({
        parent_id: null,
        codigo: '',
        nombre: '',
        naturaleza: 'debito',
        acepta_movimientos: false,
        exige_tercero: false,
        exige_centro_costo: false,
        exige_base_impuesto: false
      })
    }
    setEditingCuenta(null)
    setShowModal(true)
  }

  const handleOpenEdit = (cuenta: CuentaContable) => {
    setValidationErrors({})
    setEditingCuenta(cuenta)
    setParentCuenta(null)
    setForm({
      codigo: cuenta.codigo,
      nombre: cuenta.nombre,
      naturaleza: cuenta.naturaleza,
      acepta_movimientos: cuenta.acepta_movimientos,
      exige_tercero: cuenta.exige_tercero,
      exige_centro_costo: cuenta.exige_centro_costo,
      exige_base_impuesto: cuenta.exige_base_impuesto,
      activo: cuenta.activo
    })
    setShowModal(true)
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setValidationErrors({})
    try {
      if (editingCuenta) {
        await pucService.update(editingCuenta.id, form as any)
      } else {
        await pucService.createAuxiliar(form as CreateAuxiliarPayload)
      }
      setShowModal(false)
      fetchPuc()
    } catch (err) {
      const resp = getAxiosErrorData(err)
      if (resp?.status === 422) {
        setValidationErrors((resp.data?.errors as Record<string, string[]>) || {})
      } else {
        alert(resp?.data?.message || 'Error al procesar la solicitud')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const renderTree = (nodes: CuentaContable[], level = 0) => {
    return nodes.map(node => {
      // Si el valor no es explícitamente true o 1, lo tratamos como inactivo para el filtro
      const isActuallyActive = Boolean(node.activo);
      const isActuallyInactive = !isActuallyActive;

      // Si el usuario pidió ocultar inactivas y esta lo es, no la dibujamos
      if (hideInactive && isActuallyInactive) return null

      const isExpanded = expanded.has(node.id)
      const hasChildren = node.children && node.children.length > 0
      
      // Basic search filter (local)
      if (search && !node.codigo.includes(search) && !node.nombre.toLowerCase().includes(search.toLowerCase()) && !hasChildren) {
        return null
      }

      return (
        <div key={node.id}>
          <div 
            className={`puc-row ${isExpanded && level === 0 ? 'active' : ''} ${isActuallyInactive ? 'inactive-row' : ''}`}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              padding: '10px 16px',
              paddingLeft: `${16 + (level * 24)}px`,
              borderBottom: '1px solid var(--border)',
              transition: 'background 0.2s',
              backgroundColor: isExpanded && level === 0 ? 'rgba(var(--primary-rgb), 0.05)' : 'transparent',
              opacity: isActuallyInactive ? 0.5 : 1
            }}
          >
            <div 
              style={{ width: '24px', display: 'flex', alignItems: 'center', cursor: hasChildren ? 'pointer' : 'default', color: 'var(--text-secondary)' }}
              onClick={() => hasChildren && toggleExpand(node.id)}
            >
              {hasChildren ? (
                isExpanded ? <FolderOpen size={16} color="var(--primary)" /> : <Folder size={16} />
              ) : (
                <FileText size={16} />
              )}
            </div>
            
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ 
                fontFamily: "'JetBrains Mono', monospace", 
                fontWeight: level < 2 ? 700 : 500,
                color: level === 0 ? 'var(--primary)' : 'inherit',
                fontSize: '0.9rem'
              }}>
                {node.codigo}
              </span>
              <span style={{ fontWeight: level === 0 ? 600 : 400, fontSize: '0.95rem' }}>
                {node.nombre}
              </span>
              
              <div style={{ display: 'flex', gap: '4px' }}>
                {node.acepta_movimientos && (
                  <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>Mov</span>
                )}
                {node.exige_tercero && (
                  <span className="badge badge-info" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>Tercero</span>
                )}
                {isActuallyInactive && (
                  <span className="badge badge-error" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>Inactivo</span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                {node.nivel}
              </div>

              <div className="puc-actions" style={{ display: 'flex', gap: '4px' }}>
                <button 
                  className="btn-icon" 
                  title="Añadir sub-cuenta o auxiliar"
                  onClick={() => handleOpenCreate(node)}
                >
                  <Plus size={14} />
                </button>
                <button 
                  className="btn-icon" 
                  title="Editar cuenta"
                  onClick={() => handleOpenEdit(node)}
                >
                  <Pencil size={14} />
                </button>

              </div>
            </div>
          </div>
          
          {isExpanded && hasChildren && (
            <div className="puc-children">
              {renderTree(node.children!, level + 1)}
            </div>
          )}
        </div>
      )
    })
  }

  return (
    <div className="page-container">
      {/* Modal de Creación/Edición */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>{editingCuenta ? 'Editar Cuenta' : (parentCuenta ? `Nueva Cuenta bajo ${parentCuenta.codigo}` : 'Nueva Clase Principal')}</h3>
              <button className="btn-close" onClick={() => setShowModal(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ padding: '20px' }}>
                <div className="grid-cols-2" style={{ gap: '16px' }}>
                  <div className="input-group">
                    <label>Código</label>
                    <input 
                      className={`input ${validationErrors.codigo ? 'input-error' : ''}`} 
                      value={form.codigo} 
                      onChange={e => setForm({...form, codigo: e.target.value})} 
                      required 
                      disabled={!!editingCuenta}
                      placeholder="Ej: 11050501"
                    />
                    {validationErrors.codigo && <span className="error-text">{validationErrors.codigo[0]}</span>}
                  </div>
                  <div className="input-group">
                    <label>Nombre de la Cuenta</label>
                    <input 
                      className={`input ${validationErrors.nombre ? 'input-error' : ''}`} 
                      value={form.nombre} 
                      onChange={e => setForm({...form, nombre: e.target.value})} 
                      required 
                      placeholder="Ej: Caja General Auxiliar"
                    />
                    {validationErrors.nombre && <span className="error-text">{validationErrors.nombre[0]}</span>}
                  </div>
                </div>

                {!form.parent_id && !editingCuenta && (
                  <div className="input-group" style={{ marginTop: '16px' }}>
                    <label>Naturaleza</label>
                    <select 
                      className={`input ${validationErrors.naturaleza ? 'input-error' : ''}`} 
                      value={form.naturaleza} 
                      onChange={e => setForm({...form, naturaleza: e.target.value as any})}
                    >
                      <option value="debito">Débito</option>
                      <option value="credito">Crédito</option>
                    </select>
                    {validationErrors.naturaleza && <span className="error-text">{validationErrors.naturaleza[0]}</span>}
                  </div>
                )}

                <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.acepta_movimientos} onChange={e => setForm({...form, acepta_movimientos: e.target.checked})} />
                    <span style={{ fontSize: '0.9rem' }}>Acepta Movimientos</span>
                  </label>
                  <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.exige_tercero} onChange={e => setForm({...form, exige_tercero: e.target.checked})} />
                    <span style={{ fontSize: '0.9rem' }}>Exige Tercero</span>
                  </label>
                  <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.exige_centro_costo} onChange={e => setForm({...form, exige_centro_costo: e.target.checked})} />
                    <span style={{ fontSize: '0.9rem' }}>Exige Centro Costo</span>
                  </label>
                  <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.exige_base_impuesto} onChange={e => setForm({...form, exige_base_impuesto: e.target.checked})} />
                    <span style={{ fontSize: '0.9rem' }}>Exige Base Impuesto</span>
                  </label>
                  {editingCuenta && (
                    <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.activo} onChange={e => setForm({...form, activo: e.target.checked})} />
                      <span style={{ fontSize: '0.9rem' }}>Cuenta Activa</span>
                    </label>
                  )}
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : (editingCuenta ? 'Actualizar' : 'Crear Cuenta')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Layers color="var(--primary)" /> Plan Único de Cuentas (PUC)
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Gestiona y personaliza el catálogo de cuentas de tu empresa.</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenCreate()}>
          <Plus size={18} /> Nueva Clase Principal
        </button>
      </div>

      <div className="card" style={{ padding: '20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="input-group" style={{ maxWidth: '450px', margin: 0 }}>
          <div className="input-icon-wrapper">
            <Search size={18} className="input-icon" color="var(--text-secondary)" />
            <input 
              type="text" 
              className="input input-with-icon" 
              placeholder="Buscar por código o nombre..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '42px' }}
            />
          </div>
        </div>

        <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <input 
            type="checkbox" 
            checked={hideInactive} 
            onChange={e => setHideInactive(e.target.checked)} 
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Ocultar cuentas inactivas</span>
        </label>
      </div>

      {error && <div className="alert alert-error mb-4">{error}</div>}

      <div className="card" style={{ padding: 0, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
        {loading ? (
          <div style={{ padding: '64px', textAlign: 'center' }}>
            <span className="spinner" style={{ width: '32px', height: '32px' }} />
            <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Cargando catálogo contable...</p>
          </div>
        ) : (
          <div className="puc-tree" style={{ padding: '8px 0' }}>
            {renderTree(cuentas)}
          </div>
        )}
      </div>
    </div>
  )
}
