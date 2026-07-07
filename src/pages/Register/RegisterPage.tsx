import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { Building2, Lock, Mail, Eye, EyeOff, Shield, Zap, TrendingUp, Hash, User, Phone, MapPin } from 'lucide-react'
import { tenantService } from '@/services/tenant.service'
import PlatformBrand from '@/components/PlatformBrand/PlatformBrand'
import RegistrationProgressSteps, { type RegistrationProgressStep } from '@/components/RegistrationProgressSteps'
import '../Login/Login.css'

const REGISTRATION_STEPS = [
  'Validando información de la empresa',
  'Creando entorno seguro',
  'Configurando base de datos',
  'Creando usuario administrador',
  'Asignando plan inicial',
  'Preparando configuración contable',
  'Enviando correo de bienvenida',
  'Finalizando registro',
]

const sanitizeErrorMessage = (message: string) => (
  message.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, 'identificador interno')
)

export default function RegisterPage() {
  const navigate = useNavigate()

  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [creationStarted, setCreationStarted] = useState(false)
  const [progressIndex, setProgressIndex] = useState(0)

  // Company Data
  const [razonSocial, setRazonSocial] = useState('')
  const [tenantSlug, setTenantSlug] = useState('')
  const [nit, setNit] = useState('')
  const [emailContacto, setEmailContacto] = useState('')
  const [telefono, setTelefono] = useState('')
  const [ciudad, setCiudad] = useState('')

  // Admin Data
  const [adminNombre, setAdminNombre] = useState('')
  const [adminApellido, setAdminApellido] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')

  const handleNextStep = (e: FormEvent) => {
    e.preventDefault()
    if (loading) return
    if (!razonSocial || !nit || !emailContacto) {
      setError('Por favor completa los campos obligatorios de la empresa.')
      return
    }
    setError('')
    setStep(2)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (loading) return
    if (!adminNombre || !adminApellido || !adminEmail || !adminPassword) {
      setError('Por favor completa los campos obligatorios del administrador.')
      return
    }
    setError('')
    setCreationStarted(true)
    setProgressIndex(0)
    setLoading(true)

    try {
      const response = await tenantService.register({
        razon_social: razonSocial,
        nit,
        tenant_slug: tenantSlug || undefined,
        email_contacto: emailContacto,
        telefono,
        ciudad,
        admin_nombre: adminNombre,
        admin_apellido: adminApellido,
        admin_email: adminEmail,
        admin_password: adminPassword,
      })
      setProgressIndex(REGISTRATION_STEPS.length - 1)
      setSuccess(`¡Registro exitoso! Tu identificador público es: ${response.data.tenant_slug}`)
    } catch (err: unknown) {
      const data = axios.isAxiosError(err) ? err.response?.data : null
      if (data?.errors) {
        const errors = data.errors as Record<string, string[]>
        const firstMsg = Object.values(errors).flat()[0] ?? 'Error de validación.'
        // Si el error es del NIT volvemos al paso 1 para que el usuario lo corrija
        if (errors.nit) setStep(1)
        setError(sanitizeErrorMessage(firstMsg))
      } else {
        const status = axios.isAxiosError(err) ? err.response?.status : null
        const fallback = status === 429
          ? 'Recibimos demasiados intentos de registro. Espera unos minutos antes de reintentar.'
          : 'No pudimos completar el registro. Revisa los datos e intenta nuevamente.'
        const msg = typeof data?.message === 'string' ? data.message : fallback
        setError(sanitizeErrorMessage(msg))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!loading) return

    const timer = window.setInterval(() => {
      setProgressIndex(current => Math.min(current + 1, REGISTRATION_STEPS.length - 2))
    }, 850)

    return () => window.clearInterval(timer)
  }, [loading])

  const progressSteps = useMemo<RegistrationProgressStep[]>(() => (
    REGISTRATION_STEPS.map((label, index) => {
      if (creationStarted && error && !loading) {
        if (index < progressIndex) return { id: label, label, status: 'completed' }
        if (index === progressIndex) return { id: label, label, status: 'error' }
        return { id: label, label, status: 'pending' }
      }

      if (!creationStarted) return { id: label, label, status: 'pending' }
      if (index < progressIndex) return { id: label, label, status: 'completed' }
      if (index === progressIndex) return { id: label, label, status: 'active' }
      return { id: label, label, status: 'pending' }
    })
  ), [creationStarted, error, loading, progressIndex])

  if (success) {
    return (
      <div className="login-page">
        <div className="login-container login-success">
          <div className="brand-logo" style={{ margin: '0 auto 24px auto' }}>
            <Building2 size={32} />
          </div>
          <h2 className="login-success__title">Empresa Creada</h2>
          <p className="login-success__text">
            {success}
            <br /><br />
            Usa ese identificador junto con el correo y contraseña de administrador para iniciar sesión.
          </p>
          <button onClick={() => navigate('/login')} className="btn btn-primary btn-full">
            Ir a Iniciar Sesión
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Panel izquierdo — Branding */}
        <div className="login-branding">
          <PlatformBrand variant="hero" />
          <p className="brand-tagline">
            Registro de Nueva Empresa<br />Comienza tu prueba de 14 días
          </p>

          <div className="brand-features">
            <div className="brand-feature">
              <div className="feature-icon"><Shield size={18} /></div>
              <div>
                <div className="feature-title">Aislamiento Seguro</div>
                <div className="feature-desc">Tu información es 100% privada</div>
              </div>
            </div>
            <div className="brand-feature">
              <div className="feature-icon"><TrendingUp size={18} /></div>
              <div>
                <div className="feature-title">Contabilidad NIIF</div>
                <div className="feature-desc">Módulos adaptados a Colombia</div>
              </div>
            </div>
            <div className="brand-feature">
              <div className="feature-icon"><Zap size={18} /></div>
              <div>
                <div className="feature-title">Configuración Rápida</div>
                <div className="feature-desc">Tu entorno listo en segundos</div>
              </div>
            </div>
          </div>
        </div>

        {/* Panel derecho — Formulario */}
        <div className="login-form-panel">
          <div className="login-form-header">
            <h2>{step === 1 ? 'Datos de la Empresa' : 'Administrador Inicial'}</h2>
            <p>{step === 1 ? 'Paso 1 de 2: Información corporativa' : 'Paso 2 de 2: Crea tu cuenta de acceso'}</p>
          </div>

          {error && (
            <div className="alert alert-error mb-4">
              <Lock size={16} />
              {error}
            </div>
          )}

          {creationStarted && (
            <RegistrationProgressSteps
              steps={progressSteps}
              message={loading ? 'Estamos preparando tu empresa. Puedes permanecer en esta pantalla mientras finaliza el registro.' : undefined}
              error={!loading && error ? 'El registro no se completó. Puedes corregir los datos y reintentar.' : undefined}
            />
          )}

          {step === 1 ? (
            <form onSubmit={handleNextStep} className="login-form">
              <div className="input-group">
                <label>Razón Social *</label>
                <div className="input-icon-wrapper">
                  <Building2 size={16} className="input-icon" />
                  <input
                    type="text"
                    className="input input-with-icon"
                    placeholder="Ej: Mi Empresa S.A.S"
                    value={razonSocial}
                    onChange={e => setRazonSocial(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Slug público (opcional)</label>
                <div className="input-icon-wrapper">
                  <Hash size={16} className="input-icon" />
                  <input
                    type="text"
                    className="input input-with-icon"
                    placeholder="mi-empresa"
                    value={tenantSlug}
                    onChange={e => setTenantSlug(e.target.value)}
                  />
                </div>
              </div>

              <div className="input-group">
                <label>NIT *</label>
                <div className="input-icon-wrapper">
                  <Hash size={16} className="input-icon" />
                  <input
                    type="text"
                    className="input input-with-icon"
                    placeholder="900000000-1"
                    value={nit}
                    onChange={e => setNit(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Email de Contacto Corporativo *</label>
                <div className="input-icon-wrapper">
                  <Mail size={16} className="input-icon" />
                  <input
                    type="email"
                    className="input input-with-icon"
                    placeholder="contacto@empresa.com"
                    value={emailContacto}
                    onChange={e => setEmailContacto(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="input-group">
                  <label>Teléfono</label>
                  <div className="input-icon-wrapper">
                    <Phone size={16} className="input-icon" />
                    <input
                      type="text"
                      className="input input-with-icon"
                      placeholder="3000000000"
                      value={telefono}
                      onChange={e => setTelefono(e.target.value)}
                    />
                  </div>
                </div>
                <div className="input-group">
                  <label>Ciudad</label>
                  <div className="input-icon-wrapper">
                    <MapPin size={16} className="input-icon" />
                    <input
                      type="text"
                      className="input input-with-icon"
                      placeholder="Bogotá"
                      value={ciudad}
                      onChange={e => setCiudad(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-full">
                Siguiente Paso
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="login-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="input-group">
                  <label>Nombre *</label>
                  <div className="input-icon-wrapper">
                    <User size={16} className="input-icon" />
                    <input
                      type="text"
                      className="input input-with-icon"
                      placeholder="Juan"
                      value={adminNombre}
                      onChange={e => setAdminNombre(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="input-group">
                  <label>Apellido *</label>
                  <div className="input-icon-wrapper">
                    <User size={16} className="input-icon" />
                    <input
                      type="text"
                      className="input input-with-icon"
                      placeholder="Pérez"
                      value={adminApellido}
                      onChange={e => setAdminApellido(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="input-group">
                <label>Email Administrador *</label>
                <div className="input-icon-wrapper">
                  <Mail size={16} className="input-icon" />
                  <input
                    type="email"
                    className="input input-with-icon"
                    placeholder="admin@empresa.com"
                    value={adminEmail}
                    onChange={e => setAdminEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Contraseña *</label>
                <div className="input-icon-wrapper">
                  <Lock size={16} className="input-icon" />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    className="input input-with-icon input-with-action"
                    placeholder="••••••••"
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    className="input-action"
                    onClick={() => setShowPwd(v => !v)}
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setStep(1)} className="btn btn-secondary" style={{ flex: 1 }} disabled={loading}>
                  Atrás
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loading}>
                  {loading ? <span className="spinner" /> : null}
                  {loading ? 'Creando...' : 'Crear Empresa'}
                </button>
              </div>
            </form>
          )}

          <p className="login-help">
            ¿Ya tienes una empresa registrada? <Link to="/login" className="login-help-link">Inicia Sesión</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
