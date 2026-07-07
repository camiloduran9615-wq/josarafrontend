import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { getErrorMessage } from '@/lib/errors'
import { getTenantId } from '@/services/auth.service'
import { Package, Plus, Calculator, Loader2 } from 'lucide-react'
import CuentaAutocomplete from '@/components/CuentaAutocomplete'
import TerceroAutocomplete from '@/components/TerceroAutocomplete'
import { Modal } from '@/components/ui'

type ActivoFijo = {
  id: string
  codigo: string
  descripcion: string
  categoria: string
  costo_adquisicion: number | string
  fecha_adquisicion: string
  vida_util_meses: number
  valor_residual: number | string
  depreciacion_acumulada: number | string
  valor_neto: number
  depreciacion_mensual: number
  estado: string
  ultima_depreciacion: string | null
  cuenta_activo: string | null
  cuenta_depreciacion: string | null
  cuenta_gasto: string | null
}

type FormaPagoActivo = 'contado_banco' | 'contado_caja' | 'credito'

type DepreciacionResult = {
  activos_procesados: number
  activos_saltados: number
  total_depreciado: number | string
  asiento_id?: string | null
}

const CATEGORIAS = [
  { value: 'edificios',        label: 'Edificios' },
  { value: 'equipo_oficina',   label: 'Equipo de Oficina' },
  { value: 'vehiculos',        label: 'Vehículos' },
  { value: 'muebles_enseres',  label: 'Muebles y Enseres' },
  { value: 'equipo_computo',   label: 'Equipo de Cómputo' },
  { value: 'maquinaria',       label: 'Maquinaria' },
]

export default function ActivosFijosPage() {
  const tenant = getTenantId()

  const [activos, setActivos] = useState<ActivoFijo[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showDepreciar, setShowDepreciar] = useState(false)

  const fetchActivos = useCallback(async () => {
    if (!tenant) return
    setLoading(true)
    try {
      const res = await api.get(`/${tenant}/activos-fijos`)
      setActivos(res.data?.data ?? [])
    } catch (err) {
      alert('Error: ' + getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [tenant])

  useEffect(() => {
    queueMicrotask(fetchActivos)
  }, [fetchActivos])

  if (!tenant) return <div className="page-container">Sin sesión activa</div>

  const totalActivos = activos.length
  const valorTotalNeto = activos.reduce((acc, a) => acc + parseFloat(String(a.valor_neto || 0)), 0)
  const depMensualTotal = activos
    .filter(a => a.estado === 'activo')
    .reduce((acc, a) => acc + parseFloat(String(a.depreciacion_mensual || 0)), 0)

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Package size={28} className="text-accent" />
            Activos Fijos (PPE - NIC 16)
          </h1>
          <p className="page-subtitle">
            Registro de propiedad, planta y equipo, con depreciacion mensual por linea recta.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => setShowDepreciar(true)}>
            <Calculator size={18} /> Depreciar mes
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={18} /> Nuevo activo
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="fixed-assets-metrics">
        <div className="card fixed-assets-metric">
          <div className="fixed-assets-metric__label">Total activos</div>
          <div className="fixed-assets-metric__value">{totalActivos}</div>
        </div>
        <div className="card fixed-assets-metric">
          <div className="fixed-assets-metric__label">Valor neto contable</div>
          <div className="fixed-assets-metric__value">${fmt(valorTotalNeto)}</div>
        </div>
        <div className="card fixed-assets-metric">
          <div className="fixed-assets-metric__label">Depreciacion mensual</div>
          <div className="fixed-assets-metric__value tone-info">${fmt(depMensualTotal)}</div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
      ) : (
        <div className="card fixed-assets-table-card">
          <div className="table-wrapper">
            <table className="table fixed-assets-table">
              <thead>
                <tr>
                  <th>Codigo</th>
                  <th>Descripcion</th>
                  <th>Categoria</th>
                  <th className="text-right">Costo</th>
                  <th className="text-right p-2 font-semibold uppercase text-xs tracking-wide">Dep. acum.</th>
                  <th className="text-right p-2 font-semibold uppercase text-xs tracking-wide">Valor neto</th>
                  <th className="text-right p-2 font-semibold uppercase text-xs tracking-wide">Dep. mensual</th>
                  <th className="text-left p-2 font-semibold uppercase text-xs tracking-wide">Estado</th>
                </tr>
              </thead>
              <tbody>
                {activos.map(a => (
                  <tr key={a.id}>
                    <td className="fixed-assets-code">{a.codigo}</td>
                    <td>{a.descripcion}</td>
                    <td>{labelCategoria(a.categoria)}</td>
                    <td className="fixed-assets-money">${fmt(a.costo_adquisicion)}</td>
                    <td className="fixed-assets-money">${fmt(a.depreciacion_acumulada)}</td>
                    <td className="fixed-assets-money strong">${fmt(a.valor_neto)}</td>
                    <td className="fixed-assets-money tone-info">${fmt(a.depreciacion_mensual)}</td>
                    <td><EstadoBadge estado={a.estado} /></td>
                  </tr>
                ))}
                {activos.length === 0 && (
                  <tr><td colSpan={8} className="empty-state">
                    Sin activos fijos registrados. Crea el primero.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && (
        <ModalCrearActivo
          tenant={tenant}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchActivos() }}
        />
      )}

      {showDepreciar && (
        <ModalDepreciar
          tenant={tenant}
          onClose={() => setShowDepreciar(false)}
          onSuccess={() => { setShowDepreciar(false); fetchActivos() }}
        />
      )}
    </div>
  )
}

// ─── Modal Crear ───────────────────────────────────────────────────────────

function ModalCrearActivo({
  tenant, onClose, onCreated,
}: { tenant: string; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    codigo: '',
    descripcion: '',
    categoria: 'equipo_computo',
    costo_adquisicion: '',
    fecha_adquisicion: new Date().toISOString().slice(0, 10),
    vida_util_meses: 36,
    valor_residual: '0',
    cuenta_activo_id: '',
    cuenta_depreciacion_acumulada_id: '',
    cuenta_gasto_depreciacion_id: '',
    // ── Asiento de adquisición (FEAT-AV) ────────────────────────────────
    generar_asiento_compra: true,
    forma_pago: 'contado_banco' as FormaPagoActivo,
    aplicar_iva: true,
    tarifa_iva: 19,
    tercero_id: '',
  })
  const [saving, setSaving] = useState(false)

  // Cálculo en vivo del total con IVA
  const costoNum = parseFloat(form.costo_adquisicion || '0') || 0
  const ivaCalc  = form.aplicar_iva ? costoNum * (form.tarifa_iva / 100) : 0
  const totalAdq = costoNum + ivaCalc

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.generar_asiento_compra && form.forma_pago === 'credito' && !form.tercero_id) {
      alert('Si la forma de pago es crédito, debes seleccionar un proveedor.')
      return
    }
    setSaving(true)
    try {
      await api.post(`/${tenant}/activos-fijos`, form)
      onCreated()
    } catch (err) {
      alert('Error: ' + getErrorMessage(err))
    } finally { setSaving(false) }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Nuevo Activo Fijo"
      description="Registra el activo y, si aplica, genera el asiento contable de adquisicion."
      size="lg"
    >
        <form onSubmit={submit} className="fixed-assets-form">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Codigo *" value={form.codigo}
                   onChange={v => setForm({...form, codigo: v})} required />
            <Select label="Categoria *" value={form.categoria}
                    onChange={v => setForm({...form, categoria: v})}
                    options={CATEGORIAS} />
          </div>
          <Input label="Descripcion *" value={form.descripcion}
                 onChange={v => setForm({...form, descripcion: v})} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Costo adquisicion *" type="number" value={form.costo_adquisicion}
                   onChange={v => setForm({...form, costo_adquisicion: v})} required />
            <Input label="Fecha adquisicion *" type="date" value={form.fecha_adquisicion}
                   onChange={v => setForm({...form, fecha_adquisicion: v})} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Vida util (meses) *" type="number" value={String(form.vida_util_meses)}
                   onChange={v => setForm({...form, vida_util_meses: parseInt(v || '0', 10)})} required />
            <Input label="Valor residual" type="number" value={form.valor_residual}
                   onChange={v => setForm({...form, valor_residual: v})} />
          </div>
          <div className="input-group">
            <label>Cuenta del activo (152x / 153x / 154x) *</label>
            <CuentaAutocomplete
              value={form.cuenta_activo_id}
              onChange={(id) => setForm({...form, cuenta_activo_id: id})}
              placeholder="Buscar por código o nombre…"
              prefixFilter={['15']}
            />
          </div>
          <div className="input-group">
            <label>Cuenta depreciacion acumulada (159x) *</label>
            <CuentaAutocomplete
              value={form.cuenta_depreciacion_acumulada_id}
              onChange={(id) => setForm({...form, cuenta_depreciacion_acumulada_id: id})}
              placeholder="Buscar por código o nombre…"
              prefixFilter={['159']}
            />
          </div>
          <div className="input-group">
            <label>Cuenta gasto depreciacion (516x) *</label>
            <CuentaAutocomplete
              value={form.cuenta_gasto_depreciacion_id}
              onChange={(id) => setForm({...form, cuenta_gasto_depreciacion_id: id})}
              placeholder="Buscar por código o nombre…"
              prefixFilter={['516']}
            />
          </div>

          {/* ──── Asiento de Adquisición (FEAT-AV) ──────────────────── */}
          <div className="fixed-assets-acquisition">
            <label className="fixed-assets-checkbox">
              <input
                type="checkbox"
                checked={form.generar_asiento_compra}
                onChange={(e) => setForm({...form, generar_asiento_compra: e.target.checked})}
              />
              Generar asiento contable de adquisicion
            </label>
            <p className="fixed-assets-help">
              Crea automaticamente el asiento de compra del activo (D cuenta activo + IVA / C banco-caja-proveedor).
            </p>

            {form.generar_asiento_compra && (
              <div className="fixed-assets-acquisition-panel">
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Forma de pago"
                    value={form.forma_pago}
                    onChange={(v) => setForm({...form, forma_pago: v as FormaPagoActivo})}
                    options={[
                      { value: 'contado_banco', label: 'Contado - Banco' },
                      { value: 'contado_caja',  label: 'Contado - Caja' },
                      { value: 'credito',       label: 'Credito (Proveedor)' },
                    ]}
                  />
                  <Input
                    label="Tarifa IVA (%)"
                    type="number"
                    value={String(form.tarifa_iva)}
                    onChange={(v) => setForm({...form, tarifa_iva: parseFloat(v) || 0})}
                  />
                </div>

                <label className="fixed-assets-checkbox compact">
                  <input
                    type="checkbox"
                    checked={form.aplicar_iva}
                    onChange={(e) => setForm({...form, aplicar_iva: e.target.checked})}
                  />
                  Aplicar IVA descontable (cta 240810)
                </label>

                {form.forma_pago === 'credito' && (
                  <div className="input-group">
                    <label>Proveedor *</label>
                    <TerceroAutocomplete
                      value={form.tercero_id}
                      onChange={(id) => setForm({...form, tercero_id: id})}
                    />
                  </div>
                )}

                {/* Preview del asiento */}
                <div className="fixed-assets-preview">
                  <div className="fixed-assets-preview__title">VISTA PREVIA DEL ASIENTO:</div>
                  <div>D 15xxxx Activo (costo)              ${costoNum.toLocaleString('es-CO')}</div>
                  {form.aplicar_iva && ivaCalc > 0 && (
                    <div>D 240810 IVA Descontable             ${ivaCalc.toLocaleString('es-CO')}</div>
                  )}
                  <div>C {
                    form.forma_pago === 'contado_caja'  ? '110505 Caja General' :
                    form.forma_pago === 'credito'       ? '220505 Proveedores' :
                                                          '111005 Bancos'
                  }              ${totalAdq.toLocaleString('es-CO')}</div>
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer fixed-assets-form-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : 'Crear'}
            </button>
          </div>
        </form>
    </Modal>
  )
}

// ─── Modal Depreciar ───────────────────────────────────────────────────────

function ModalDepreciar({
  tenant, onClose,
}: { tenant: string; onClose: () => void; onSuccess: () => void }) {
  const today = new Date()
  const [anio, setAnio] = useState(today.getFullYear())
  const [mes, setMes]   = useState(today.getMonth() + 1)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<DepreciacionResult | null>(null)

  const ejecutar = async () => {
    setRunning(true)
    setResult(null)
    try {
      const res = await api.post(`/${tenant}/activos-fijos/depreciar/${anio}/${mes}`)
      setResult(res.data?.data ?? null)
    } catch (err) {
      alert('Error: ' + getErrorMessage(err))
    } finally { setRunning(false) }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Depreciacion Mensual"
      description="Aplica la depreciacion lineal del mes y genera el asiento contable consolidado."
      size="sm"
      footer={(
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
          <button className="btn btn-primary" onClick={ejecutar} disabled={running}>
            {running ? <Loader2 size={16} className="animate-spin" /> : <Calculator size={16} />}
            Ejecutar depreciacion
          </button>
        </>
      )}
    >
        <div className="fixed-assets-form">
          <p className="fixed-assets-help">
            Aplica la depreciacion lineal del mes a todos los activos en estado <code>activo</code>.
            Genera UN asiento contable consolidado.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Año" type="number" value={String(anio)} onChange={v => setAnio(parseInt(v, 10))} />
            <div className="input-group">
              <label>Mes</label>
              <select
                className="input"
                value={mes}
                onChange={e => setMes(parseInt(e.target.value, 10))}
              >
                {Array.from({length: 12}, (_, i) => i+1).map(m => (
                  <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                ))}
              </select>
            </div>
          </div>

          {result && (
            <div className="fixed-assets-result">
              <div>Activos procesados: <strong>{result.activos_procesados}</strong></div>
              <div>Activos saltados: <strong>{result.activos_saltados}</strong></div>
              <div>Total depreciado: <strong>${fmt(result.total_depreciado)}</strong></div>
              {result.asiento_id && (
                <div>Asiento generado: <code>{result.asiento_id}</code></div>
              )}
            </div>
          )}
        </div>
    </Modal>
  )
}

// ─── Componentes auxiliares ────────────────────────────────────────────────

function fmt(v: unknown): string {
  const n = parseFloat(String(v ?? 0))
  if (isNaN(n)) return '0'
  return n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function labelCategoria(cat: string): string {
  return CATEGORIAS.find(c => c.value === cat)?.label ?? cat
}

function EstadoBadge({ estado }: { estado: string }) {
  const cls = estado === 'activo' ? 'badge-success'
            : estado === 'vendido' ? 'badge-info'
            : 'badge-muted'
  return <span className={`badge ${cls}`}>{estado}</span>
}

function Input({
  label, value, onChange, type = 'text', required = false,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean;
}) {
  return (
    <div className="input-group">
      <label>{label}</label>
      <input
        type={type}
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </div>
  )
}

function Select({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="input-group">
      <label>{label}</label>
      <select
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
