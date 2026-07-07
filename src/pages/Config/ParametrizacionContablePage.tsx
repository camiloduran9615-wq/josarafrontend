import { useState, useEffect, useCallback } from 'react'
import { Save, Loader2, AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Plus, X } from 'lucide-react'
import { api } from '@/lib/api'
import { getAxiosErrorData, getErrorMessage } from '@/lib/errors'
import { getTenantId } from '@/services/auth.service'

// ─── Metadatos de cada clave (legible para el contador) ────────────────────────

interface ClaveInfo {
  clave:       string
  label:       string
  descripcion: string
  pucSugerido: string
  requerida:   boolean
}

const MODULOS: { id: string; label: string; claves: ClaveInfo[] }[] = [
  {
    id: 'compra',
    label: 'Compras y Gastos',
    claves: [
      { clave: 'compra.cuenta_proveedor',             label: 'Proveedores (Crédito)',            descripcion: 'Cuenta a acreditar cuando se compra a crédito.',                  pucSugerido: '220505', requerida: true  },
      { clave: 'compra.cuenta_caja',                  label: 'Caja (Contado)',                   descripcion: 'Cuenta a acreditar cuando se paga de contado.',                    pucSugerido: '110505', requerida: true  },
      { clave: 'compra.cuenta_banco',                 label: 'Banco (Pago cheque/transferencia)', descripcion: 'Cuenta bancaria para pagos por transferencia.',                   pucSugerido: '111005', requerida: false },
      { clave: 'compra.cuenta_iva_descontable',       label: 'IVA Descontable',                  descripcion: 'IVA de compras que se descuenta del IVA generado. (240810)',        pucSugerido: '240810', requerida: true  },
      { clave: 'compra.cuenta_retefuente',            label: 'Retención en la Fuente — Compras', descripcion: 'Retención sobre compras de bienes (tarifa 3.5%). (236540)',        pucSugerido: '236540', requerida: true  },
      { clave: 'compra.cuenta_retefuente_honorarios', label: 'Retención en la Fuente — Honorarios', descripcion: 'Retención sobre honorarios y servicios (tarifa 11%). (236540)', pucSugerido: '236540', requerida: false },
      { clave: 'compra.cuenta_reteica',               label: 'Reteica',                          descripcion: 'Retención industria y comercio sobre compras. (236801)',            pucSugerido: '236801', requerida: true  },
      { clave: 'compra.cuenta_flete',                 label: 'Fletes / Transporte',              descripcion: 'Mayor valor de la compra por costo de transporte.',                pucSugerido: '525010', requerida: false },
      { clave: 'compra.cuenta_gasto_general',         label: 'Gastos Generales (fallback)',       descripcion: 'Cuenta de gasto cuando el ítem no tiene cuenta específica.',       pucSugerido: '519500', requerida: false },
    ],
  },
  {
    id: 'inventario',
    label: 'Inventarios',
    claves: [
      { clave: 'compra.cuenta_inventario_merc', label: 'Inventario — Mercancías',         descripcion: 'Cuenta 14 para mercancía en general.',           pucSugerido: '143505', requerida: true  },
      { clave: 'compra.cuenta_inventario_mp',   label: 'Inventario — Materia Prima',      descripcion: 'Cuenta 14 para materia prima.',                  pucSugerido: '145505', requerida: false },
      { clave: 'compra.cuenta_inventario_pp',   label: 'Inventario — Producto en Proceso', descripcion: 'Cuenta 14 para producto en proceso.',            pucSugerido: '146005', requerida: false },
      { clave: 'compra.cuenta_inventario_pt',   label: 'Inventario — Producto Terminado', descripcion: 'Cuenta 14 para producto terminado.',             pucSugerido: '146505', requerida: false },
      { clave: 'compra.cuenta_activo_fijo',     label: 'Activos Fijos',                   descripcion: 'Cuenta 15/16 para activos fijos comprados.',     pucSugerido: '152005', requerida: false },
    ],
  },
  {
    id: 'factura',
    label: 'Facturación de Venta',
    claves: [
      { clave: 'factura.cuenta_cartera',           label: 'Cartera / Clientes',              descripcion: 'Cuenta a debitar por ventas a crédito. (130505)',        pucSugerido: '130505', requerida: true  },
      { clave: 'factura.cuenta_ingresos_ventas',   label: 'Ingresos por Ventas',             descripcion: 'Cuenta de ingresos operacionales. (413505)',             pucSugerido: '413505', requerida: true  },
      { clave: 'factura.cuenta_iva_generado_19',   label: 'IVA Generado 19%',                descripcion: 'IVA generado en ventas gravadas al 19%. (240801)',       pucSugerido: '240801', requerida: true  },
      { clave: 'factura.cuenta_iva_generado_5',    label: 'IVA Generado 5%',                 descripcion: 'IVA generado en ventas gravadas al 5%. (240802)',        pucSugerido: '240802', requerida: false },
      { clave: 'factura.cuenta_inventario',        label: 'Salida de Inventario (crédito)',  descripcion: 'Cuenta que se acredita al hacer la salida de inventario.', pucSugerido: '143505', requerida: true  },
      { clave: 'factura.cuenta_costo_ventas',      label: 'Costo de Ventas (débito)',        descripcion: 'Cuenta de costo que se debita al vender. (613505)',      pucSugerido: '613505', requerida: true  },
      { clave: 'factura.cuenta_retefuente_ventas', label: 'Anticipo Retefuente (ventas)',    descripcion: 'Retención practicada por el cliente al pagar. (135515)', pucSugerido: '135515', requerida: false },
      { clave: 'factura.cuenta_reteica_ventas',    label: 'Anticipo Reteica (ventas)',       descripcion: 'Reteica practicada por el cliente al pagar. (135518)',   pucSugerido: '135518', requerida: false },
      { clave: 'factura.cuenta_descuento_ventas',  label: 'Descuentos Comerciales',          descripcion: 'Descuentos en factura de venta. (419505)',               pucSugerido: '419505', requerida: false },
    ],
  },
  {
    id: 'cierre',
    label: 'Cierre de Ejercicio',
    claves: [
      { clave: 'cierre.cuenta_utilidad_ejercicio', label: 'Utilidad del Ejercicio',  descripcion: 'Cuenta patrimonial donde se lleva la utilidad. (360505)',    pucSugerido: '360505', requerida: true  },
      { clave: 'cierre.cuenta_perdida_ejercicio',  label: 'Pérdida del Ejercicio',   descripcion: 'Cuenta patrimonial donde se lleva la pérdida. (361005)',     pucSugerido: '361005', requerida: false },
      { clave: 'cierre.cuenta_utilidades_ant',     label: 'Utilidades Anteriores',   descripcion: 'Cuenta de utilidades acumuladas anteriores. (370505)',       pucSugerido: '370505', requerida: false },
    ],
  },
]

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ParamEntry {
  clave:              string
  cuenta_contable_id: string | null
  descripcion:        string
  activo:             boolean
  cuenta?: { id: string; codigo: string; nombre: string } | null
}

interface CuentaContable {
  id:                 string
  codigo:             string
  nombre:             string
  acepta_movimientos?: boolean
  children?:          CuentaContable[]
}

/**
 * Aplana el árbol PUC. Si onlyLeaves=true devuelve solo las hojas con
 * acepta_movimientos=true (para el <select> de parametrización).
 * Si onlyLeaves=false devuelve todas las cuentas (para seleccionar padre al crear).
 */
function flattenTree(nodes: CuentaContable[], onlyLeaves = true): CuentaContable[] {
  const out: CuentaContable[] = []
  const walk = (arr: CuentaContable[]) => {
    for (const n of arr) {
      if (!onlyLeaves || n.acepta_movimientos) out.push(n)
      if (n.children?.length) walk(n.children)
    }
  }
  walk(nodes)
  return out.sort((a, b) => a.codigo.localeCompare(b.codigo))
}

/**
 * Dado el código sugerido (ej "220505"), encuentra la cuenta padre más profunda
 * que ya existe en el árbol. Para "220505" probaría: "2205" → "22" → "2".
 */
function encontrarPadreSugerido(codigoSugerido: string, todas: CuentaContable[]): CuentaContable | null {
  // Probar prefijos de 4, 2, 1 dígitos
  for (const len of [4, 2, 1]) {
    if (codigoSugerido.length <= len) continue
    const prefix = codigoSugerido.substring(0, len)
    const match = todas.find(c => c.codigo === prefix)
    if (match) return match
  }
  return null
}

interface Props { embedded?: boolean }

// ─── Componente ───────────────────────────────────────────────────────────────

export default function ParametrizacionContablePage({ embedded = false }: Props) {
  const [params, setParams]       = useState<Record<string, ParamEntry>>({})
  const [cuentas, setCuentas]     = useState<CuentaContable[]>([])     // solo hojas
  const [cuentasAll, setCuentasAll] = useState<CuentaContable[]>([])   // todas (para seleccionar padre)
  const [changes, setChanges] = useState<Record<string, string>>({})  // clave → cuenta_id
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState('')
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({
    compra: true, inventario: true, factura: true, cierre: false,
  })

  // ── Modal "Crear cuenta nueva" ──────────────────────────────────────────────
  const [creando, setCreando] = useState<{
    abierto: boolean
    claveOrigen: string | null
    codigo: string
    nombre: string
    parent_id: string
    parent_codigo: string
    saving: boolean
    error: string
  }>({
    abierto: false, claveOrigen: null, codigo: '', nombre: '',
    parent_id: '', parent_codigo: '', saving: false, error: '',
  })

  const base = () => `/${getTenantId()}`

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pRes, cRes] = await Promise.all([
        api.get(`${base()}/parametrizacion-contable`),
        api.get(`${base()}/cuentas-contables`),
      ])

      // Aplanar el agrupado → mapa clave → entry
      const map: Record<string, ParamEntry> = {}
      const grouped = pRes.data.data as Record<string, ParamEntry[]>
      for (const entries of Object.values(grouped)) {
        for (const e of entries) {
          map[e.clave] = e
        }
      }
      setParams(map)
      // El endpoint devuelve un árbol anidado (clase → grupo → cuenta → subcuenta).
      const arbol = cRes.data.data ?? []
      setCuentas(flattenTree(arbol, true))         // solo hojas → para <select>
      setCuentasAll(flattenTree(arbol, false))     // todas → para seleccionar padre
    } catch {
      setError('Error al cargar la parametrización.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const getValor = (clave: string): string =>
    changes[clave] ?? params[clave]?.cuenta_contable_id ?? ''

  const handleChange = (clave: string, cuentaId: string) => {
    setChanges(prev => ({ ...prev, [clave]: cuentaId }))
    setSaved(false)
  }

  const handleSave = async () => {
    if (Object.keys(changes).length === 0) return
    setSaving(true)
    setError('')
    try {
      const updates = Object.entries(changes)
        .filter(([, v]) => v !== '')
        .map(([clave, cuenta_contable_id]) => ({ clave, cuenta_contable_id }))

      await api.post(`${base()}/parametrizacion-contable/bulk`, { updates })
      setChanges({})
      setSaved(true)
      await load()
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(getErrorMessage(err) ?? 'Error al guardar.')
    } finally {
      setSaving(false)
    }
  }

  const totalChanges = Object.keys(changes).filter(k => changes[k] !== '').length

  const toggleModulo = (id: string) =>
    setOpenModules(prev => ({ ...prev, [id]: !prev[id] }))

  // ── Crear cuenta nueva desde el dropdown ────────────────────────────────────
  const abrirCrearCuenta = (info: ClaveInfo) => {
    const padre = encontrarPadreSugerido(info.pucSugerido, cuentasAll)
    // Sugerir un código que sea hijo del padre + correlativo automático
    let sugerido = info.pucSugerido
    if (padre) {
      const hijos = cuentasAll.filter(c => c.codigo.startsWith(padre.codigo) && c.codigo.length === padre.codigo.length + 2)
      if (hijos.length > 0) {
        // Tomar el siguiente correlativo libre dentro del padre
        const usados = hijos.map(c => parseInt(c.codigo.slice(-2), 10)).filter(n => !isNaN(n))
        const max = usados.length ? Math.max(...usados) : 0
        const next = String(max + 5).padStart(2, '0')   // saltos de 5 (convención PUC)
        sugerido = padre.codigo + next
      }
    }
    setCreando({
      abierto: true,
      claveOrigen: info.clave,
      codigo: sugerido,
      nombre: '',
      parent_id: padre?.id ?? '',
      parent_codigo: padre?.codigo ?? '',
      saving: false,
      error: '',
    })
  }

  const cerrarCrearCuenta = () =>
    setCreando(c => ({ ...c, abierto: false, error: '' }))

  const guardarNuevaCuenta = async () => {
    if (!creando.codigo.trim() || !creando.nombre.trim() || !creando.parent_id) {
      setCreando(c => ({ ...c, error: 'Código, nombre y padre son obligatorios.' }))
      return
    }
    setCreando(c => ({ ...c, saving: true, error: '' }))
    try {
      const res = await api.post(`${base()}/cuentas-contables`, {
        parent_id:          creando.parent_id,
        codigo:             creando.codigo.trim(),
        nombre:             creando.nombre.trim(),
        acepta_movimientos: true,   // la creamos como hoja (movimientos)
      })
      const nueva = res.data.data
      // Refrescar el árbol y seleccionar automáticamente la cuenta recién creada
      await load()
      if (creando.claveOrigen) {
        setChanges(prev => ({ ...prev, [creando.claveOrigen!]: nueva.id }))
      }
      setCreando(c => ({ ...c, abierto: false, saving: false }))
    } catch (err) {
      const data = getAxiosErrorData(err)?.data
      const msg = data?.message
        ?? Object.values((data?.errors as Record<string, unknown>) ?? {}).flat().join(' · ')
        ?? 'Error al crear la cuenta.'
      setCreando(c => ({ ...c, saving: false, error: msg }))
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
        <Loader2 size={28} className="spinner" style={{ margin: '0 auto' }} />
      </div>
    )
  }

  return (
    <div style={embedded ? {} : { padding: '28px 32px', maxWidth: 960, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Parametrización Contable</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Define qué cuenta PUC afecta cada módulo. Equivale a "Parámetros → Cuentas Contables" de SIIGO.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving || totalChanges === 0}
          style={{ minWidth: 140 }}
        >
          {saving
            ? <Loader2 size={15} className="spinner" />
            : saved
              ? <CheckCircle2 size={15} />
              : <Save size={15} />
          }
          {saving ? 'Guardando...' : saved ? '¡Guardado!' : `Guardar${totalChanges > 0 ? ` (${totalChanges})` : ''}`}
        </button>
      </div>

      {error && (
        <div className="alert alert-error" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Módulos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {MODULOS.map(modulo => {
          const isOpen = openModules[modulo.id] ?? false
          const pendientesModulo = modulo.claves.filter(c => changes[c.clave]).length

          return (
            <div key={modulo.id} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-xl)',
              overflow: 'hidden',
            }}>
              {/* Header módulo */}
              <button
                type="button"
                onClick={() => toggleModulo(modulo.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '14px 20px', background: 'var(--bg-surface)',
                  borderBottom: isOpen ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span style={{ fontWeight: 700, fontSize: '0.92rem', flex: 1 }}>
                  {modulo.label}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {modulo.claves.length} parámetros
                </span>
                {pendientesModulo > 0 && (
                  <span style={{
                    background: 'var(--accent)', color: '#fff',
                    borderRadius: 10, padding: '1px 8px', fontSize: '0.72rem', fontWeight: 700,
                  }}>
                    {pendientesModulo} cambios
                  </span>
                )}
              </button>

              {/* Tabla de claves */}
              {isOpen && (
                <div style={{ padding: '8px 0' }}>
                  {modulo.claves.map((info, idx) => {
                    const actual = params[info.clave]
                    const valor  = getValor(info.clave)
                    const modificado = Boolean(changes[info.clave])

                    return (
                      <div key={info.clave} style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 300px',
                        gap: 16,
                        alignItems: 'center',
                        padding: '10px 20px',
                        borderBottom: idx < modulo.claves.length - 1 ? '1px solid var(--border)' : 'none',
                        background: modificado ? 'rgba(99,102,241,0.04)' : 'transparent',
                      }}>
                        {/* Descripción */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                              {info.label}
                            </span>
                            {info.requerida && (
                              <span style={{
                                fontSize: '0.65rem', color: '#ef4444',
                                background: 'rgba(239,68,68,0.1)',
                                borderRadius: 4, padding: '1px 5px',
                              }}>requerida</span>
                            )}
                            {modificado && (
                              <span style={{
                                fontSize: '0.65rem', color: 'var(--accent)',
                                background: 'rgba(99,102,241,0.12)',
                                borderRadius: 4, padding: '1px 5px',
                              }}>modificado</span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {info.descripcion}
                          </div>
                          {actual?.cuenta && !modificado && (
                            <div style={{
                              fontSize: '0.72rem', color: 'var(--accent)',
                              marginTop: 3, fontFamily: 'monospace',
                            }}>
                              {actual.cuenta.codigo} — {actual.cuenta.nombre}
                            </div>
                          )}
                        </div>

                        {/* Selector de cuenta + botón crear nueva */}
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <select
                            className="input"
                            style={{ fontSize: '0.82rem', flex: 1, minWidth: 0 }}
                            value={valor}
                            onChange={e => handleChange(info.clave, e.target.value)}
                          >
                            <option value="">
                              {actual?.cuenta
                                ? `${actual.cuenta.codigo} — ${actual.cuenta.nombre}`
                                : `— Sugerido: ${info.pucSugerido} —`}
                            </option>
                            {cuentas.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.codigo} — {c.nombre}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => abrirCrearCuenta(info)}
                            title="Crear cuenta nueva en el PUC"
                            style={{
                              flexShrink: 0,
                              width: 32, height: 32,
                              borderRadius: 'var(--radius)',
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border)',
                              color: 'var(--accent)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = 'var(--accent)'
                              e.currentTarget.style.color = '#fff'
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'var(--bg-surface)'
                              e.currentTarget.style.color = 'var(--accent)'
                            }}
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Modal: Crear cuenta nueva ──────────────────────────────────────── */}
      {creando.abierto && (
        <div
          onClick={cerrarCrearCuenta}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)', zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border)',
              width: '100%', maxWidth: 520, padding: 24,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                  Crear cuenta nueva en el PUC
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Se creará como cuenta hija de <strong>{creando.parent_codigo || '—'}</strong> y
                  podrás seleccionarla inmediatamente.
                </p>
              </div>
              <button
                onClick={cerrarCrearCuenta}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', padding: 4,
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Padre */}
              <div className="input-group">
                <label>Cuenta padre *</label>
                <select
                  className="input"
                  value={creando.parent_id}
                  onChange={e => {
                    const sel = cuentasAll.find(c => c.id === e.target.value)
                    setCreando(c => ({
                      ...c,
                      parent_id: e.target.value,
                      parent_codigo: sel?.codigo ?? '',
                    }))
                  }}
                >
                  <option value="">— Selecciona la cuenta padre —</option>
                  {cuentasAll
                    .filter(c => c.codigo.length <= 4)  // mostrar clase, grupo, cuenta (no subcuentas)
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {c.codigo} — {c.nombre}
                      </option>
                    ))}
                </select>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Solo se muestran clases (1 díg), grupos (2 díg) y cuentas (4 díg).
                  La cuenta nueva será subcuenta o auxiliar.
                </p>
              </div>

              {/* Código */}
              <div className="input-group">
                <label>Código *</label>
                <input
                  type="text"
                  className="input"
                  value={creando.codigo}
                  onChange={e => setCreando(c => ({ ...c, codigo: e.target.value.replace(/\D/g, '') }))}
                  placeholder="Ej: 11050510"
                  maxLength={12}
                />
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Debe empezar con el código del padre. Subcuenta = 6 dígitos · Auxiliar = 8+ dígitos.
                </p>
              </div>

              {/* Nombre */}
              <div className="input-group">
                <label>Nombre *</label>
                <input
                  type="text"
                  className="input"
                  value={creando.nombre}
                  onChange={e => setCreando(c => ({ ...c, nombre: e.target.value }))}
                  placeholder="Ej: Bancolombia Cta. Cte. 12345678"
                  maxLength={150}
                />
              </div>

              {creando.error && (
                <div style={{
                  padding: 10, borderRadius: 'var(--radius)',
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                  color: '#fca5a5', fontSize: '0.8rem',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <AlertCircle size={14} /> {creando.error}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button className="btn btn-secondary" onClick={cerrarCrearCuenta} disabled={creando.saving}>
                  Cancelar
                </button>
                <button className="btn btn-primary" onClick={guardarNuevaCuenta} disabled={creando.saving}>
                  {creando.saving
                    ? <Loader2 size={14} className="spinner" />
                    : <><Plus size={14} /> Crear y asignar</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer con resumen de cambios */}
      {totalChanges > 0 && (
        <div style={{
          position: 'sticky', bottom: 16, marginTop: 20,
          background: 'var(--bg-card)', border: '1px solid var(--accent)',
          borderRadius: 'var(--radius-xl)', padding: '14px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 4px 24px rgba(99,102,241,0.15)',
        }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--accent)' }}>{totalChanges}</strong> parámetro{totalChanges !== 1 ? 's' : ''} modificado{totalChanges !== 1 ? 's' : ''} sin guardar
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => setChanges({})}>
              Descartar
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 size={14} className="spinner" /> : <Save size={14} />}
              Guardar cambios
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
