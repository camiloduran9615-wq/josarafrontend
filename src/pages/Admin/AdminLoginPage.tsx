import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { adminService } from '@/services/admin.service'
import PlatformBrand from '@/components/PlatformBrand/PlatformBrand'
import './Admin.css'

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await adminService.login(email, password)
      navigate('/admin/dashboard', { replace: true })
    } catch {
      setError('Credenciales inválidas o acceso no autorizado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <PlatformBrand />
        <div>
          <h1>Super Admin JOSARA CLOUD</h1>
          <p className="admin-muted">Acceso administrativo global</p>
        </div>
        <form className="admin-form" onSubmit={submit}>
          <label>
            Email
            <input value={email} onChange={event => setEmail(event.target.value)} type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input value={password} onChange={event => setPassword(event.target.value)} type="password" autoComplete="current-password" required />
          </label>
          {error && <div className="admin-error">{error}</div>}
          <button className="admin-button primary" disabled={loading} type="submit">
            <ShieldCheck size={18} />
            {loading ? 'Validando...' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  )
}
