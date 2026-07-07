import { useCallback, useEffect, useState } from 'react'
import {
  Target, Plus, X, Loader2, AlertCircle, Phone,
  Mail, ArrowRight, CheckCircle2, XCircle,
} from 'lucide-react'
import { api } from '@/lib/api'
import { extractApiError } from '@/lib/errors'
import { getTenantId } from '@/services/auth.service'
import { Modal } from '@/components/ui'

const fmt = (n: number) =>
  Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })

type Tab = 'pipeline' | 'prospectos'
type EtapaTone = 'muted' | 'info' | 'warning' | 'emphasis' | 'success' | 'danger'

interface Prospecto {
  id: string
  razon_social: string
  contacto_nombre?: string
  contacto_email?: string
  contacto_telefono?: string
  ciudad?: string
  sector?: string
  fuente?: string
  estado: string
}

interface Oportunidad {
  id: string
  nombre: string
  etapa: string
  valor_estimado: number
  probabilidad: number
  fecha_cierre_esperada?: string
  notas?: string
}

const ETAPAS: Array<{ id: string; label: string; tone: EtapaTone }> = [
  { id: 'prospecto',        label: 'Prospecto',   tone: 'muted' },
  { id: 'calificado',       label: 'Calificado',  tone: 'info' },
  { id: 'propuesta',        label: 'Propuesta',   tone: 'warning' },
  { id: 'negociacion',      label: 'Negociacion', tone: 'emphasis' },
  { id: 'cerrado_ganado',   label: 'Ganado',      tone: 'success' },
  { id: 'cerrado_perdido',  label: 'Perdido',     tone: 'danger' },
]

const probTone = (p: number) =>
  p >= 75 ? 'success' : p >= 40 ? 'warning' : 'danger'

const estadoBadge = (estado: string) => {
  if (estado === 'activo') return 'badge-success'
  if (estado === 'convertido') return 'badge-info'
  return 'badge-danger'
}

export default function CrmPage() {
  const [tab, setTab] = useState<Tab>('pipeline')
  const [oportunidades, setOp] = useState<Oportunidad[]>([])
  const [prospectos, setProspectos] = useState<Prospecto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showNuevaOp, setShowNuevaOp] = useState(false)
  const [showNuevoPros, setShowNuevoPros] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formOp, setFormOp] = useState({ nombre: '', valor_estimado: '', probabilidad: '50', fecha_cierre_esperada: '', etapa: 'prospecto' })
  const [formPros, setFormPros] = useState({ razon_social: '', contacto_nombre: '', contacto_email: '', contacto_telefono: '', ciudad: '', sector: '', fuente: 'referido' })

  const T = getTenantId()

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (tab === 'pipeline') {
        const r = await api.get(`/${T}/oportunidades`)
        setOp(r.data.data ?? [])
      } else {
        const r = await api.get(`/${T}/prospectos`)
        setProspectos(r.data.data ?? [])
      }
    } catch (err: unknown) {
      setError(extractApiError(err, 'Error cargando datos de CRM.'))
    } finally {
      setLoading(false)
    }
  }, [T, tab])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
  }, [fetchData])

  const moverEtapa = async (id: string, etapa: string) => {
    try {
      await api.put(`/${T}/oportunidades/${id}/etapa`, { etapa })
      setOp(ops => ops.map(o => o.id === id ? { ...o, etapa } : o))
    } catch (err: unknown) {
      setError(extractApiError(err, 'No se pudo actualizar la etapa.'))
    }
  }

  const guardarOportunidad = async () => {
    setSaving(true)
    setError('')
    try {
      await api.post(`/${T}/oportunidades`, {
        ...formOp,
        valor_estimado: Number(formOp.valor_estimado) || 0,
        probabilidad: Number(formOp.probabilidad) || 50,
      })
      await fetchData()
      setShowNuevaOp(false)
      setFormOp({ nombre: '', valor_estimado: '', probabilidad: '50', fecha_cierre_esperada: '', etapa: 'prospecto' })
    } catch (err: unknown) {
      setError(extractApiError(err, 'Error guardando la oportunidad.'))
    } finally {
      setSaving(false)
    }
  }

  const guardarProspecto = async () => {
    setSaving(true)
    setError('')
    try {
      await api.post(`/${T}/prospectos`, formPros)
      await fetchData()
      setShowNuevoPros(false)
      setFormPros({ razon_social: '', contacto_nombre: '', contacto_email: '', contacto_telefono: '', ciudad: '', sector: '', fuente: 'referido' })
    } catch (err: unknown) {
      setError(extractApiError(err, 'Error guardando el prospecto.'))
    } finally {
      setSaving(false)
    }
  }

  const descartarProspecto = async (id: string) => {
    try {
      await api.put(`/${T}/prospectos/${id}`, { estado: 'descartado' })
      setProspectos(ps => ps.map(p => p.id === id ? { ...p, estado: 'descartado' } : p))
    } catch (err: unknown) {
      setError(extractApiError(err, 'No se pudo descartar el prospecto.'))
    }
  }

  const opPorEtapa = (etapaId: string) => oportunidades.filter(o => o.etapa === etapaId)
  const totalPipeline = oportunidades
    .filter(o => !['cerrado_perdido'].includes(o.etapa))
    .reduce((s, o) => s + Number(o.valor_estimado), 0)

  return (
    <div className="crm-page page-container">
      <div className="page-header crm-header">
        <div className="crm-title-row">
          <div className="crm-icon">
            <Target size={20} aria-hidden="true" />
          </div>
          <div>
            <h1 className="page-title">CRM</h1>
            <p className="page-subtitle">Pipeline de ventas - ${fmt(totalPipeline)} en oportunidades activas</p>
          </div>
        </div>
        <button
          onClick={() => tab === 'pipeline' ? setShowNuevaOp(true) : setShowNuevoPros(true)}
          className="btn btn-primary"
        >
          <Plus size={14} /> {tab === 'pipeline' ? 'Nueva oportunidad' : 'Nuevo prospecto'}
        </button>
      </div>

      {error && (
        <div className="alert alert-error crm-alert">
          <AlertCircle size={16} />{error}
          <button onClick={() => setError('')} className="btn-icon" aria-label="Cerrar alerta">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="crm-tabs" role="tablist" aria-label="Vistas de CRM">
        {(['pipeline', 'prospectos'] as Tab[]).map(id => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? 'active' : ''}
            onClick={() => setTab(id)}
          >
            {id === 'pipeline' ? 'Pipeline Kanban' : 'Prospectos'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card crm-loading">
          <Loader2 size={18} className="animate-spin" />Cargando...
        </div>
      ) : (
        <>
          {tab === 'pipeline' && (
            <div className="crm-kanban" aria-label="Pipeline de oportunidades">
              {ETAPAS.map(etapa => {
                const cards = opPorEtapa(etapa.id)
                const total = cards.reduce((s, o) => s + Number(o.valor_estimado), 0)
                return (
                  <section key={etapa.id} className={`crm-stage ${etapa.tone}`}>
                    <div className="crm-stage-header">
                      <span>{etapa.label}</span>
                      <small>{cards.length} - ${fmt(total)}</small>
                    </div>
                    <div className="crm-stage-list">
                      {cards.map(op => (
                        <article key={op.id} className="crm-opportunity-card">
                          <p>{op.nombre}</p>
                          <strong>${fmt(op.valor_estimado)}</strong>
                          <div className="crm-opportunity-footer">
                            <span className={`crm-probability tone-${probTone(op.probabilidad)}`}>
                              {op.probabilidad}%
                            </span>
                            <div className="crm-card-actions">
                              {etapa.id !== 'cerrado_ganado' && etapa.id !== 'cerrado_perdido' && (
                                <>
                                  <button
                                    onClick={() => moverEtapa(op.id, 'cerrado_ganado')}
                                    title="Marcar ganado"
                                    aria-label={`Marcar ${op.nombre} como ganado`}
                                    className="btn-icon"
                                  >
                                    <CheckCircle2 size={12} className="tone-success" />
                                  </button>
                                  <button
                                    onClick={() => moverEtapa(op.id, 'cerrado_perdido')}
                                    title="Marcar perdido"
                                    aria-label={`Marcar ${op.nombre} como perdido`}
                                    className="btn-icon"
                                  >
                                    <XCircle size={12} className="tone-danger" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      const idx = ETAPAS.findIndex(e => e.id === etapa.id)
                                      const next = ETAPAS[idx + 1]
                                      if (next && next.id !== 'cerrado_ganado' && next.id !== 'cerrado_perdido') {
                                        moverEtapa(op.id, next.id)
                                      }
                                    }}
                                    title="Avanzar etapa"
                                    aria-label={`Avanzar etapa de ${op.nombre}`}
                                    className="btn-icon"
                                  >
                                    <ArrowRight size={12} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </article>
                      ))}
                      {cards.length === 0 && (
                        <p className="crm-stage-empty">Sin oportunidades</p>
                      )}
                    </div>
                  </section>
                )
              })}
            </div>
          )}

          {tab === 'prospectos' && (
            <div className="card crm-table-card">
              <table className="table crm-table">
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Contacto</th>
                    <th>Ciudad / Sector</th>
                    <th>Fuente</th>
                    <th className="text-center">Estado</th>
                    <th className="text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {prospectos.map(p => (
                    <tr key={p.id} className={p.estado === 'descartado' ? 'crm-row-muted' : ''}>
                      <td className="crm-company">{p.razon_social}</td>
                      <td>
                        <p className="crm-contact-name">{p.contacto_nombre ?? '-'}</p>
                        <div className="crm-contact-links">
                          {p.contacto_email && <span><Mail size={10} />{p.contacto_email}</span>}
                          {p.contacto_telefono && <span><Phone size={10} />{p.contacto_telefono}</span>}
                        </div>
                      </td>
                      <td className="crm-muted-cell">{p.ciudad} {p.sector ? `- ${p.sector}` : ''}</td>
                      <td className="crm-muted-cell capitalize">{p.fuente ?? '-'}</td>
                      <td className="text-center">
                        <span className={`badge ${estadoBadge(p.estado)}`}>
                          {p.estado}
                        </span>
                      </td>
                      <td className="text-center">
                        {p.estado === 'activo' && (
                          <button onClick={() => descartarProspecto(p.id)}
                            className="btn-icon" title="Descartar" aria-label={`Descartar ${p.razon_social}`}>
                            <X size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {prospectos.length === 0 && (
                    <tr><td colSpan={6} className="crm-empty-cell">No hay prospectos</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <Modal
        open={showNuevaOp}
        onClose={() => setShowNuevaOp(false)}
        title="Nueva oportunidad"
        size="md"
        footer={(
          <>
            <button type="button" onClick={() => setShowNuevaOp(false)} className="btn btn-secondary">Cancelar</button>
            <button type="button" onClick={guardarOportunidad} disabled={saving} className="btn btn-primary">
              {saving ? <Loader2 size={14} className="animate-spin" /> : null} Guardar
            </button>
          </>
        )}
      >
        <div className="crm-form">
          <div className="input-group">
            <label>Nombre de la oportunidad</label>
            <input value={formOp.nombre} onChange={e => setFormOp(f => ({ ...f, nombre: e.target.value }))}
              className="input" placeholder="Ej: Implementacion ERP - Cliente ABC" />
          </div>
          <div className="crm-form-grid two">
            <div className="input-group">
              <label>Valor estimado ($)</label>
              <input type="number" min="0" value={formOp.valor_estimado}
                onChange={e => setFormOp(f => ({ ...f, valor_estimado: e.target.value }))}
                className="input" />
            </div>
            <div className="input-group">
              <label>Probabilidad (%)</label>
              <input type="number" min="0" max="100" value={formOp.probabilidad}
                onChange={e => setFormOp(f => ({ ...f, probabilidad: e.target.value }))}
                className="input" />
            </div>
          </div>
          <div className="crm-form-grid two">
            <div className="input-group">
              <label>Etapa inicial</label>
              <select value={formOp.etapa} onChange={e => setFormOp(f => ({ ...f, etapa: e.target.value }))}
                className="input">
                {ETAPAS.slice(0, 4).map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label>Cierre esperado</label>
              <input type="date" value={formOp.fecha_cierre_esperada}
                onChange={e => setFormOp(f => ({ ...f, fecha_cierre_esperada: e.target.value }))}
                className="input" />
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={showNuevoPros}
        onClose={() => setShowNuevoPros(false)}
        title="Nuevo prospecto"
        size="md"
        footer={(
          <>
            <button type="button" onClick={() => setShowNuevoPros(false)} className="btn btn-secondary">Cancelar</button>
            <button type="button" onClick={guardarProspecto} disabled={saving} className="btn btn-primary">
              {saving ? <Loader2 size={14} className="animate-spin" /> : null} Guardar
            </button>
          </>
        )}
      >
        <div className="crm-form">
          <div className="input-group">
            <label>Razon social / Empresa</label>
            <input value={formPros.razon_social} onChange={e => setFormPros(f => ({ ...f, razon_social: e.target.value }))}
              className="input" />
          </div>
          <div className="crm-form-grid two">
            <div className="input-group">
              <label>Nombre contacto</label>
              <input value={formPros.contacto_nombre} onChange={e => setFormPros(f => ({ ...f, contacto_nombre: e.target.value }))}
                className="input" />
            </div>
            <div className="input-group">
              <label>Telefono</label>
              <input value={formPros.contacto_telefono} onChange={e => setFormPros(f => ({ ...f, contacto_telefono: e.target.value }))}
                className="input" />
            </div>
          </div>
          <div className="input-group">
            <label>Email</label>
            <input type="email" value={formPros.contacto_email} onChange={e => setFormPros(f => ({ ...f, contacto_email: e.target.value }))}
              className="input" />
          </div>
          <div className="crm-form-grid three">
            <div className="input-group">
              <label>Ciudad</label>
              <input value={formPros.ciudad} onChange={e => setFormPros(f => ({ ...f, ciudad: e.target.value }))}
                className="input" />
            </div>
            <div className="input-group">
              <label>Sector</label>
              <input value={formPros.sector} onChange={e => setFormPros(f => ({ ...f, sector: e.target.value }))}
                className="input" />
            </div>
            <div className="input-group">
              <label>Fuente</label>
              <select value={formPros.fuente} onChange={e => setFormPros(f => ({ ...f, fuente: e.target.value }))}
                className="input">
                {['referido', 'web', 'evento', 'llamada_fria', 'redes_sociales'].map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
