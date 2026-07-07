import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '@/lib/api'
import { getErrorMessage } from '@/lib/errors'
import { getTenantId } from '@/services/auth.service'
import {
  Settings, Save, Loader2, CheckCircle2,
  ImagePlus, Trash2, Building2, UploadCloud,
} from 'lucide-react'

// ── Tipos ──────────────────────────────────────────────────────────────────
interface ConfigData {
  company_name:    string
  company_nit:     string
  company_address: string
  company_city:    string
  company_phone:   string
  company_logo:    string | null
}

// ── Helpers ────────────────────────────────────────────────────────────────
const ACCEPTED = 'image/png,image/jpeg,image/webp,image/svg+xml'
const MAX_MB   = 2

function validateFile(file: File): string | null {
  const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
  if (!validTypes.includes(file.type)) return 'Solo se aceptan PNG, JPG, WebP o SVG.'
  if (file.size > MAX_MB * 1024 * 1024) return `El archivo supera los ${MAX_MB} MB.`
  return null
}

// Agrega un ?v=timestamp para forzar recarga en el navegador
function bustCache(url: string | null): string | null {
  if (!url) return null
  return `${url}?v=${Date.now()}`
}

// ── Componente principal ───────────────────────────────────────────────────
export default function ConfigPage({ embedded = false }: { embedded?: boolean }) {
  const [fetching, setFetching]     = useState(true)
  const [saving, setSaving]         = useState(false)
  const [message, setMessage]       = useState('')
  const [error, setError]           = useState('')

  const [formData, setFormData] = useState<Omit<ConfigData, 'company_logo'>>({
    company_name:    '',
    company_nit:     '',
    company_address: '',
    company_city:    '',
    company_phone:   '',
  })

  // Logo
  const [logoUrl, setLogoUrl]       = useState<string | null>(null)
  const [logoLoading, setLogoLoading] = useState(false)
  const [logoError, setLogoError]   = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Carga inicial ─────────────────────────────────────────────────────────
  useEffect(() => { fetchConfig() }, [])

  const fetchConfig = async () => {
    try {
      setFetching(true)
      const res = await api.get<{ success: boolean; data: ConfigData }>(
        `/${getTenantId()}/configs`
      )
      if (res.data.success) {
        const { company_logo, ...rest } = res.data.data
        setFormData(rest)
        setLogoUrl(company_logo ?? null)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setFetching(false)
    }
  }

  // ── Guardar datos de empresa ──────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    try {
      await api.post(`/${getTenantId()}/configs`, formData)
      setMessage('¡Configuración guardada con éxito!')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      console.error(err)
      setError('Error al guardar la configuración.')
    } finally {
      setSaving(false)
    }
  }

  // ── Subir logo ────────────────────────────────────────────────────────────
  const uploadFile = useCallback(async (file: File) => {
    const validationError = validateFile(file)
    if (validationError) { setLogoError(validationError); return }

    setLogoLoading(true)
    setLogoError('')

    const form = new FormData()
    form.append('logo', file)

    try {
      const res = await api.post<{ success: boolean; data: { company_logo: string } }>(
        `/${getTenantId()}/configs/logo`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      if (res.data.success) {
        setLogoUrl(bustCache(res.data.data.company_logo))
      }
    } catch (err) {
      setLogoError(getErrorMessage(err) ?? 'Error al subir el logo.')
    } finally {
      setLogoLoading(false)
      // Resetear el input para permitir volver a seleccionar el mismo archivo
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
  }

  // ── Eliminar logo ─────────────────────────────────────────────────────────
  const handleDeleteLogo = async () => {
    if (!confirm('¿Eliminar el logo de la empresa?')) return
    setLogoLoading(true)
    setLogoError('')
    try {
      await api.delete(`/${getTenantId()}/configs/logo`)
      setLogoUrl(null)
    } catch (err) {
      setLogoError(getErrorMessage(err) ?? 'Error al eliminar el logo.')
    } finally {
      setLogoLoading(false)
    }
  }

  // ── Drag & Drop ───────────────────────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }
  const handleDragLeave = () => setIsDragging(false)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (fetching) return <div className="spinner-center"><span className="spinner" /></div>

  return (
    <div className={embedded ? '' : 'page-container'}>
      {!embedded && (
        <div className="page-header">
          <div>
            <h1 className="page-title flex items-center gap-3">
              <Settings size={28} className="text-accent" />
              Configuración de Empresa
            </h1>
            <p className="page-subtitle">
              Personaliza los datos legales que aparecerán en tus facturas y certificados.
            </p>
          </div>
        </div>
      )}

      <div className="card" style={{ maxWidth: 640 }}>
        {/* ── Sección Logo ─────────────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 12,
          }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Logo de la Empresa
            </label>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              PNG, JPG, WebP o SVG · máx. {MAX_MB} MB
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
            {/* Zona de preview / drag&drop */}
            <div
              role="button"
              aria-label="Subir logo"
              tabIndex={0}
              onClick={() => !logoLoading && fileInputRef.current?.click()}
              onKeyDown={e => e.key === 'Enter' && !logoLoading && fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                position: 'relative',
                width: 128, height: 128,
                borderRadius: 'var(--radius)',
                border: isDragging
                  ? '2px dashed var(--accent)'
                  : logoUrl
                    ? '1px solid var(--border)'
                    : '2px dashed var(--border)',
                background: isDragging
                  ? 'color-mix(in srgb, var(--accent) 8%, var(--bg-surface))'
                  : 'var(--bg-surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: logoLoading ? 'default' : 'pointer',
                overflow: 'hidden',
                transition: 'border-color 0.15s, background 0.15s',
                flexShrink: 0,
              }}
            >
              {logoLoading ? (
                /* Spinner de carga */
                <span className="spinner" style={{ width: 28, height: 28 }} />
              ) : logoUrl ? (
                /* Preview actual */
                <>
                  <img
                    src={logoUrl}
                    alt="Logo de la empresa"
                    style={{
                      width: '100%', height: '100%',
                      objectFit: 'contain',
                      padding: 8,
                    }}
                  />
                  {/* Overlay hover */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(0,0,0,0.45)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: 4,
                    opacity: 0,
                    transition: 'opacity 0.15s',
                    color: '#fff', fontSize: '0.72rem', fontWeight: 600,
                  }}
                    className="logo-overlay"
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                  >
                    <UploadCloud size={20} />
                    Cambiar
                  </div>
                </>
              ) : (
                /* Placeholder sin logo */
                <div style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 8,
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}>
                  <Building2 size={36} strokeWidth={1.2} />
                  <span style={{ fontSize: '0.7rem', textAlign: 'center', lineHeight: 1.3 }}>
                    Arrastra o<br />haz clic
                  </span>
                </div>
              )}
            </div>

            {/* Botones y texto informativo */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem' }}
                onClick={() => fileInputRef.current?.click()}
                disabled={logoLoading}
              >
                <ImagePlus size={16} />
                {logoUrl ? 'Cambiar logo' : 'Subir logo'}
              </button>

              {logoUrl && (
                <button
                  type="button"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: '0.82rem', fontWeight: 500,
                    color: '#ef4444', background: 'none',
                    border: '1px solid color-mix(in srgb, #ef4444 30%, var(--border))',
                    borderRadius: 'var(--radius)', padding: '6px 14px',
                    cursor: 'pointer', transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#ef44440f')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  onClick={handleDeleteLogo}
                  disabled={logoLoading}
                >
                  <Trash2 size={15} />
                  Eliminar logo
                </button>
              )}

              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                El logo aparece en facturas,<br />
                documentos y reportes PDF.
              </p>
            </div>
          </div>

          {/* Error de logo */}
          {logoError && (
            <p style={{
              marginTop: 8, fontSize: '0.78rem',
              color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              ⚠ {logoError}
            </p>
          )}
        </div>

        {/* Separador */}
        <div style={{
          borderTop: '1px solid var(--border)',
          marginBottom: 24,
        }} />

        {/* ── Formulario de datos ──────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="input-group">
            <label>Nombre Legal / Razón Social</label>
            <input
              type="text" className="input"
              value={formData.company_name}
              onChange={e => setFormData({ ...formData, company_name: e.target.value })}
              required
            />
          </div>

          <div className="input-group">
            <label>NIT (con dígito de verificación)</label>
            <input
              type="text" className="input"
              placeholder="900.000.000-1"
              value={formData.company_nit}
              onChange={e => setFormData({ ...formData, company_nit: e.target.value })}
              required
            />
          </div>

          <div className="input-group">
            <label>Dirección</label>
            <input
              type="text" className="input"
              value={formData.company_address}
              onChange={e => setFormData({ ...formData, company_address: e.target.value })}
              required
            />
          </div>

          <div className="grid-cols-2">
            <div className="input-group">
              <label>Ciudad / Departamento</label>
              <input
                type="text" className="input"
                placeholder="Ej: Bogotá, D.C."
                value={formData.company_city}
                onChange={e => setFormData({ ...formData, company_city: e.target.value })}
                required
              />
            </div>
            <div className="input-group">
              <label>Teléfono de contacto</label>
              <input
                type="text" className="input"
                value={formData.company_phone}
                onChange={e => setFormData({ ...formData, company_phone: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div>
              {message && (
                <div className="flex items-center gap-2 text-success font-medium">
                  <CheckCircle2 size={18} />
                  {message}
                </div>
              )}
              {error && (
                <p style={{ fontSize: '0.82rem', color: '#ef4444' }}>⚠ {error}</p>
              )}
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving
                ? <Loader2 size={18} className="spinner" />
                : <><Save size={18} /> Guardar Cambios</>
              }
            </button>
          </div>
        </form>

        {/* Input de archivo oculto */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  )
}
