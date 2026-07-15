import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Banknote, Loader2, Pencil, Plus, Save, X } from 'lucide-react'
import { extractApiError } from '@/lib/errors'
import {
  paymentConfigurationService,
  type PaymentMethod,
  type PaymentMethodPayload,
  type PaymentTerm,
  type PaymentTermPayload,
} from '@/services/paymentConfiguration.service'
import PaymentAccountingRulesPanel from './PaymentAccountingRulesPanel'

interface Props { embedded?: boolean }
type Editor = { kind: 'term'; value?: PaymentTerm } | { kind: 'method'; value?: PaymentMethod } | null

const termPayload = (term?: PaymentTerm): PaymentTermPayload => ({
  code: term?.code ?? '', name: term?.name ?? '', description: term?.description ?? '',
  timing: term?.timing ?? 'immediate', default_credit_days: term?.default_credit_days ?? 0,
  maximum_installments: term?.maximum_installments ?? 1,
  allows_partial_payment: term?.allows_partial_payment ?? false,
  allows_mixed_payment: term?.allows_mixed_payment ?? false,
  applies_to_sales: term?.applies_to_sales ?? true,
  applies_to_purchases: term?.applies_to_purchases ?? true,
  requires_due_date: term?.requires_due_date ?? false,
  is_active: term?.is_active ?? true, display_order: term?.display_order ?? 100,
  method_ids: term?.methods?.map(method => method.id) ?? [],
})

const methodPayload = (method?: PaymentMethod): PaymentMethodPayload => ({
  code: method?.code ?? '', name: method?.name ?? '', description: method?.description ?? '',
  type: method?.type ?? 'other', dian_code: method?.dian_code ?? '',
  requires_cash_account: method?.requires_cash_account ?? false,
  requires_bank_account: method?.requires_bank_account ?? false,
  requires_reference: method?.requires_reference ?? false,
  allows_sales: method?.allows_sales ?? true, allows_purchases: method?.allows_purchases ?? true,
  is_active: method?.is_active ?? true, display_order: method?.display_order ?? 100,
})

export default function PaymentConfigurationPage({ embedded }: Props) {
  const [terms, setTerms] = useState<PaymentTerm[]>([])
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [tab, setTab] = useState<'terms' | 'methods' | 'rules'>('terms')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editor, setEditor] = useState<Editor>(null)
  const [termForm, setTermForm] = useState<PaymentTermPayload>(termPayload())
  const [methodForm, setMethodForm] = useState<PaymentMethodPayload>(methodPayload())

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [loadedTerms, loadedMethods] = await Promise.all([
        paymentConfigurationService.terms(), paymentConfigurationService.methods(),
      ])
      setTerms(loadedTerms); setMethods(loadedMethods)
    } catch (err) { setError(extractApiError(err, 'No fue posible cargar las formas de pago.')) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const openTerm = (value?: PaymentTerm) => { setTermForm(termPayload(value)); setEditor({ kind: 'term', value }) }
  const openMethod = (value?: PaymentMethod) => { setMethodForm(methodPayload(value)); setEditor({ kind: 'method', value }) }

  const save = async () => {
    if (!editor) return
    setSaving(true); setError('')
    try {
      if (editor.kind === 'term') await paymentConfigurationService.saveTerm(termForm, editor.value?.id)
      else await paymentConfigurationService.saveMethod(methodForm, editor.value?.id)
      setEditor(null); await load()
    } catch (err) { setError(extractApiError(err, 'No fue posible guardar la configuración.')) }
    finally { setSaving(false) }
  }

  const toggle = async (kind: 'term' | 'method', id: string, active: boolean) => {
    try {
      if (kind === 'term') await paymentConfigurationService.termStatus(id, active)
      else await paymentConfigurationService.methodStatus(id, active)
      await load()
    } catch (err) { setError(extractApiError(err)) }
  }

  if (loading) return <div className="card p-10 flex justify-center gap-3"><Loader2 className="animate-spin" /> Cargando formas de pago…</div>

  return <div className={embedded ? '' : 'page-container'}>
    <div className="flex items-center justify-between mb-5">
      <div>
        <h2 className="page-title flex items-center gap-2"><Banknote size={24} /> Formas de pago</h2>
        <p className="page-subtitle">Configura cuándo y cómo se pagan las compras y ventas de esta empresa.</p>
      </div>
      {tab !== 'rules' && <button className="btn btn-primary" onClick={() => tab === 'terms' ? openTerm() : openMethod()}><Plus size={16} /> Nuevo</button>}
    </div>
    {error && <div className="alert alert-error mb-4 flex gap-2"><AlertCircle size={16} />{error}</div>}
    <div className="flex gap-2 mb-4">
      <button className={`btn ${tab === 'terms' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('terms')}>Condiciones de pago</button>
      <button className={`btn ${tab === 'methods' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('methods')}>Medios de pago</button>
      <button className={`btn ${tab === 'rules' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('rules')}>Reglas contables</button>
    </div>
    {tab !== 'rules' && <div className="card overflow-hidden">
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>{(tab === 'terms' ? ['Código', 'Nombre', 'Condición', 'Aplicación', 'Estado', ''] : ['Código', 'Nombre', 'Tipo', 'Código DIAN', 'Estado', '']).map(h => <th key={h} style={{ padding: 12, textAlign: 'left' }}>{h}</th>)}</tr></thead>
        <tbody>{tab === 'terms' ? terms.map(term => <tr key={term.id} style={{ borderTop: '1px solid var(--border)' }}>
          <td style={{ padding: 12 }}><strong>{term.code}</strong></td><td>{term.name}</td>
          <td>{term.timing === 'credit' ? `Crédito · ${term.default_credit_days} días` : 'Contado'}</td>
          <td>{[term.applies_to_sales && 'Ventas', term.applies_to_purchases && 'Compras'].filter(Boolean).join(' / ')}</td>
          <td><button className={`btn btn-sm ${term.is_active ? 'btn-primary' : 'btn-secondary'}`} onClick={() => toggle('term', term.id, !term.is_active)}>{term.is_active ? 'Activa' : 'Inactiva'}</button></td>
          <td><button className="btn btn-secondary btn-sm" onClick={() => openTerm(term)}><Pencil size={14} /></button></td>
        </tr>) : methods.map(method => <tr key={method.id} style={{ borderTop: '1px solid var(--border)' }}>
          <td style={{ padding: 12 }}><strong>{method.code}</strong></td><td>{method.name}</td><td>{method.type}</td><td>{method.dian_code || '—'}</td>
          <td><button className={`btn btn-sm ${method.is_active ? 'btn-primary' : 'btn-secondary'}`} onClick={() => toggle('method', method.id, !method.is_active)}>{method.is_active ? 'Activo' : 'Inactivo'}</button></td>
          <td><button className="btn btn-secondary btn-sm" onClick={() => openMethod(method)}><Pencil size={14} /></button></td>
        </tr>)}</tbody>
      </table>
    </div>}
    {tab === 'rules' && <PaymentAccountingRulesPanel terms={terms} methods={methods} />}

    {editor && <div className="modal-overlay"><div className="modal modal-md">
      <div className="modal-header"><h2 className="modal-title">{editor.value ? 'Editar' : 'Crear'} {editor.kind === 'term' ? 'condición' : 'medio'} de pago</h2><button type="button" className="btn-icon" aria-label="Cerrar modal" onClick={() => setEditor(null)}><X size={18} /></button></div>
      <div className="modal-body">
        {editor.kind === 'term' ? <div className="form-grid">
          <label className="input-group">Código<input className="input" value={termForm.code} onChange={e => setTermForm({ ...termForm, code: e.target.value })} /></label>
          <label className="input-group">Nombre<input className="input" value={termForm.name} onChange={e => setTermForm({ ...termForm, name: e.target.value })} /></label>
          <label className="input-group">Condición<select className="input" value={termForm.timing} onChange={e => setTermForm({ ...termForm, timing: e.target.value as 'immediate' | 'credit', requires_due_date: e.target.value === 'credit' })}><option value="immediate">Contado</option><option value="credit">Crédito</option></select></label>
          <label className="input-group">Días de crédito<input className="input" type="number" min={0} value={termForm.default_credit_days} onChange={e => setTermForm({ ...termForm, default_credit_days: Number(e.target.value) })} /></label>
          <label><input type="checkbox" checked={termForm.applies_to_sales} onChange={e => setTermForm({ ...termForm, applies_to_sales: e.target.checked })} /> Aplica a ventas</label>
          <label><input type="checkbox" checked={termForm.applies_to_purchases} onChange={e => setTermForm({ ...termForm, applies_to_purchases: e.target.checked })} /> Aplica a compras</label>
          <label><input type="checkbox" checked={termForm.allows_partial_payment} onChange={e => setTermForm({ ...termForm, allows_partial_payment: e.target.checked })} /> Permite pagos parciales</label>
          <div style={{ gridColumn: '1 / -1' }}><strong>Medios permitidos</strong><div className="flex flex-wrap gap-3 mt-2">{methods.filter(m => m.is_active).map(method => <label key={method.id}><input type="checkbox" checked={termForm.method_ids.includes(method.id)} onChange={e => setTermForm({ ...termForm, method_ids: e.target.checked ? [...termForm.method_ids, method.id] : termForm.method_ids.filter(id => id !== method.id) })} /> {method.name}</label>)}</div></div>
        </div> : <div className="form-grid">
          <label className="input-group">Código<input className="input" value={methodForm.code} onChange={e => setMethodForm({ ...methodForm, code: e.target.value })} /></label>
          <label className="input-group">Nombre<input className="input" value={methodForm.name} onChange={e => setMethodForm({ ...methodForm, name: e.target.value })} /></label>
          <label className="input-group">Tipo<select className="input" value={methodForm.type} onChange={e => setMethodForm({ ...methodForm, type: e.target.value as PaymentMethodPayload['type'] })}>{['cash','bank','card','check','advance','compensation','other'].map(type => <option key={type} value={type}>{type}</option>)}</select></label>
          <label className="input-group">Código DIAN<input className="input" value={methodForm.dian_code ?? ''} onChange={e => setMethodForm({ ...methodForm, dian_code: e.target.value })} /></label>
          <label><input type="checkbox" checked={methodForm.requires_reference} onChange={e => setMethodForm({ ...methodForm, requires_reference: e.target.checked })} /> Requiere referencia</label>
          <label><input type="checkbox" checked={methodForm.requires_cash_account} onChange={e => setMethodForm({ ...methodForm, requires_cash_account: e.target.checked, requires_bank_account: e.target.checked ? false : methodForm.requires_bank_account })} /> Requiere caja</label>
          <label><input type="checkbox" checked={methodForm.requires_bank_account} onChange={e => setMethodForm({ ...methodForm, requires_bank_account: e.target.checked, requires_cash_account: e.target.checked ? false : methodForm.requires_cash_account })} /> Requiere banco</label>
          <label><input type="checkbox" checked={methodForm.allows_sales} onChange={e => setMethodForm({ ...methodForm, allows_sales: e.target.checked })} /> Ventas</label>
          <label><input type="checkbox" checked={methodForm.allows_purchases} onChange={e => setMethodForm({ ...methodForm, allows_purchases: e.target.checked })} /> Compras</label>
        </div>}
      </div>
      <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setEditor(null)}>Cancelar</button><button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Guardar</button></div>
    </div></div>}
  </div>
}
