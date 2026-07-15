import CentroCostoSelect from '@/components/CentroCostoSelect'
import TerceroAutocomplete from '@/components/TerceroAutocomplete'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Plus, Trash2, Loader2, Save, Scissors, AlertCircle, Search } from 'lucide-react'
import { facturasService } from '@/services/facturas.service'
import { tipoComprobantesService, type TipoComprobante } from '@/services/tipoComprobantes.service'
import { tercerosService, type Tercero } from '@/services/terceros.service'
import { api } from '@/lib/api'
import { extractApiError } from '@/lib/errors'
import { getTenantId } from '@/services/auth.service'
import { paymentConfigurationService, type PaymentTerm, type PaymentMethod } from '@/services/paymentConfiguration.service'
import ProductoModal from '@/pages/Inventario/ProductoModal'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface ItemLine {
  nombre: string
  descripcion: string
  cantidad: number
  precio: number
  descuento: number
  tax_rate: number
  codigo?: string
}

interface WithholdingTax { code: string; rate: number }

const TAX_RATES = [
  { value: 19, label: 'IVA 19%' },
  { value: 5,  label: 'IVA 5%' },
  { value: 0,  label: 'Exento (0%)' },
]
const WITHHOLDING_TYPES = [
  { code: '05', label: 'Retefuente' },
  { code: '06', label: 'ReteIVA' },
  { code: '07', label: 'ReteICA' },
]

const emptyItem = (): ItemLine => ({ nombre: '', descripcion: '', cantidad: 1, precio: 0, descuento: 0, tax_rate: 19 })
const today    = () => new Date().toISOString().split('T')[0]
const tomorrow = () => {
  const d = new Date(); d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

const dueDateFor = (date: string, days: number) => { const value = new Date(`${date}T00:00:00`); value.setDate(value.getDate() + days); return value.toISOString().split("T")[0] }

// ─── Buscador de producto por línea ─────────────────────────────────────────
function ProductoSearchInput({
  productos, item, onSelect, onProductoCreated,
}: {
  productos: any[]
  item: ItemLine
  onSelect: (prod: any) => void
  onProductoCreated: (prod: any) => void
}) {
  const [search, setSearch] = useState(item.nombre || '')
  const [open, setOpen] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Sincroniza el texto cuando cambia el ítem desde afuera
  useEffect(() => { setSearch(item.nombre || '') }, [item.nombre])

  // Cierra al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = productos.filter(p => {
    if (!search) return true
    const q = search.toLowerCase()
    return p.nombre.toLowerCase().includes(q) || (p.codigo || '').toLowerCase().includes(q)
  }).slice(0, 12)

  const handleSelect = (prod: any) => {
    onSelect(prod)
    setSearch(prod.nombre)
    setOpen(false)
  }

  const handleCreated = (prod: any) => {
    onProductoCreated(prod)
    handleSelect(prod)
    setShowCreate(false)
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {/* Input búsqueda */}
      <div style={{ position: 'relative' }}>
        <Search size={13} style={{
          position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--text-muted)', pointerEvents: 'none',
        }} />
        <input
          className="input"
          style={{ fontSize: '0.82rem', padding: '6px 8px 6px 28px' }}
          placeholder="Buscar producto..."
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          zIndex: 9999, maxHeight: 260, overflowY: 'auto', minWidth: 320,
        }}>
          {/* Encabezado */}
          <div style={{
            display: 'grid', gridTemplateColumns: '80px 1fr 60px',
            padding: '6px 12px', gap: 8,
            fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.05em',
            borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)',
          }}>
            <span>Código</span><span>Descripción</span><span>Estado</span>
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Sin resultados{search ? ` para "${search}"` : ''}
            </div>
          ) : filtered.map(p => (
            <button
              key={p.id} type="button"
              onClick={() => handleSelect(p)}
              style={{
                width: '100%', display: 'grid', gridTemplateColumns: '80px 1fr 60px',
                padding: '9px 12px', gap: 8, border: 'none', background: 'none',
                cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent-light)' }}>{p.codigo}</span>
              <span style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nombre}</span>
              <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>Activo</span>
            </button>
          ))}

          {/* Crear nuevo */}
          <button
            type="button"
            onClick={() => { setOpen(false); setShowCreate(true) }}
            style={{
              width: '100%', padding: '10px 12px', border: 'none',
              borderTop: '1px solid var(--border)',
              background: 'rgba(99,102,241,0.08)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              color: 'var(--accent)', fontWeight: 600, fontSize: '0.82rem',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.15)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.08)')}
          >
            <Plus size={14} /> Crear nuevo producto / servicio
          </button>
        </div>
      )}

      <ProductoModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => {}}
        onCreated={handleCreated}
        overlayZIndex={1200}
      />
    </div>
  )
}

// ─── Modal principal ─────────────────────────────────────────────────────────
export default function NuevaFacturaModal({ isOpen, onClose, onSuccess }: Props) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [fetchingData, setFetchingData] = useState(false)
  const [comprobantes, setComprobantes] = useState<TipoComprobante[]>([])
  // Terceros se cargan dentro del TerceroAutocomplete (cache compartido).
  // Solo mantenemos un setter dummy para no romper el loadCatalogs existente.
  const [, setTerceros] = useState<Tercero[]>([])
  const [productos, setProductos] = useState<any[]>([])
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]); const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    tipo_comprobante_id: '',
    centro_costo_id: '',
    fecha_emision: today(),
    tercero_id: '',
    payment_form: '1',
    payment_method_code: '10',
    payment_term_id: "", payment_method_id: "",
    payment_due_date: '',
    observaciones: '',
  })
  const [items, setItems] = useState<ItemLine[]>([emptyItem()])
  const [withholdings, setWithholdings] = useState<WithholdingTax[]>([])

  useEffect(() => {
    if (isOpen) {
      setForm(prev => ({ ...prev, fecha_emision: today() }))
      setItems([emptyItem()])
      setWithholdings([])
      setError('')
      loadData()
    }
  }, [isOpen])

  const loadData = async () => {
    try {
      setFetchingData(true)
      const [compsRes, tercerosRes, productosRes, termsRes, methodsRes] = await Promise.all([
        tipoComprobantesService.getAll(),
        tercerosService.getAll(),
        api.get(`/${getTenantId()}/productos`),
        paymentConfigurationService.terms(false),        paymentConfigurationService.methods(false),
      ])
      const activos = compsRes.filter(c => c.activo)
      setComprobantes(activos)
      setTerceros(tercerosRes.data || [])
      setProductos(productosRes.data.data || [])
      const salesTerms = termsRes.filter(term => term.applies_to_sales); const salesMethods = methodsRes.filter(method => method.allows_sales && method.dian_code); setPaymentTerms(salesTerms); setPaymentMethods(salesMethods); const contado = salesTerms.find(term => term.code === 'CONTADO'); const efectivo = salesMethods.find(method => method.code === 'EFECTIVO'); setForm(prev => ({ ...prev, payment_term_id: contado?.id ?? '', payment_method_id: efectivo?.id ?? '', payment_form: '1', payment_method_code: efectivo?.dian_code ?? '10' }))
      if (activos.length > 0) {
        const fv = activos.find(c => c.tipo_documento === 'FV') || activos[0]
        setForm(prev => ({ ...prev, tipo_comprobante_id: fv.id, observaciones: fv.observaciones_default || '' }))
      }
    } catch {
      setError('Error al cargar datos iniciales.')
    } finally {
      setFetchingData(false)
    }
  }

  const set = (patch: Partial<typeof form>) => setForm(prev => ({ ...prev, ...patch }))
  const selectedPaymentTerm = paymentTerms.find(term => term.id === form.payment_term_id); const allowedPaymentMethods = selectedPaymentTerm?.methods?.length ? paymentMethods.filter(method => selectedPaymentTerm.methods?.some(allowed => allowed.id === method.id)) : paymentMethods
  const selectedComprobante = comprobantes.find(c => c.id === form.tipo_comprobante_id)

  const onSelectComprobante = (id: string) => {
    const comp = comprobantes.find(c => c.id === id)
    set({ tipo_comprobante_id: id, observaciones: comp?.observaciones_default || '' })
  }

  const onSelectProducto = (index: number, prod: any) => {
    const newItems = [...items]
    // Solo auto-completar la descripción si el usuario aún no escribió una propia
    // (evita sobrescribir notas manuales del auxiliar contable).
    const descripcionActual = newItems[index].descripcion?.trim()
    newItems[index] = {
      ...newItems[index],
      nombre:      prod.nombre,
      descripcion: descripcionActual || prod.descripcion || prod.nombre,
      precio:      parseFloat(prod.precio_venta) || 0,
      tax_rate:    parseFloat(prod.porcentaje_iva) || 0,
      codigo:      prod.codigo,
    }
    setItems(newItems)
  }

  const onProductoCreated = (prod: any) => {
    setProductos(prev => [...prev, prod])
  }

  const updateItem = (index: number, field: keyof ItemLine, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  // Totales
  const itemTotals = items.map(item => {
    const bruto    = item.cantidad * item.precio
    const descuento = bruto * (item.descuento / 100)
    const base     = bruto - descuento
    const iva      = base * (item.tax_rate / 100)
    return { bruto, descuento, base, iva, total: base + iva }
  })
  const totalBruto      = itemTotals.reduce((s, t) => s + t.bruto, 0)
  const totalDescuentos = itemTotals.reduce((s, t) => s + t.descuento, 0)
  const subtotal        = itemTotals.reduce((s, t) => s + t.base, 0)
  const totalIva        = itemTotals.reduce((s, t) => s + t.iva, 0)
  const totalRetenciones = withholdings.reduce((s, w) => s + subtotal * (w.rate / 100), 0)
  const neto = subtotal + totalIva - totalRetenciones

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.tipo_comprobante_id) { setError('Selecciona un tipo de comprobante.'); return }
    if (!form.tercero_id)          { setError('Selecciona un cliente.'); return }
    if (form.payment_form === '2' && !form.payment_due_date) {
      setError('La fecha de vencimiento es obligatoria para facturas a crédito.')
      return
    }
    if (items.some(i => !i.nombre)) { setError('Todos los ítems deben tener un producto seleccionado.'); return }
    setLoading(true); setError('')
    try {
      const { payment_due_date, ...formBase } = form
      const payload = {
        ...formBase,
        ...(form.payment_form === '2' && payment_due_date ? { payment_due_date } : {}),
        items: items.map(i => ({ ...i, tax_rate: i.tax_rate.toFixed(2), descuento: i.descuento.toFixed(2) })),
        withholding_taxes: withholdings,
      }
      const res = await facturasService.create(payload)
      if (res.success) {
        onSuccess() // refresh parent list
        // If Factus rejected but saved locally, inform user before closing
        if ((res.data as any)?.estado === 'error') {
          setError(res.message || 'Factura guardada, pero Factus la rechazó. Usa "Reintentar" en la lista.')
          setLoading(false)
          return
        }
        onClose()
      }
    } catch (err) {
      setError(extractApiError(err, 'Error al emitir la factura'))
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" style={{ padding: '20px', alignItems: 'flex-start', paddingTop: '20px' }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-card)',
        width: '100%', maxWidth: 1040,
        maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 28px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Nueva Factura de Venta / Ingresos</h2>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {error && (
              <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={16} /> {error}
                {error.includes('resolución') && (
                  <button type="button"
                    style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    onClick={() => { onClose(); navigate('/configuracion') }}>
                    Configurar →
                  </button>
                )}
              </div>
            )}

            {/* Tipo de comprobante */}
            <div className="input-group" style={{ margin: 0 }}>
              <label>Tipo de comprobante *</label>
              {comprobantes.length === 0 ? (
                <div style={{
                  padding: '12px 16px', background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)',
                  fontSize: '0.82rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <AlertCircle size={16} />
                  No hay tipos de comprobante configurados.{' '}
                  <button type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                    onClick={() => { onClose(); navigate('/configuracion') }}>
                    Configurar en Ajustes →
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {comprobantes.map(c => {
                    const sel = form.tipo_comprobante_id === c.id
                    const colors: Record<string, string> = { FV: '#6366f1', DC: '#10b981', NC: '#f59e0b', ND: '#ef4444' }
                    const color = colors[c.tipo_documento] || '#6366f1'
                    return (
                      <button key={c.id} type="button" onClick={() => onSelectComprobante(c.id)}
                        style={{
                          border: `2px solid ${sel ? color : 'var(--border)'}`,
                          background: sel ? color + '12' : 'var(--bg-surface)',
                          borderRadius: 'var(--radius-lg)', padding: '10px 16px',
                          cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', minWidth: 160,
                        }}>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: sel ? color : 'var(--text-primary)', letterSpacing: '0.04em' }}>{c.codigo}</div>
                        <div style={{ fontSize: '0.75rem', color: sel ? color : 'var(--text-muted)', marginTop: 2 }}>{c.nombre}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                          {c.resolucion ? `Res. ${c.resolucion.numero_resolucion}` : <span style={{ color: '#f59e0b' }}>Sin resolución</span>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
              {selectedComprobante?.resolucion && (
                <div style={{
                  marginTop: 10, padding: '8px 14px', borderRadius: 'var(--radius-md)',
                  background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)',
                  fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', gap: 20,
                }}>
                  <span>📋 Res. <strong>{selectedComprobante.resolucion.numero_resolucion}</strong></span>
                  <span>🔢 Rango: <strong>{selectedComprobante.resolucion.desde?.toLocaleString()} – {selectedComprobante.resolucion.hasta?.toLocaleString()}</strong></span>
                  <span>🏷️ Prefijo: <strong>{selectedComprobante.prefijo_override || selectedComprobante.resolucion.prefijo || '—'}</strong></span>
                  <span>📅 Vence: <strong>{selectedComprobante.resolucion.fecha_fin}</strong></span>
                </div>
              )}
            </div>

            {/* Centro de Costo + Cliente + Fecha */}
            <CentroCostoSelect value={form.centro_costo_id} onChange={v => set({ centro_costo_id: v })} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 14 }}>
              <div className="input-group" style={{ margin: 0 }}>
                <label>Cliente *</label>
                <TerceroAutocomplete
                  filtro="clientes"
                  value={form.tercero_id}
                  onChange={(id) => set({ tercero_id: id })}
                  required
                />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label>Fecha de elaboración *</label>
                <input type="date" className="input" required value={form.fecha_emision} onChange={e => set({ fecha_emision: e.target.value })} />
              </div>
            </div>

            {/* Forma de pago + Observaciones */}
            <div style={{ display: 'grid', gridTemplateColumns: `160px 220px${form.payment_form === '2' ? ' 170px' : ''} 1fr`, gap: 14 }}>
              <div className="input-group" style={{ margin: 0 }}>
                <label>Condición de pago</label>
                <select className="input" required value={form.payment_term_id} onChange={e => {
                  const term = paymentTerms.find(item => item.id === e.target.value); const credit = term?.timing === "credit";
                  set({ payment_term_id: e.target.value, payment_form: credit ? "2" : "1", payment_due_date: credit ? dueDateFor(form.fecha_emision, term?.default_credit_days ?? 30) : "" })
                }}>
                  <option value="">Selecciona…</option>{paymentTerms.map(term => <option key={term.id} value={term.id}>{term.name}{term.timing === "credit" ? ` — ${term.default_credit_days} días` : ""}</option>)}
                </select>
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label>Medio de pago</label>
                <select className="input" required value={form.payment_method_id} onChange={e => { const method = paymentMethods.find(item => item.id === e.target.value); set({ payment_method_id: e.target.value, payment_method_code: method?.dian_code ?? "" }) }}>
                  <option value="">Selecciona…</option>{allowedPaymentMethods.map(method => <option key={method.id} value={method.id}>{method.name}</option>)}
                </select>
              </div>
              {form.payment_form === '2' && (
                <div className="input-group" style={{ margin: 0 }}>
                  <label>Fecha de vencimiento *</label>
                  <input
                    type="date"
                    className="input"
                    required
                    min={tomorrow()}
                    value={form.payment_due_date}
                    onChange={e => set({ payment_due_date: e.target.value })}
                  />
                </div>
              )}
              <div className="input-group" style={{ margin: 0 }}>
                <label>Observaciones</label>
                <input type="text" className="input" placeholder="Notas internas..."
                  value={form.observaciones} onChange={e => set({ observaciones: e.target.value })} />
              </div>
            </div>

            {/* ── Ítems ── */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-light)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Ítems de la factura
                </span>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setItems([...items, emptyItem()])}>
                  <Plus size={13} /> Agregar línea
                </button>
              </div>

              {/* Encabezados */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '220px 1fr 70px 110px 65px 100px 90px 32px',
                gap: 6, padding: '6px 8px',
                fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                <span>Producto / Servicio</span>
                <span>Descripción</span>
                <span>Cant.</span>
                <span>Precio Unit.</span>
                <span>% Desc.</span>
                <span>Impuesto</span>
                <span style={{ textAlign: 'right' }}>Total</span>
                <span />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map((item, index) => (
                  <div key={index} style={{
                    display: 'grid',
                    gridTemplateColumns: '220px 1fr 70px 110px 65px 100px 90px 32px',
                    gap: 6, alignItems: 'center',
                    background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)',
                    padding: '8px', border: '1px solid var(--border)',
                  }}>
                    {/* Buscador de producto */}
                    <ProductoSearchInput
                      productos={productos}
                      item={item}
                      onSelect={prod => onSelectProducto(index, prod)}
                      onProductoCreated={onProductoCreated}
                    />

                    <input className="input" style={{ fontSize: '0.82rem', padding: '6px 8px' }}
                      placeholder="Descripción..."
                      value={item.descripcion}
                      onChange={e => updateItem(index, 'descripcion', e.target.value)} />

                    <input type="number" className="input" style={{ fontSize: '0.82rem', padding: '6px 8px' }}
                      value={item.cantidad} min={0.01} step={0.01}
                      onChange={e => updateItem(index, 'cantidad', parseFloat(e.target.value) || 0)} required />

                    <input type="number" className="input" style={{ fontSize: '0.82rem', padding: '6px 8px' }}
                      value={item.precio} min={0}
                      onChange={e => updateItem(index, 'precio', parseFloat(e.target.value) || 0)} required />

                    <input type="number" className="input" style={{ fontSize: '0.82rem', padding: '6px 8px', textAlign: 'center' }}
                      value={item.descuento} min={0} max={100}
                      onChange={e => updateItem(index, 'descuento', parseFloat(e.target.value) || 0)} />

                    <select className="input" style={{ fontSize: '0.82rem', padding: '6px 8px' }}
                      value={item.tax_rate}
                      onChange={e => updateItem(index, 'tax_rate', parseFloat(e.target.value))}>
                      {TAX_RATES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>

                    <div style={{ textAlign: 'right', fontWeight: 600, fontSize: '0.85rem', paddingRight: 4 }}>
                      ${itemTotals[index]?.total.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>

                    <button type="button" className="btn-icon btn-icon-danger" disabled={items.length === 1}
                      onClick={() => setItems(items.filter((_, i) => i !== index))}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Retenciones */}
            <div style={{
              background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)', padding: '14px 16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: '0.83rem' }}>
                  <Scissors size={14} /> Retenciones
                </span>
                <button type="button" className="btn btn-secondary btn-sm"
                  onClick={() => setWithholdings([...withholdings, { code: '05', rate: 2.5 }])}>
                  <Plus size={12} /> Añadir
                </button>
              </div>
              {withholdings.length === 0
                ? <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Sin retenciones aplicadas.</p>
                : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {withholdings.map((w, index) => (
                      <div key={index} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)', padding: '8px 10px',
                      }}>
                        <select className="input" style={{ width: 130, padding: '5px 8px', fontSize: '0.8rem' }}
                          value={w.code}
                          onChange={e => { const n = [...withholdings]; n[index] = { ...n[index], code: e.target.value }; setWithholdings(n) }}>
                          {WITHHOLDING_TYPES.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
                        </select>
                        <input type="number" className="input" style={{ width: 70, padding: '5px 8px', fontSize: '0.8rem' }}
                          value={w.rate} step={0.01}
                          onChange={e => { const n = [...withholdings]; n[index] = { ...n[index], rate: parseFloat(e.target.value) }; setWithholdings(n) }} />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>%</span>
                        <button type="button" className="btn-icon btn-icon-danger"
                          onClick={() => setWithholdings(withholdings.filter((_, i) => i !== index))}>
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>

          {/* Footer totales */}
          <div style={{
            flexShrink: 0, padding: '16px 28px', borderTop: '1px solid var(--border)',
            background: 'var(--bg-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20,
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, auto)', gap: '8px 24px', alignItems: 'center' }}>
              {[
                { label: 'Total Bruto',  value: totalBruto },
                { label: 'Descuentos',   value: -totalDescuentos, color: totalDescuentos > 0 ? '#10b981' : undefined },
                { label: 'Subtotal',     value: subtotal },
                { label: 'IVA',          value: totalIva },
                ...(totalRetenciones > 0 ? [{ label: 'Retenciones', value: -totalRetenciones, color: '#f59e0b' as string | undefined }] : []),
              ].map((t, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t.label}</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: t.color || 'var(--text-primary)' }}>
                    ${Math.abs(t.value).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                </div>
              ))}
              <div style={{ borderLeft: '2px solid var(--border)', paddingLeft: 20 }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Neto</div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent)' }}>
                  ${neto.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={loading || fetchingData || comprobantes.length === 0}>
                {loading ? <><Loader2 size={16} className="spinner" /> Guardando...</> : <><Save size={16} /> Guardar Factura</>}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
