import CentroCostoSelect from '@/components/CentroCostoSelect'
import CuentaAutocomplete from '@/components/CuentaAutocomplete'
import ParametrizacionGuard from '@/components/ParametrizacionGuard'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { X, Plus, Trash2, Loader2, Save, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import { documentoIngresoService } from '@/services/documentoIngreso.service'
import { tercerosService, type Tercero } from '@/services/terceros.service'
import { bodegasService, type Bodega } from '@/services/inventario.service'
import {
  tipoDocumentoIngresoService,
  type TipoDocumentoIngreso,
} from '@/services/tipoDocumentoIngreso.service'
import { api } from '@/lib/api'
import { extractApiError } from '@/lib/errors'
import { getTenantId } from '@/services/auth.service'

// ─── Conceptos de retención (al estilo SIIGO) ────────────────────────────────

interface ConceptoRetencion {
  id:          string
  label:       string
  tipo:        'fuente' | 'ica' | 'iva'
  tasa:        number        // porcentaje (ej: 3.5 = 3.5%)
  cuentaClave: string        // clave en parametrizacion_contable
  baseLabel:   string        // "Subtotal sin IVA" | "IVA"
}

/**
 * Catálogo completo de retenciones colombianas según ET y Decreto 2418/2013.
 * Las tarifas dependen de si el proveedor es declarante o no declarante de renta.
 * ReteICA depende del municipio (UVT cambia por acuerdo municipal).
 */
const CONCEPTOS_RETENCION: ConceptoRetencion[] = [
  // ── Retefuente — COMPRAS DE BIENES (Art. 401 ET) ──────────────────────────
  { id: 'rf_compras_declarante',    label: 'Retefuente — Compras 2.5% (proveedor declarante)',     tipo: 'fuente', tasa: 2.5,  cuentaClave: 'compra.cuenta_retefuente', baseLabel: 'Subtotal sin IVA' },
  { id: 'rf_compras_no_declarante', label: 'Retefuente — Compras 3.5% (proveedor NO declarante)',  tipo: 'fuente', tasa: 3.5,  cuentaClave: 'compra.cuenta_retefuente', baseLabel: 'Subtotal sin IVA' },

  // ── Retefuente — SERVICIOS (Art. 392 ET) ──────────────────────────────────
  { id: 'rf_servicios_declarante',     label: 'Retefuente — Servicios 4% (declarante)',         tipo: 'fuente', tasa: 4.0, cuentaClave: 'compra.cuenta_retefuente',            baseLabel: 'Subtotal sin IVA' },
  { id: 'rf_servicios_no_declarante',  label: 'Retefuente — Servicios 6% (NO declarante)',      tipo: 'fuente', tasa: 6.0, cuentaClave: 'compra.cuenta_retefuente',            baseLabel: 'Subtotal sin IVA' },

  // ── Retefuente — HONORARIOS Y COMISIONES (Art. 392 ET) ────────────────────
  { id: 'rf_honorarios_declarante',    label: 'Retefuente — Honorarios 11% (PJ declarante)',     tipo: 'fuente', tasa: 11.0, cuentaClave: 'compra.cuenta_retefuente_honorarios', baseLabel: 'Subtotal sin IVA' },
  { id: 'rf_honorarios_no_declarante', label: 'Retefuente — Honorarios 10% (PN NO declarante)',  tipo: 'fuente', tasa: 10.0, cuentaClave: 'compra.cuenta_retefuente_honorarios', baseLabel: 'Subtotal sin IVA' },

  // ── Retefuente — OTROS CONCEPTOS ──────────────────────────────────────────
  { id: 'rf_arrendamiento_inmueb', label: 'Retefuente — Arrendamiento inmuebles (3.5%)',         tipo: 'fuente', tasa: 3.5, cuentaClave: 'compra.cuenta_retefuente', baseLabel: 'Subtotal sin IVA' },
  { id: 'rf_arrendamiento_muebles',label: 'Retefuente — Arrendamiento bienes muebles (4%)',      tipo: 'fuente', tasa: 4.0, cuentaClave: 'compra.cuenta_retefuente', baseLabel: 'Subtotal sin IVA' },
  { id: 'rf_aseo_vigilancia',      label: 'Retefuente — Aseo y vigilancia (2%)',                 tipo: 'fuente', tasa: 2.0, cuentaClave: 'compra.cuenta_retefuente', baseLabel: 'Subtotal sin IVA' },
  { id: 'rf_intereses',            label: 'Retefuente — Rendimientos financieros (7%)',          tipo: 'fuente', tasa: 7.0, cuentaClave: 'compra.cuenta_retefuente', baseLabel: 'Subtotal sin IVA' },
  { id: 'rf_transporte_carga',     label: 'Retefuente — Transporte de carga nacional (3.5%)',    tipo: 'fuente', tasa: 3.5, cuentaClave: 'compra.cuenta_retefuente', baseLabel: 'Subtotal sin IVA' },
  { id: 'rf_otro',                 label: 'Retefuente — Otro concepto (tasa libre)',             tipo: 'fuente', tasa: 0,   cuentaClave: 'compra.cuenta_retefuente', baseLabel: 'Subtotal sin IVA' },

  // ── ReteICA (tarifas por mil — varían por municipio) ──────────────────────
  // Las tarifas mostradas son referenciales (Bogotá D.C.). Para Garzón, Cali u
  // otros municipios deben ajustarse según el acuerdo municipal vigente.
  { id: 'ica_comercio',  label: 'ReteICA — Comercio al por mayor/menor (≈4.14‰)',  tipo: 'ica', tasa: 0.414, cuentaClave: 'compra.cuenta_reteica', baseLabel: 'Subtotal sin IVA' },
  { id: 'ica_servicios', label: 'ReteICA — Servicios generales (≈9.66‰)',          tipo: 'ica', tasa: 0.966, cuentaClave: 'compra.cuenta_reteica', baseLabel: 'Subtotal sin IVA' },
  { id: 'ica_industria', label: 'ReteICA — Industria y manufactura (≈6.9‰)',       tipo: 'ica', tasa: 0.69,  cuentaClave: 'compra.cuenta_reteica', baseLabel: 'Subtotal sin IVA' },
  { id: 'ica_otro',      label: 'ReteICA — Otro concepto (tasa libre)',            tipo: 'ica', tasa: 0,     cuentaClave: 'compra.cuenta_reteica', baseLabel: 'Subtotal sin IVA' },
]

/**
 * Mapeo retro-compatible: IDs viejos (almacenados en tipos_documento_ingreso del
 * tenant antes del BUG-027) → IDs nuevos del catálogo expandido.
 * Permite que TipoDocumento existentes sigan auto-agregando la retención correcta.
 */
const ID_LEGACY_TO_NEW: Record<string, string> = {
  rf_compras:       'rf_compras_no_declarante',  // 3.5% era el default histórico
  rf_servicios:     'rf_servicios_declarante',   // 4% era el que tenía
  rf_honorarios:    'rf_honorarios_declarante',  // 11% era el que tenía
  rf_arrendamiento: 'rf_arrendamiento_muebles',  // 4% era el que tenía
  rf_transporte:    'rf_transporte_carga',       // 3.5% es la tarifa correcta
}

/** Resuelve un ID de concepto contemplando el mapeo legacy. */
function resolverConcepto(id: string): ConceptoRetencion | undefined {
  const directo = CONCEPTOS_RETENCION.find(c => c.id === id)
  if (directo) return directo
  const mapeado = ID_LEGACY_TO_NEW[id]
  return mapeado ? CONCEPTOS_RETENCION.find(c => c.id === mapeado) : undefined
}

interface RetencionLine {
  conceptoId: string
  base:       number
  tasa:       number
  valor:      number
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Props { isOpen: boolean; onClose: () => void; onSuccess: () => void }
type TipoLinea = 'producto' | 'gasto' | 'activo_fijo'

interface ItemLine {
  tipo_linea:      TipoLinea
  descripcion:     string
  producto_id:     string
  bodega_id:       string
  cuenta_id:       string
  cantidad:        number
  precio_unitario: number
  porcentaje_iva:  number
}

interface Producto { id: string; codigo: string; nombre: string; precio_compra: number }

const emptyItem = (tipoLinea: TipoLinea = 'producto'): ItemLine => ({
  tipo_linea: tipoLinea, descripcion: '', producto_id: '',
  bodega_id: '', cuenta_id: '', cantidad: 1, precio_unitario: 0, porcentaje_iva: 19,
})

const fmt = (n: number) => n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

// ─── Componente ──────────────────────────────────────────────────────────────

export default function NuevoDocumentoIngresoModal({ isOpen, onClose, onSuccess }: Props) {
  // Validación de parametrización ANTES de mostrar el formulario.
  // Si faltan claves críticas, el Guard intercepta y ofrece ir a Cuentas Maestras.
  const [parametrizacionOk, setParametrizacionOk] = useState(false)
  useEffect(() => { if (!isOpen) setParametrizacionOk(false) }, [isOpen])

  const [loading, setLoading]         = useState(false)
  const [terceros, setTerceros]       = useState<Tercero[]>([])
  const [bodegas, setBodegas]         = useState<Bodega[]>([])
  const [productos, setProductos]     = useState<Producto[]>([])
  const [tiposDoc, setTiposDoc]       = useState<TipoDocumentoIngreso[]>([])
  const [error, setError]             = useState('')
  const [items, setItems]             = useState<ItemLine[]>([emptyItem()])
  const [retenciones, setRetenciones] = useState<RetencionLine[]>([])
  const [showReten, setShowReten]     = useState(false)
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoDocumentoIngreso | null>(null)

  // Calcula la fecha de vencimiento sugerida según forma de pago:
  // crédito → fecha + 30 días | contado → mismo día.
  const sugerirVencimiento = (fechaStr: string, formaPago: string): string => {
    if (!fechaStr) return ''
    const d = new Date(`${fechaStr}T00:00:00`)
    if (formaPago === 'credito') d.setDate(d.getDate() + 30)
    return d.toISOString().split('T')[0]
  }

  const hoy = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    centro_costo_id: '', tercero_id: '', tipo: 'factura_compra',
    fecha: hoy,
    fecha_vencimiento: sugerirVencimiento(hoy, 'contado_banco'),
    concepto: '', forma_pago: 'contado_banco',
    sucursal_id: '', observaciones: '', numero_documento_proveedor: '',
  })

  const loadCatalogues = useCallback(async () => {
    const [t, b, p, td] = await Promise.all([
      tercerosService.getAll().then(r => r.data || []),
      bodegasService.getAll(),
      api.get(`/${getTenantId()}/productos`).then(r => r.data.data ?? []),
      tipoDocumentoIngresoService.getAll().catch(() => []),
    ])
    setTerceros(t); setBodegas(b); setProductos(p)
    setTiposDoc(td)
  }, [])

  useEffect(() => { if (isOpen) loadCatalogues() }, [isOpen, loadCatalogues])

  // ── Auto-fill al seleccionar tipo de documento ─────────────────────────────
  const handleTipoChange = (tipoId: string) => {
    const tipo = tiposDoc.find(t => t.id === tipoId) ?? null
    setTipoSeleccionado(tipo)

    if (!tipo) return

    // Resetear ítems al tipo_linea_default del tipo seleccionado
    setItems([emptyItem(tipo.tipo_linea_default as TipoLinea)])

    // Auto-agregar retenciones predeterminadas
    const nuevasRetenciones: RetencionLine[] = []

    if (tipo.retefuente_concepto && tipo.retefuente_tasa != null) {
      // Normalizar ID legacy del backend al ID actual del catálogo (BUG-027)
      const conceptoResuelto = resolverConcepto(tipo.retefuente_concepto)
      nuevasRetenciones.push({
        conceptoId: conceptoResuelto?.id ?? tipo.retefuente_concepto,
        base: 0,   // se ajustará cuando haya ítems
        tasa: tipo.retefuente_tasa,
        valor: 0,
      })
    }

    if (tipo.reteica_concepto && tipo.reteica_tasa != null) {
      const conceptoResuelto = resolverConcepto(tipo.reteica_concepto)
      nuevasRetenciones.push({
        conceptoId: conceptoResuelto?.id ?? tipo.reteica_concepto,
        base: 0,
        tasa: tipo.reteica_tasa,
        valor: 0,
      })
    }

    setRetenciones(nuevasRetenciones)
    if (nuevasRetenciones.length > 0) setShowReten(true)

    // Actualizar tipo en form — mapear código del tipo parametrizado al enum
    // que acepta el backend (factura_compra | cuenta_cobro | gasto | otro).
    // El código (FCI, FCA, FCG, CC...) es del catálogo interno del tenant y
    // NO coincide con el enum legal de documentos contables.
    const codigoUpper = String(tipo.codigo).toUpperCase()
    const tipoBackend =
      codigoUpper === 'CC'                                ? 'cuenta_cobro'
      : codigoUpper === 'FCG' || codigoUpper.startsWith('G') ? 'gasto'
      : codigoUpper.startsWith('FC')                       ? 'factura_compra'  // FCI, FCA, FCG variantes
      : 'otro'
    setForm(f => ({ ...f, tipo: tipoBackend }))
  }

  // ── Totales ────────────────────────────────────────────────────────────────
  const totals = useMemo(() => items.reduce((acc, it) => {
    const sub = it.cantidad * it.precio_unitario
    return { bruto: acc.bruto + sub, iva: acc.iva + sub * (it.porcentaje_iva / 100) }
  }, { bruto: 0, iva: 0 }), [items])

  // Sincronizar base de retenciones con el subtotal actual
  const retencionesConBase = useMemo(() =>
    retenciones.map(r => ({
      ...r,
      base: r.base === 0 ? Math.round(totals.bruto) : r.base,
      valor: Math.round((r.base === 0 ? totals.bruto : r.base) * r.tasa / 100),
    }))
  , [retenciones, totals.bruto])

  const totalRetefuente = useMemo(() =>
    retencionesConBase.filter(r => resolverConcepto(r.conceptoId)?.tipo === 'fuente')
      .reduce((s, r) => s + r.valor, 0)
  , [retencionesConBase])

  const totalReteica = useMemo(() =>
    retencionesConBase.filter(r => resolverConcepto(r.conceptoId)?.tipo === 'ica')
      .reduce((s, r) => s + r.valor, 0)
  , [retencionesConBase])

  const totalPagar = totals.bruto + totals.iva - totalRetefuente - totalReteica

  // ── Items ──────────────────────────────────────────────────────────────────
  const addItem = () => setItems(p => [...p, emptyItem(tipoSeleccionado?.tipo_linea_default as TipoLinea ?? 'producto')])
  const removeItem = (i: number) => items.length > 1 && setItems(p => p.filter((_, idx) => idx !== i))
  const updateItem = <K extends keyof ItemLine>(i: number, field: K, value: ItemLine[K]) => {
    setItems(prev => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: value }
      if (field === 'producto_id' && value) {
        const prod = productos.find(p => p.id === value)
        if (prod) { next[i].descripcion = prod.nombre; next[i].precio_unitario = prod.precio_compra || 0 }
      }
      if (field === 'tipo_linea') { next[i].producto_id = ''; next[i].bodega_id = ''; next[i].cuenta_id = '' }
      return next
    })
  }

  // ── Retenciones ────────────────────────────────────────────────────────────
  const addRetencion = (conceptoId: string) => {
    const concepto = CONCEPTOS_RETENCION.find(c => c.id === conceptoId)
    if (!concepto) return
    const base = Math.round(totals.bruto)
    const tasa = concepto.tasa
    const valor = Math.round(base * tasa / 100)
    setRetenciones(prev => [...prev, { conceptoId, base, tasa, valor }])
  }

  const removeRetencion = (i: number) => setRetenciones(p => p.filter((_, idx) => idx !== i))

  const updateRetencion = (i: number, field: 'base' | 'tasa', value: number) => {
    setRetenciones(prev => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: value, valor: Math.round(
        (field === 'base' ? value : next[i].base) *
        (field === 'tasa' ? value : next[i].tasa) / 100
      )}
      return next
    })
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const resetForm = () => {
    setForm({ centro_costo_id: '', tercero_id: '', tipo: 'factura_compra', fecha: new Date().toISOString().split('T')[0],
      fecha_vencimiento: sugerirVencimiento(hoy, 'contado_banco'), concepto: '', forma_pago: 'contado_banco', sucursal_id: '', observaciones: '', numero_documento_proveedor: '' })
    setItems([emptyItem()]); setRetenciones([]); setError('')
    setTipoSeleccionado(null); setShowReten(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    for (const it of items) {
      if (it.tipo_linea === 'producto' && !it.bodega_id)
        return setError('Todos los ítems de Producto requieren bodega.')
      if (it.tipo_linea === 'producto' && !it.producto_id)
        return setError('Todos los ítems de Producto requieren seleccionar el producto.')
    }

    setLoading(true)
    try {
      const payload = {
        ...form,
        tipo_documento_ingreso_id: tipoSeleccionado?.id ?? null,
        valor_retefuente: totalRetefuente,
        valor_reteica:    totalReteica,
        items: items.map(it => ({
          tipo_linea: it.tipo_linea, descripcion: it.descripcion,
          cantidad: it.cantidad, precio_unitario: it.precio_unitario,
          porcentaje_iva: it.porcentaje_iva,
          ...(it.tipo_linea === 'producto'
            ? { producto_id: it.producto_id, bodega_id: it.bodega_id }
            : { cuenta_id: it.cuenta_id }),
        })),
      }
      await documentoIngresoService.create(payload)
      onSuccess(); onClose(); resetForm()
    } catch (err) {
      setError(extractApiError(err, 'Error al registrar el documento'))
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const bodegasFiltradas = form.sucursal_id
    ? bodegas.filter(b => b.sucursal_id === form.sucursal_id)
    : bodegas

  const conceptosDisponibles = CONCEPTOS_RETENCION.filter(
    (c): c is ConceptoRetencion => Boolean(c) && !retenciones.find(r => r.conceptoId === c.id)
  )

  // Mientras valida o si faltan cuentas, mostrar el Guard en vez del formulario.
  if (isOpen && !parametrizacionOk) {
    return (
      <ParametrizacionGuard
        modulo="compra"
        isOpen={isOpen}
        onClose={onClose}
        onValido={() => setParametrizacionOk(true)}
      />
    )
  }

  return (
    <div className="modal-overlay purchase-modal-overlay">
      <div className="modal purchase-modal">
        <div className="modal-header purchase-modal-header">
          <div>
            <h2 className="modal-title">Registrar factura de compra</h2>
            <p className="modal-description">Registra el documento del proveedor y la entrada a inventario.</p>
          </div>
          <button type="button" onClick={onClose} className="btn-icon" aria-label="Cerrar factura de compra"><X size={20} /></button>
        </div>

        {error && <div className="alert alert-error purchase-modal-error">{error}</div>}

        <form onSubmit={handleSubmit} className="purchase-modal-form">

          {/* ── Selector de Tipo de Documento (SIIGO-style) ── */}
          <div className={`purchase-document-type ${tipoSeleccionado ? 'is-selected' : ''}`} style={{
            padding: '14px 16px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            borderLeft: tipoSeleccionado ? '4px solid var(--accent)' : '4px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Zap size={15} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                Tipo de Documento
              </span>
            </div>
            <div className="purchase-document-type-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
              <div className="input-group" style={{ margin: 0 }}>
                <label>Tipo parametrizado</label>
                <select
                  className="input"
                  value={tipoSeleccionado?.id ?? ''}
                  onChange={e => handleTipoChange(e.target.value)}
                >
                  <option value="">— Seleccionar tipo de compra —</option>
                  {tiposDoc.map(t => (
                    <option key={t.id} value={t.id}>
                      [{t.codigo}] {t.nombre}
                    </option>
                  ))}
                </select>
              </div>
              {tipoSeleccionado && (
                <div style={{
                  padding: '8px 12px',
                  background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8rem',
                }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{tipoSeleccionado.nombre}</div>
                  {tipoSeleccionado.descripcion && (
                    <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{tipoSeleccionado.descripcion}</div>
                  )}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                    <span className="badge badge-secondary">
                      {tipoSeleccionado.tipo_linea_default === 'producto' ? 'Inventario' :
                       tipoSeleccionado.tipo_linea_default === 'gasto'    ? 'Gasto' : 'Activo Fijo'}
                    </span>
                    {tipoSeleccionado.afecta_inventario && (
                      <span className="badge badge-success">Afecta KARDEX</span>
                    )}
                    {tipoSeleccionado.retefuente_concepto && (
                      <span style={{ padding: '2px 8px', borderRadius: 20, background: '#6366f120', color: '#6366f1', fontSize: '0.72rem', fontWeight: 600 }}>
                        RF {tipoSeleccionado.retefuente_tasa}%
                      </span>
                    )}
                    {tipoSeleccionado.reteica_concepto && (
                      <span style={{ padding: '2px 8px', borderRadius: 20, background: '#f59e0b20', color: '#f59e0b', fontSize: '0.72rem', fontWeight: 600 }}>
                        ICA {tipoSeleccionado.reteica_tasa}‰
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Centro de Costo ── */}
          <CentroCostoSelect value={form.centro_costo_id} onChange={v => setForm(f => ({ ...f, centro_costo_id: v }))} />

          {/* ── Cabecera ── */}
          <div className="purchase-header-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="input-group">
              <label>Proveedor / Tercero *</label>
              <select className="input" value={form.tercero_id}
                onChange={e => setForm(f => ({ ...f, tercero_id: e.target.value }))} required>
                <option value="">Seleccione...</option>
                {terceros.map(t => <option key={t.id} value={t.id}>{t.razon_social} ({t.identificacion})</option>)}
              </select>
            </div>
            <div className="input-group">
              <label>N° Doc. Proveedor</label>
              <input type="text" className="input" placeholder="Ej: FCV-0001"
                value={form.numero_documento_proveedor}
                onChange={e => setForm(f => ({ ...f, numero_documento_proveedor: e.target.value }))} />
            </div>
            <div className="input-group">
              <label>Fecha *</label>
              <input type="date" className="input" value={form.fecha}
                onChange={e => setForm(f => ({
                  ...f,
                  fecha: e.target.value,
                  // recalcular vencimiento al cambiar la fecha
                  fecha_vencimiento: sugerirVencimiento(e.target.value, f.forma_pago),
                }))} required />
            </div>
            <div className="input-group">
              <label>Forma de Pago</label>
              <select className="input" value={form.forma_pago}
                onChange={e => setForm(f => ({
                  ...f,
                  forma_pago: e.target.value,
                  // recalcular vencimiento al cambiar la forma de pago
                  fecha_vencimiento: sugerirVencimiento(f.fecha, e.target.value),
                }))}>
                <option value="contado_banco">Contado — por banco (transferencia/cheque)</option>
                <option value="contado_efectivo">Contado — efectivo (caja)</option>
                <option value="credito">Crédito (cuenta por pagar)</option>
              </select>
            </div>
            <div className="input-group">
              <label>
                Fecha Vencimiento
                {form.forma_pago === 'credito' && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 6 }}>
                    (auto +30 días — editable)
                  </span>
                )}
              </label>
              <input type="date" className="input" value={form.fecha_vencimiento}
                onChange={e => setForm(f => ({ ...f, fecha_vencimiento: e.target.value }))}
                min={form.fecha} />
            </div>
            <div className="input-group">
              <label>Observaciones</label>
              <input type="text" className="input" placeholder="Notas adicionales..."
                value={form.observaciones}
                onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} />
            </div>
          </div>
          <div className="input-group" style={{ margin: 0 }}>
            <label>Concepto General *</label>
            <input type="text" className="input" placeholder="Descripción del documento..."
              value={form.concepto}
              onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))} required />
          </div>

          {/* ── Líneas ── */}
          <div className="purchase-lines-section">
            <div className="purchase-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>Líneas del Documento</h3>
              <button type="button" onClick={addItem} className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '5px 12px' }}>
                <Plus size={14} /> Agregar Línea
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map((item, i) => (
                <div key={i} className={`purchase-line-card purchase-line-card--${item.tipo_linea}`} style={{
                  background: 'var(--bg-surface)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)', padding: '12px 14px',
                  borderLeft: `4px solid ${item.tipo_linea === 'producto' ? 'var(--accent)' : item.tipo_linea === 'activo_fijo' ? '#f59e0b' : '#10b981'}`,
                }}>
                  <div className="purchase-line-primary" style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 8 }}>
                    <div className="input-group" style={{ width: 170, margin: 0 }}>
                      <label style={{ fontSize: '0.72rem' }}>Tipo de línea</label>
                      <select className="input" style={{ fontSize: '0.8rem' }} value={item.tipo_linea}
                        onChange={e => updateItem(i, 'tipo_linea', e.target.value as TipoLinea)}>
                        <option value="producto">Producto / Inv.</option>
                        <option value="gasto">Gasto / Servicio</option>
                        <option value="activo_fijo">Activo Fijo</option>
                      </select>
                    </div>
                    <div className="input-group" style={{ flex: 1, margin: 0 }}>
                      <label style={{ fontSize: '0.72rem' }}>Descripción</label>
                      <input type="text" className="input" style={{ fontSize: '0.82rem' }}
                        value={item.descripcion}
                        onChange={e => updateItem(i, 'descripcion', e.target.value)} required />
                    </div>
                    <div className="input-group" style={{ width: 90, margin: 0 }}>
                      <label style={{ fontSize: '0.72rem' }}>IVA %</label>
                      <select className="input" style={{ fontSize: '0.82rem' }} value={item.porcentaje_iva}
                        onChange={e => updateItem(i, 'porcentaje_iva', parseFloat(e.target.value))}>
                        <option value={19}>19%</option>
                        <option value={5}>5%</option>
                        <option value={0}>0%</option>
                      </select>
                    </div>
                    <button type="button" onClick={() => removeItem(i)} className="btn-icon btn-icon-danger" style={{ marginBottom: 2 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="purchase-line-detail" style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                    {item.tipo_linea === 'producto' ? (
                      <>
                        <div className="input-group" style={{ flex: 2, margin: 0 }}>
                          <label style={{ fontSize: '0.72rem' }}>Producto *</label>
                          <select className="input" style={{ fontSize: '0.8rem' }} value={item.producto_id}
                            onChange={e => updateItem(i, 'producto_id', e.target.value)} required>
                            <option value="">Seleccione...</option>
                            {productos.map(p => <option key={p.id} value={p.id}>[{p.codigo}] {p.nombre}</option>)}
                          </select>
                        </div>
                        <div className="input-group" style={{ flex: 2, margin: 0 }}>
                          <label style={{ fontSize: '0.72rem' }}>Bodega destino *</label>
                          <select className="input" style={{ fontSize: '0.8rem' }} value={item.bodega_id}
                            onChange={e => updateItem(i, 'bodega_id', e.target.value)} required>
                            <option value="">Seleccione...</option>
                            {bodegasFiltradas.map(b => (
                              <option key={b.id} value={b.id}>
                                {b.sucursal?.nombre ? `${b.sucursal.nombre} › ` : ''}{b.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    ) : (
                      <div className="input-group" style={{ flex: 4, margin: 0 }}>
                        <label style={{ fontSize: '0.72rem' }}>Cuenta Contable</label>
                        <CuentaAutocomplete
                          value={item.cuenta_id ?? ''}
                          onChange={(id, cuenta) => {
                            // Setea cuenta + auto-llena descripción si está vacía
                            // (mismo patrón que cuando seleccionas un producto)
                            setItems(prev => prev.map((it, idx) => {
                              if (idx !== i) return it
                              const next = { ...it, cuenta_id: id }
                              if (cuenta && !it.descripcion?.trim()) {
                                next.descripcion = cuenta.nombre
                              }
                              return next
                            }))
                          }}
                          prefixFilter={['5', '6', '15', '16']}
                          placeholder="Busca por código o nombre..."
                        />
                      </div>
                    )}
                    <div className="input-group purchase-line-quantity" style={{ width: 80, margin: 0 }}>
                      <label style={{ fontSize: '0.72rem' }}>Cant.</label>
                      <input type="number" className="input" style={{ fontSize: '0.82rem' }}
                        value={item.cantidad} min={0.001} step={0.001}
                        onChange={e => updateItem(i, 'cantidad', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="input-group purchase-line-price" style={{ width: 120, margin: 0 }}>
                      <label style={{ fontSize: '0.72rem' }}>Precio Unit. $</label>
                      <input type="number" className="input" style={{ fontSize: '0.82rem' }}
                        value={item.precio_unitario} min={0}
                        onChange={e => updateItem(i, 'precio_unitario', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="purchase-line-subtotal" style={{ textAlign: 'right', minWidth: 90, paddingBottom: 4 }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Subtotal</div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                        ${fmt(item.cantidad * item.precio_unitario)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Retenciones (estilo SIIGO) ── */}
          <div className="purchase-withholdings" style={{
            border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}>
            <button
              type="button"
              onClick={() => setShowReten(v => !v)}
              className="purchase-withholdings-toggle"
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '11px 16px', background: 'var(--bg-surface)',
                borderBottom: showReten ? '1px solid var(--border)' : 'none',
                cursor: 'pointer', fontSize: '0.87rem', fontWeight: 600,
              }}
            >
              {showReten ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              Retenciones
              {retenciones.length > 0 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                  ({retenciones.length} aplicada{retenciones.length !== 1 ? 's' : ''} automáticamente)
                </span>
              )}
              {(totalRetefuente + totalReteica) > 0 && (
                <span style={{
                  marginLeft: 'auto', fontSize: '0.8rem', fontWeight: 700,
                  color: '#ef4444',
                }}>
                  − ${fmt(totalRetefuente + totalReteica)}
                </span>
              )}
            </button>

            {showReten && (
              <div className="purchase-withholdings-body" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Selector para agregar concepto manualmente */}
                {conceptosDisponibles.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select
                      className="input"
                      style={{ flex: 1, fontSize: '0.82rem' }}
                      defaultValue=""
                      onChange={e => { if (e.target.value) { addRetencion(e.target.value); e.target.value = '' } }}
                    >
                      <option value="">+ Agregar concepto de retención...</option>
                      <optgroup label="── Retefuente ──">
                        {conceptosDisponibles.filter(c => c?.tipo === 'fuente').map(c => (
                          <option key={c.id} value={c.id}>{c.label} ({c.tasa}%)</option>
                        ))}
                      </optgroup>
                      <optgroup label="── ReteICA ──">
                        {conceptosDisponibles.filter(c => c?.tipo === 'ica').map(c => (
                          <option key={c.id} value={c.id}>{c.label} ({c.tasa}‰)</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                )}

                {/* Líneas de retención */}
                {retenciones.length === 0 && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
                    Selecciona un concepto para agregar una retención.
                  </p>
                )}
                {retencionesConBase.map((r, i) => {
                  const concepto = resolverConcepto(r.conceptoId)
                  // Si el concepto ya no existe (TipoDoc con ID obsoleto y sin mapeo),
                  // omitir esta línea para no romper el render.
                  if (!concepto) return null
                  const esIca = concepto.tipo === 'ica'
                  const autoAgregada = tipoSeleccionado &&
                    (tipoSeleccionado.retefuente_concepto === r.conceptoId ||
                     tipoSeleccionado.reteica_concepto === r.conceptoId)
                  return (
                    <div key={i} className="purchase-withholding-row" style={{
                      display: 'grid', gridTemplateColumns: '1fr 120px 100px 100px 32px',
                      gap: 8, alignItems: 'center',
                      padding: '8px 12px',
                      background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)',
                      borderLeft: `3px solid ${esIca ? '#f59e0b' : '#6366f1'}`,
                    }}>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {concepto.label}
                          {autoAgregada && (
                            <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: 20, background: 'var(--accent)20', color: 'var(--accent)', fontWeight: 700 }}>
                              auto
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Cuenta: {concepto.cuentaClave}
                        </div>
                      </div>
                      <div className="input-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '0.68rem' }}>Base $</label>
                        <input type="number" className="input" style={{ fontSize: '0.8rem', padding: '4px 6px' }}
                          value={r.base} min={0}
                          onChange={e => updateRetencion(i, 'base', parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="input-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '0.68rem' }}>Tasa {esIca ? '‰' : '%'}</label>
                        <input type="number" className="input" style={{ fontSize: '0.8rem', padding: '4px 6px' }}
                          value={r.tasa} min={0} step={0.001}
                          onChange={e => updateRetencion(i, 'tasa', parseFloat(e.target.value) || 0)} />
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Valor</div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#ef4444' }}>
                          ${fmt(r.valor)}
                        </div>
                      </div>
                      <button type="button" onClick={() => removeRetencion(i)} className="btn-icon btn-icon-danger" style={{ padding: 4 }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Footer con totales ── */}
          <div className="purchase-summary" style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
            paddingTop: 16, borderTop: '1px solid var(--border)',
          }}>
            <div className="purchase-summary-values" style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>
                Subtotal: <strong>${fmt(totals.bruto)}</strong>
              </span>
              <span style={{ color: 'var(--text-muted)' }}>
                IVA: <strong>${fmt(totals.iva)}</strong>
              </span>
              {totalRetefuente > 0 && (
                <span style={{ color: '#6366f1' }}>
                  Retefuente: <strong>− ${fmt(totalRetefuente)}</strong>
                </span>
              )}
              {totalReteica > 0 && (
                <span style={{ color: '#f59e0b' }}>
                  ReteICA: <strong>− ${fmt(totalReteica)}</strong>
                </span>
              )}
              <span style={{ fontWeight: 800, fontSize: '1.05rem', marginTop: 4 }}>
                Total a pagar: <span style={{ color: 'var(--accent)' }}>${fmt(totalPagar)}</span>
              </span>
            </div>
            <div className="purchase-summary-actions" style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={onClose} className="btn btn-secondary">Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <Loader2 size={16} className="spinner" /> : <Save size={16} />}
                {loading ? 'Guardando...' : 'Registrar Documento'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
