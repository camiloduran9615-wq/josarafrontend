import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Loader2, Pencil, Plus, Save, ShieldCheck, Trash2, X } from 'lucide-react'
import { api, getTenantId } from '@/lib/api'
import { extractApiError } from '@/lib/errors'
import type { PaymentMethod, PaymentTerm } from '@/services/paymentConfiguration.service'

type Account = { id: string; codigo: string; nombre: string; activo: boolean; acepta_movimientos: boolean }
type Rule = {
  id: string; payment_term_id: string | null; payment_method_id: string | null
  operation_type: 'sale' | 'purchase'; account_role: AccountRole
  accounting_account_id: string; priority: number; effective_from: string | null
  effective_to: string | null; is_active: boolean
  term?: Pick<PaymentTerm, 'id' | 'code' | 'name'> | null
  method?: Pick<PaymentMethod, 'id' | 'code' | 'name'> | null
  account?: Account
}
type AccountRole = 'CASH' | 'BANK' | 'CUSTOMER_ADVANCES' | 'SUPPLIER_ADVANCES' | 'PAYMENT_GATEWAY_RECEIVABLE' | 'BANK_FEES' | 'FINANCIAL_DISCOUNTS' | 'SURCHARGES' | 'ROUNDING_DIFFERENCES' | 'CLEARING_ACCOUNT'
type RulePayload = Omit<Rule, 'id' | 'term' | 'method' | 'account'>

const roleLabels: Record<AccountRole, string> = {
  CASH: 'Caja', BANK: 'Banco', CUSTOMER_ADVANCES: 'Anticipos de clientes',
  SUPPLIER_ADVANCES: 'Anticipos a proveedores', PAYMENT_GATEWAY_RECEIVABLE: 'Cuenta por cobrar a pasarela',
  BANK_FEES: 'Comisiones bancarias', FINANCIAL_DISCOUNTS: 'Descuentos financieros',
  SURCHARGES: 'Recargos', ROUNDING_DIFFERENCES: 'Diferencias de redondeo', CLEARING_ACCOUNT: 'Cuenta puente',
}
const roles = Object.keys(roleLabels) as AccountRole[]
const flattenAccounts = (items: (Account & { children?: Account[] })[]): Account[] => items.flatMap(item => [item, ...flattenAccounts(item.children ?? [])])
const emptyRule = (): RulePayload => ({
  payment_term_id: null, payment_method_id: null, operation_type: 'purchase',
  account_role: 'BANK', accounting_account_id: '', priority: 100,
  effective_from: null, effective_to: null, is_active: true,
})

export default function PaymentAccountingRulesPanel({ terms, methods }: { terms: PaymentTerm[]; methods: PaymentMethod[] }) {
  const [rules, setRules] = useState<Rule[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Rule | null | undefined>(undefined)
  const [form, setForm] = useState<RulePayload>(emptyRule())
  const base = `/${getTenantId()}`

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [rulesResponse, accountsResponse] = await Promise.all([
        api.get(`${base}/payment-accounting-rules`), api.get(`${base}/cuentas-contables`),
      ])
      setRules(rulesResponse.data.data ?? [])
      setAccounts(flattenAccounts(accountsResponse.data.data ?? []).filter(account => account.activo && account.acepta_movimientos))
    } catch (err) { setError(extractApiError(err, 'No fue posible cargar las reglas contables.')) }
    finally { setLoading(false) }
  }, [base])

  useEffect(() => { load() }, [load])

  const open = (rule?: Rule) => {
    setEditing(rule ?? null)
    setForm(rule ? {
      payment_term_id: rule.payment_term_id, payment_method_id: rule.payment_method_id,
      operation_type: rule.operation_type, account_role: rule.account_role,
      accounting_account_id: rule.accounting_account_id, priority: rule.priority,
      effective_from: rule.effective_from, effective_to: rule.effective_to, is_active: rule.is_active,
    } : emptyRule())
  }

  const save = async () => {
    if (!form.payment_term_id && !form.payment_method_id) return setError('Selecciona una condición o un medio de pago.')
    if (!form.accounting_account_id) return setError('Selecciona una cuenta contable de movimiento.')
    setSaving(true); setError('')
    try {
      if (editing?.id) await api.put(`${base}/payment-accounting-rules/${editing.id}`, form)
      else await api.post(`${base}/payment-accounting-rules`, form)
      setEditing(undefined); await load()
    } catch (err) { setError(extractApiError(err, 'No fue posible guardar la regla.')) }
    finally { setSaving(false) }
  }

  const deactivate = async (rule: Rule) => {
    try { await api.delete(`${base}/payment-accounting-rules/${rule.id}`); await load() }
    catch (err) { setError(extractApiError(err)) }
  }

  if (loading) return <div className="p-8 flex justify-center gap-2"><Loader2 className="animate-spin" /> Cargando reglas…</div>

  return <>
    <div className="flex items-center justify-between mb-4">
      <div><h3 className="flex items-center gap-2"><ShieldCheck size={20} /> Reglas contables</h3><p className="text-muted">Define la cuenta operativa afectada por cada medio o condición.</p></div>
      <button className="btn btn-primary" onClick={() => open()}><Plus size={16} /> Nueva regla</button>
    </div>
    {error && <div className="alert alert-error mb-4 flex gap-2"><AlertCircle size={16} /> {error}</div>}
    <div className="card overflow-hidden"><table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr>{['Operación', 'Contexto', 'Rol', 'Cuenta PUC', 'Prioridad', 'Vigencia', 'Estado', ''].map(label => <th key={label} style={{ padding: 12, textAlign: 'left' }}>{label}</th>)}</tr></thead>
      <tbody>{rules.length === 0 ? <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No hay reglas específicas. Se utilizarán las cuentas maestras existentes.</td></tr> : rules.map(rule => <tr key={rule.id} style={{ borderTop: '1px solid var(--border)' }}>
        <td style={{ padding: 12 }}>{rule.operation_type === 'purchase' ? 'Compra' : 'Venta'}</td>
        <td>{[rule.term?.name, rule.method?.name].filter(Boolean).join(' / ')}</td><td>{roleLabels[rule.account_role]}</td>
        <td>{rule.account ? `${rule.account.codigo} — ${rule.account.nombre}` : 'Cuenta no disponible'}</td><td>{rule.priority}</td>
        <td>{rule.effective_from || 'Sin inicio'} → {rule.effective_to || 'Sin fin'}</td><td>{rule.is_active ? 'Activa' : 'Inactiva'}</td>
        <td className="flex gap-2"><button className="btn btn-secondary btn-sm" onClick={() => open(rule)}><Pencil size={14} /></button>{rule.is_active && <button className="btn btn-secondary btn-sm" onClick={() => deactivate(rule)}><Trash2 size={14} /></button>}</td>
      </tr>)}</tbody>
    </table></div>

    {editing !== undefined && <div className="modal-overlay"><div className="modal-content" style={{ maxWidth: 760 }}>
      <div className="modal-header"><h2>{editing ? 'Editar' : 'Crear'} regla contable</h2><button className="modal-close" onClick={() => setEditing(undefined)}><X /></button></div>
      <div className="modal-body"><div className="form-grid">
        <label className="input-group">Operación<select className="input" value={form.operation_type} onChange={event => setForm({ ...form, operation_type: event.target.value as RulePayload['operation_type'] })}><option value="purchase">Compra</option><option value="sale">Venta</option></select></label>
        <label className="input-group">Rol contable<select className="input" value={form.account_role} onChange={event => setForm({ ...form, account_role: event.target.value as AccountRole })}>{roles.map(role => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label>
        <label className="input-group">Condición (opcional)<select className="input" value={form.payment_term_id ?? ''} onChange={event => setForm({ ...form, payment_term_id: event.target.value || null })}><option value="">Todas / no aplica</option>{terms.map(term => <option key={term.id} value={term.id}>{term.name}</option>)}</select></label>
        <label className="input-group">Medio (opcional)<select className="input" value={form.payment_method_id ?? ''} onChange={event => setForm({ ...form, payment_method_id: event.target.value || null })}><option value="">Todos / no aplica</option>{methods.map(method => <option key={method.id} value={method.id}>{method.name}</option>)}</select></label>
        <label className="input-group" style={{ gridColumn: '1 / -1' }}>Cuenta PUC de movimiento<select className="input" value={form.accounting_account_id} onChange={event => setForm({ ...form, accounting_account_id: event.target.value })}><option value="">Selecciona una cuenta…</option>{accounts.map(account => <option key={account.id} value={account.id}>{account.codigo} — {account.nombre}</option>)}</select></label>
        <label className="input-group">Prioridad<input className="input" type="number" min={1} max={1000} value={form.priority} onChange={event => setForm({ ...form, priority: Number(event.target.value) })} /></label>
        <span />
        <label className="input-group">Vigente desde<input className="input" type="date" value={form.effective_from ?? ''} onChange={event => setForm({ ...form, effective_from: event.target.value || null })} /></label>
        <label className="input-group">Vigente hasta<input className="input" type="date" value={form.effective_to ?? ''} min={form.effective_from ?? undefined} onChange={event => setForm({ ...form, effective_to: event.target.value || null })} /></label>
      </div></div>
      <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setEditing(undefined)}>Cancelar</button><button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Guardar</button></div>
    </div></div>}
  </>
}
