import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { getAxiosErrorData, getErrorMessage } from '@/lib/errors'
import { getTenantId } from '@/services/auth.service'
import {
  Link2, Save, Loader2, CheckCircle2, AlertCircle,
  Eye, EyeOff, Zap, Shield, ExternalLink,
} from 'lucide-react'

interface FactusConfig {
  factus_base_url:            string
  factus_client_id:           string
  factus_client_secret:       string
  factus_client_secret_preview?: string | null
  factus_client_secret_has?:  boolean
  factus_username:            string
  factus_password:            string
  factus_password_preview?:   string | null
  factus_password_has?:       boolean
  factus_mode:                'sandbox' | 'production'
}

const emptyForm: FactusConfig = {
  factus_base_url:      '',
  factus_client_id:     '',
  factus_client_secret: '',
  factus_username:      '',
  factus_password:      '',
  factus_mode:          'sandbox',
}

export default function FactusConfigPage() {
  const [form, setForm]               = useState<FactusConfig>(emptyForm)
  const [secretPreview, setSecretPreview]     = useState<string | null>(null)
  const [passwordPreview, setPasswordPreview] = useState<string | null>(null)
  const [hasSecret, setHasSecret]     = useState(false)
  const [hasPassword, setHasPassword] = useState(false)
  const [showSecret, setShowSecret]   = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [fetching, setFetching]       = useState(true)
  const [saving, setSaving]           = useState(false)
  const [testing, setTesting]         = useState(false)
  const [message, setMessage]         = useState<{ type: 'success'|'error', text: string } | null>(null)

  useEffect(() => { fetchConfig() }, [])

  const fetchConfig = async () => {
    try {
      setFetching(true)
      const res = await api.get(`/${getTenantId()}/configs/factus`)
      const d = res.data.data
      setForm({
        factus_base_url:      d.factus_base_url ?? '',
        factus_client_id:     d.factus_client_id ?? '',
        factus_client_secret: '',
        factus_username:      d.factus_username ?? '',
        factus_password:      '',
        factus_mode:          d.factus_mode ?? 'sandbox',
      })
      setSecretPreview(d.factus_client_secret_preview ?? null)
      setPasswordPreview(d.factus_password_preview ?? null)
      setHasSecret(!!d.factus_client_secret_has)
      setHasPassword(!!d.factus_password_has)
    } catch (err) {
      console.error(err)
    } finally {
      setFetching(false)
    }
  }

  const handleModeChange = (mode: 'sandbox' | 'production') => {
    const defaultUrl = mode === 'production'
      ? 'https://api.factus.com.co'
      : 'https://api-sandbox.factus.com.co'
    setForm(f => ({
      ...f,
      factus_mode: mode,
      // Solo cambia la URL si el usuario tenía la del otro modo
      factus_base_url: f.factus_base_url === '' || f.factus_base_url.includes('factus.com.co')
        ? defaultUrl
        : f.factus_base_url,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setMessage(null)
    try {
      // Solo enviar campos no vacíos para secretos (preservar los existentes)
      const payload: any = {
        factus_base_url:  form.factus_base_url,
        factus_client_id: form.factus_client_id,
        factus_username:  form.factus_username,
        factus_mode:      form.factus_mode,
      }
      if (form.factus_client_secret) payload.factus_client_secret = form.factus_client_secret
      if (form.factus_password)      payload.factus_password      = form.factus_password

      await api.post(`/${getTenantId()}/configs/factus`, payload)
      setMessage({ type: 'success', text: '¡Configuración guardada con éxito!' })
      await fetchConfig()
      // Limpiar los inputs de secretos en pantalla
      setForm(f => ({ ...f, factus_client_secret: '', factus_password: '' }))
      setTimeout(() => setMessage(null), 4000)
    } catch (err) {
      const data = getAxiosErrorData(err)?.data
      const msg = data?.message
        ?? Object.values((data?.errors as Record<string, unknown>) ?? {}).flat().join(' · ')
        ?? 'Error al guardar la configuración.'
      setMessage({ type: 'error', text: msg })
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true); setMessage(null)
    try {
      const res = await api.post(`/${getTenantId()}/configs/factus/test`)
      setMessage({ type: 'success', text: res.data.message })
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err) ?? 'Error al probar la conexión.' })
    } finally {
      setTesting(false)
    }
  }

  if (fetching) return <div className="card p-10 text-center"><span className="spinner" /></div>

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link2 size={26} className="text-accent" />
          <div>
            <h2 className="text-xl font-bold">Conexión con Factus</h2>
            <p className="text-sm text-muted">
              Configura las credenciales del aliado tecnológico DIAN para esta empresa.
            </p>
          </div>
        </div>
        <a
          href="https://factus.co/contacto"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted hover:text-accent flex items-center gap-1"
        >
          ¿No tienes credenciales? <ExternalLink size={12} />
        </a>
      </div>

      {/* Banner informativo */}
      <div
        className="mb-6 p-4 rounded-lg flex gap-3"
        style={{
          background: 'color-mix(in srgb, #3b82f6 8%, transparent)',
          border: '1px solid color-mix(in srgb, #3b82f6 25%, transparent)',
        }}
      >
        <Shield size={20} className="shrink-0 mt-0.5" style={{ color: '#93c5fd' }} />
        <div className="text-sm">
          <p className="font-semibold" style={{ color: '#bfdbfe' }}>Multi-tenant aislado</p>
          <p className="text-muted text-xs mt-1">
            Estas credenciales son <strong>exclusivas de esta empresa</strong>. Los secretos
            se almacenan encriptados (AES-256) en la base de datos del tenant.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Modo Sandbox / Producción */}
        <div className="input-group">
          <label>Modo de operación</label>
          <div className="grid grid-cols-2 gap-3 mt-1">
            <button
              type="button"
              onClick={() => handleModeChange('sandbox')}
              className={`p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                form.factus_mode === 'sandbox'
                  ? 'border-accent bg-accent/10'
                  : 'border-muted hover:border-accent/50'
              }`}
            >
              <Zap size={18} className={form.factus_mode === 'sandbox' ? 'text-accent' : 'text-muted'} />
              <div className="text-left">
                <div className="font-semibold text-sm">Sandbox</div>
                <div className="text-xs text-muted">Pruebas / desarrollo</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('production')}
              className={`p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                form.factus_mode === 'production'
                  ? 'border-success bg-success/10'
                  : 'border-muted hover:border-success/50'
              }`}
            >
              <Shield size={18} className={form.factus_mode === 'production' ? 'text-success' : 'text-muted'} />
              <div className="text-left">
                <div className="font-semibold text-sm">Producción</div>
                <div className="text-xs text-muted">DIAN real / facturas válidas</div>
              </div>
            </button>
          </div>
        </div>

        <div className="input-group">
          <label>URL Base de la API</label>
          <input
            type="url" className="input"
            placeholder="https://api-sandbox.factus.com.co"
            value={form.factus_base_url}
            onChange={e => setForm({ ...form, factus_base_url: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="input-group">
            <label>Client ID</label>
            <input
              type="text" className="input"
              placeholder="9xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={form.factus_client_id}
              onChange={e => setForm({ ...form, factus_client_id: e.target.value })}
            />
          </div>
          <div className="input-group">
            <label>
              Client Secret
              {hasSecret && <span className="ml-2 text-xs text-muted">(guardado: {secretPreview})</span>}
            </label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                className="input pr-10"
                placeholder={hasSecret ? 'Dejar vacío para mantener actual' : 'Pega el client_secret'}
                value={form.factus_client_secret}
                onChange={e => setForm({ ...form, factus_client_secret: e.target.value })}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-white"
                onClick={() => setShowSecret(s => !s)}
                tabIndex={-1}
              >
                {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="input-group">
            <label>Usuario (email)</label>
            <input
              type="email" className="input"
              placeholder="empresa@dominio.com"
              value={form.factus_username}
              onChange={e => setForm({ ...form, factus_username: e.target.value })}
            />
          </div>
          <div className="input-group">
            <label>
              Contraseña
              {hasPassword && <span className="ml-2 text-xs text-muted">(guardada: {passwordPreview})</span>}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="input pr-10"
                placeholder={hasPassword ? 'Dejar vacío para mantener actual' : 'Tu contraseña Factus'}
                value={form.factus_password}
                onChange={e => setForm({ ...form, factus_password: e.target.value })}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-white"
                onClick={() => setShowPassword(s => !s)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mensaje de feedback */}
        {message && (
          <div
            className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-success/10 text-success border border-success/30'
                : 'bg-danger/10 text-danger border border-danger/30'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {message.text}
          </div>
        )}

        <div className="flex justify-between items-center mt-3 pt-4 border-t border-muted">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleTest}
            disabled={testing || saving}
          >
            {testing
              ? <Loader2 size={16} className="spinner" />
              : <><Zap size={16} /> Probar conexión</>
            }
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving || testing}>
            {saving
              ? <Loader2 size={16} className="spinner" />
              : <><Save size={16} /> Guardar configuración</>
            }
          </button>
        </div>
      </form>
    </div>
  )
}
