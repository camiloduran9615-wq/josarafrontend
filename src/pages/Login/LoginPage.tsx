import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { usePlatform } from '@/config/usePlatform'
import PlatformBrand from '@/components/PlatformBrand/PlatformBrand'
import type { Sucursal } from '@/types'
import { Building2, Lock, Mail, Eye, EyeOff, TrendingUp, Shield, Zap, Hash, ArrowRight } from 'lucide-react'
import './Login.css'

export default function LoginPage() {
  const [step, setStep] = useState<'login' | 'select-sucursal'>('login')
  const [availableSucursales, setAvailableSucursales] = useState<Sucursal[]>([])
  const { login, setSucursal } = useAuth()
  const platform = usePlatform()
  const navigate   = useNavigate()

  const [tenantSlug, setTenantSlug] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(tenantSlug, email, password)
      const sucs = data.sucursales || []
      
      if (sucs.length > 1) {
        setAvailableSucursales(sucs)
        setStep('select-sucursal')
      } else if (sucs.length === 1) {
        setSucursal(sucs[0])
        navigate('/dashboard', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Credenciales inválidas.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectSucursal = (s: Sucursal) => {
    setSucursal(s)
    navigate('/dashboard', { replace: true })
  }

  if (step === 'select-sucursal') {
    return (
      <div className="login-page">
        <div className="login-container" style={{ justifyContent: 'center' }}>
          <div className="card animate-in zoom-in-95 duration-300 login-sucursal-card">
            <div className="text-center mb-8">
              <div className="login-sucursal-icon">
                <Building2 size={48} />
              </div>
              <h2 className="login-sucursal-title">Selecciona tu sede</h2>
              <p className="login-sucursal-text">¿En qué sucursal vas a operar el día de hoy?</p>
            </div>

            <div className="login-sucursal-list">
              {availableSucursales.map(s => (
                <button
                  key={s.id}
                  onClick={() => handleSelectSucursal(s)}
                  className="login-sucursal-option"
                >
                  <div>
                    <div className="login-sucursal-name">{s.nombre}</div>
                    <div className="login-sucursal-city">{s.ciudad || 'Sede física'}</div>
                  </div>
                  <ArrowRight size={20} className="login-sucursal-arrow" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Panel izquierdo — Branding */}
        <div className="login-branding">
          <PlatformBrand variant="hero" showTagline />

          <div className="brand-features">
            <div className="brand-feature">
              <div className="feature-icon"><Shield size={18} /></div>
              <div>
                <div className="feature-title">Multi-Empresa</div>
                <div className="feature-desc">Aislamiento total por empresa</div>
              </div>
            </div>
            <div className="brand-feature">
              <div className="feature-icon"><TrendingUp size={18} /></div>
              <div>
                <div className="feature-title">NIIF Colombia</div>
                <div className="feature-desc">Normativa DIAN integrada</div>
              </div>
            </div>
            <div className="brand-feature">
              <div className="feature-icon"><Zap size={18} /></div>
              <div>
                <div className="feature-title">Facturación Electrónica</div>
                <div className="feature-desc">UBL 2.1 en tiempo real</div>
              </div>
            </div>
          </div>

          <div className="brand-footer">
            {platform.copyright} — Todos los derechos reservados
          </div>
        </div>

        {/* Panel derecho — Formulario */}
        <div className="login-form-panel">
          <div className="login-form-header">
            <h2>Bienvenido de nuevo</h2>
            <p>Ingresa tus credenciales para acceder al sistema</p>
          </div>

          {error && (
            <div className="alert alert-error mb-4">
              <Lock size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="input-group">
              <label htmlFor="tenant">Empresa o slug</label>
              <div className="input-icon-wrapper">
                <Hash size={16} className="input-icon" />
                <input
                  id="tenant"
                  type="text"
                  className={`input input-with-icon ${error ? 'error' : ''}`}
                  placeholder="Mi Empresa o empresa-demo"
                  value={tenantSlug}
                  onChange={e => setTenantSlug(e.target.value)}
                  required
                  autoComplete="organization"
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="email">Correo electrónico</label>
              <div className="input-icon-wrapper">
                <Mail size={16} className="input-icon" />
                <input
                  id="email"
                  type="email"
                  className={`input input-with-icon ${error ? 'error' : ''}`}
                  placeholder="usuario@empresa.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="password">Contraseña</label>
              <div className="input-icon-wrapper">
                <Lock size={16} className="input-icon" />
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  className={`input input-with-icon input-with-action ${error ? 'error' : ''}`}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
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

            <button
              id="btn-login"
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : null}
              {loading ? 'Verificando...' : 'Iniciar Sesión'}
            </button>
          </form>

          <p className="login-help">
            ¿No has registrado tu empresa aún? <Link to="/register" className="login-help-link">Crea tu cuenta aquí</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
