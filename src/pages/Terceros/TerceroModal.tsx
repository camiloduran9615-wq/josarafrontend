import { useState, useEffect } from 'react'
import { X, Search, Building2, MapPin, CreditCard, MessageSquare } from 'lucide-react'
import { tercerosService, type Tercero } from '@/services/terceros.service'
import { getAxiosErrorData } from '@/lib/errors'
import MunicipioAutocomplete from '@/components/MunicipioAutocomplete'

interface TerceroModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  tercero?: Tercero | null
}

const DOCUMENT_TYPES = [
  { id: '13', name: 'Cédula de ciudadanía' },
  { id: '31', name: 'NIT' },
  { id: '41', name: 'Pasaporte' },
  { id: '42', name: 'Identificación extranjero' },
]

const FISCAL_RESPONSIBILITIES = [
  { id: 'O-13', name: 'Gran contribuyente' },
  { id: 'O-15', name: 'Autorretenedor' },
  { id: 'O-23', name: 'Agente de retención IVA' },
  { id: 'O-47', name: 'Régimen simple de tributación' },
  { id: 'R-99-PN', name: 'No responsable (Persona Natural)' },
]

const REGIMEN_IVA = ['Común', 'Simplificado', 'No responsable']

const emptyForm = {
  tipo_persona: 'Persona Natural',
  organizacion_juridica_id: '2',
  identificacion_documento_id: '13',
  identificacion: '',
  dv: '',
  sucursal: '0',
  nombres: '',
  apellidos: '',
  razon_social: '',
  nombre_comercial: '',
  direccion: '',
  email: '',
  telefono: '',
  municipio_id: '',
  codigo_postal: '',
  regimen_iva: 'No responsable',
  responsabilidades_fiscales: ['R-99-PN'] as string[],
  codigo_ciiu: '',
  nombre_contacto: '',
  observaciones: '',
  es_cliente: true,
  es_proveedor: false,
  es_empleado: false,
}

export default function TerceroModal({ isOpen, onClose, onSuccess, tercero }: TerceroModalProps) {
  const [loading, setLoading] = useState(false)
  const [searchingDian, setSearchingDian] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState<typeof emptyForm & Record<string, unknown>>({ ...emptyForm })

  useEffect(() => {
    if (tercero) {
      // Backend devuelve `null` para campos vacíos (observaciones, nombres, etc.) —
      // React requiere string en inputs/textareas controlados. Normalizamos null→''.
      const normalizado = Object.fromEntries(
        Object.entries(tercero as unknown as Record<string, unknown>).map(([k, v]) =>
          [k, v === null ? '' : v]
        ),
      )
      setFormData({
        ...emptyForm,
        ...normalizado,
        dv: tercero.dv ?? '',
        sucursal: tercero.sucursal ?? '0',
        organizacion_juridica_id: tercero.organizacion_juridica_id ?? '2',
        responsabilidades_fiscales: tercero.responsabilidades_fiscales || ['R-99-PN'],
      })
    } else {
      setFormData({ ...emptyForm })
    }
    setError('')
  }, [tercero, isOpen])

  const set = (patch: Record<string, unknown>) => setFormData(prev => ({ ...prev, ...patch }))

  const toggleResponsibility = (id: string) =>
    set({
      responsabilidades_fiscales: formData.responsabilidades_fiscales.includes(id)
        ? formData.responsabilidades_fiscales.filter((r: string) => r !== id)
        : [...formData.responsabilidades_fiscales, id],
    })

  const handleSearchDian = async () => {
    if (!formData.identificacion) return
    try {
      setSearchingDian(true)
      const res = await tercerosService.searchDian(formData.identificacion_documento_id, formData.identificacion)
      if (res.success && res.data) {
        set({ razon_social: res.data.name || formData.razon_social, email: res.data.email || formData.email })
      }
    } catch {
      setError('No se encontraron datos en la DIAN.')
    } finally {
      setSearchingDian(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = { ...formData }
      if (payload.tipo_persona === 'Persona Natural' && !payload.razon_social) {
        payload.razon_social = [payload.nombres, payload.apellidos].filter(Boolean).join(' ')
      }
      if (!payload.razon_social) {
        setError('Ingresa el nombre o razón social del tercero.')
        setLoading(false)
        return
      }
      if (tercero) {
        await tercerosService.update(tercero.id, payload)
      } else {
        await tercerosService.create(payload)
      }
      onSuccess()
      onClose()
    } catch (err) {
      const data = getAxiosErrorData(err)?.data
      if (data?.errors) {
        const first = Object.values(data.errors as Record<string, string[]>)[0]
        setError(Array.isArray(first) ? first[0] : String(first))
      } else {
        setError(data?.message || 'Error al guardar el tercero')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" style={{ padding: '20px', alignItems: 'center' }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-card)',
        width: '100%',
        maxWidth: '920px',
        height: 'calc(100vh - 40px)',
        maxHeight: '820px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '24px 28px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              {tercero ? <Edit2 size={22} /> : <PlusCircle size={22} />}
              {tercero ? 'Editar Tercero' : 'Crear un Tercero'}
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Completa la información tributaria y de contacto siguiendo el estándar DIAN.
            </p>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* Tipo de Tercero */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 28, padding: '12px 28px',
            background: 'rgba(99,102,241,0.05)', borderBottom: '1px solid var(--border)', flexShrink: 0,
          }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-light)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Tipo de Tercero:
            </span>
            {[
              { key: 'es_cliente',   label: 'Clientes' },
              { key: 'es_proveedor', label: 'Proveedores' },
              { key: 'es_empleado',  label: 'Otros (Empleados/Bancos)' },
            ].map(t => (
              <label key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}>
                <input
                  type="checkbox"
                  className="checkbox-accent"
                  checked={formData[t.key] as boolean}
                  onChange={e => set({ [t.key]: e.target.checked })}
                />
                {t.label}
              </label>
            ))}
          </div>

          {/* Scrollable body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 28 }}>

            {error && <div className="alert alert-error">{error}</div>}

            {/* SECCIÓN 1: DATOS BÁSICOS */}
            <section>
              <SectionTitle icon={<Building2 size={15} />} label="Datos Básicos" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 1fr auto', gap: 12, marginBottom: 12 }}>
                <div className="input-group" style={{ margin: 0 }}>
                  <label>Tipo de Persona</label>
                  <select className="input" value={formData.tipo_persona} onChange={e => set({
                    tipo_persona: e.target.value,
                    organizacion_juridica_id: e.target.value === 'Persona Jurídica' ? '1' : '2',
                  })}>
                    <option value="Persona Natural">Persona Natural</option>
                    <option value="Persona Jurídica">Persona Jurídica</option>
                  </select>
                </div>
                <div className="input-group" style={{ margin: 0 }}>
                  <label>Tipo identificación</label>
                  <select className="input" value={formData.identificacion_documento_id} onChange={e => set({ identificacion_documento_id: e.target.value })}>
                    {DOCUMENT_TYPES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="input-group" style={{ margin: 0 }}>
                  <label>Identificación</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input type="text" className="input" required value={formData.identificacion} onChange={e => set({ identificacion: e.target.value })} />
                    <button type="button" onClick={handleSearchDian} className="btn-icon btn-icon-secondary" title="Buscar en DIAN" disabled={searchingDian}>
                      <Search size={14} />
                    </button>
                  </div>
                </div>
                <div className="input-group" style={{ margin: 0 }}>
                  <label>DV / Suc.</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input type="text" className="input" style={{ width: 60, textAlign: 'center' }} placeholder="DV" maxLength={1} value={formData.dv} onChange={e => set({ dv: e.target.value })} />
                    <input type="text" className="input" style={{ width: 60, textAlign: 'center' }} placeholder="Suc" value={formData.sucursal} onChange={e => set({ sucursal: e.target.value })} />
                  </div>
                </div>
              </div>

              {formData.tipo_persona === 'Persona Natural' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label>Nombres *</label>
                    <input type="text" className="input" required value={formData.nombres} onChange={e => set({ nombres: e.target.value })} />
                  </div>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label>Apellidos *</label>
                    <input type="text" className="input" required value={formData.apellidos} onChange={e => set({ apellidos: e.target.value })} />
                  </div>
                </div>
              ) : (
                <div className="input-group" style={{ margin: 0 }}>
                  <label>Razón Social *</label>
                  <input type="text" className="input" required value={formData.razon_social} onChange={e => set({ razon_social: e.target.value })} />
                </div>
              )}
            </section>

            {/* SECCIÓN 2+3: Ubicación y Datos Fiscales */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
              <section>
                <SectionTitle icon={<MapPin size={15} />} label="Ubicación y Contacto" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label>Dirección</label>
                    <input type="text" className="input" value={formData.direccion} onChange={e => set({ direccion: e.target.value })} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="input-group" style={{ margin: 0 }}>
                      <label>Municipio (DANE)</label>
                      <MunicipioAutocomplete
                        value={formData.municipio_id ?? ''}
                        onChange={(codigo) => set({ municipio_id: codigo })}
                        placeholder="Ej: Garzón, Bogotá, Cali..."
                      />
                    </div>
                    <div className="input-group" style={{ margin: 0 }}>
                      <label>Código Postal</label>
                      <input type="text" className="input" value={formData.codigo_postal} onChange={e => set({ codigo_postal: e.target.value })} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="input-group" style={{ margin: 0 }}>
                      <label>Email Facturación</label>
                      <input type="email" className="input" value={formData.email} onChange={e => set({ email: e.target.value })} />
                    </div>
                    <div className="input-group" style={{ margin: 0 }}>
                      <label>Teléfono</label>
                      <input type="text" className="input" value={formData.telefono} onChange={e => set({ telefono: e.target.value })} />
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <SectionTitle icon={<CreditCard size={15} />} label="Datos Fiscales" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label>Tipo de régimen IVA</label>
                    <select className="input" value={formData.regimen_iva} onChange={e => set({ regimen_iva: e.target.value })}>
                      {REGIMEN_IVA.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label>Responsabilidad fiscal (RUT)</label>
                    <div style={{
                      background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)', padding: '10px 14px',
                      display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 160, overflowY: 'auto',
                    }}>
                      {FISCAL_RESPONSIBILITIES.map(r => (
                        <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <input
                            type="checkbox"
                            className="checkbox-accent"
                            checked={formData.responsabilidades_fiscales.includes(r.id)}
                            onChange={() => toggleResponsibility(r.id)}
                          />
                          <span>{r.id} — {r.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Código CIIU — actividad económica (Resolución DIAN 000139/2012) */}
                  <div className="input-group" style={{ marginTop: 12 }}>
                    <label>
                      Código CIIU{' '}
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                        (actividad económica — 4 dígitos)
                      </span>
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Ej: 4690 (Comercio al por mayor)"
                      value={formData.codigo_ciiu ?? ''}
                      onChange={e => set({ codigo_ciiu: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                      maxLength={4}
                      pattern="[0-9]{4}"
                    />
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      Obligatorio para facturación electrónica DIAN e Información Exógena.{' '}
                      <a
                        href="https://www.dian.gov.co/dian/aspectoseconomicos/Documents/Resolucion_000139_de_21-11-2012.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--accent)' }}
                      >
                        Ver listado completo CIIU Rev. 4
                      </a>
                    </p>
                  </div>
                </div>
              </section>
            </div>

            {/* SECCIÓN 4: Observaciones */}
            <section>
              <SectionTitle icon={<MessageSquare size={15} />} label="Información Adicional" />
              <div className="input-group" style={{ margin: 0 }}>
                <label>Observaciones / Notas</label>
                <textarea
                  className="input"
                  style={{ minHeight: 80, resize: 'vertical' }}
                  placeholder="Escribe notas internas sobre este tercero..."
                  value={formData.observaciones}
                  onChange={e => set({ observaciones: e.target.value })}
                />
              </div>
            </section>
          </div>

          {/* Footer */}
          <div style={{
            flexShrink: 0, padding: '16px 28px', borderTop: '1px solid var(--border)',
            background: 'var(--bg-surface)', display: 'flex', justifyContent: 'flex-end', gap: 12,
          }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ minWidth: 120 }}>Cancelar</button>
            <button type="submit" className="btn btn-primary" style={{ minWidth: 160 }} disabled={loading}>
              {loading
                ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Guardando...</>
                : (tercero ? 'Actualizar Cambios' : 'Guardar Tercero')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <span style={{ color: 'var(--accent)' }}>{icon}</span>
      <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-light)' }}>
        {label}
      </span>
    </div>
  )
}

const PlusCircle = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
  </svg>
)
const Edit2 = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
  </svg>
)
