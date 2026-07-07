import { useState, type FormEvent } from 'react'
import { Shield, KeyRound, Monitor, CheckCircle2, AlertCircle, Lock } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { userService } from '@/services/user.service'
import { getAxiosErrorData } from '@/lib/errors'

export default function SeguridadPage() {
  const { user } = useAuth()

  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd]         = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [loading, setLoading]       = useState(false)
  const [success, setSuccess]       = useState('')
  const [error, setError]           = useState('')

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault()
    setSuccess('')
    setError('')

    if (newPwd !== confirmPwd) {
      setError('Las contraseñas nuevas no coinciden.')
      return
    }
    if (newPwd.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    setLoading(true)
    try {
      await userService.changePassword(user!.id, {
        current_password:      currentPwd,
        password:              newPwd,
        password_confirmation: confirmPwd,
      })
      setSuccess('Contraseña actualizada correctamente.')
      setCurrentPwd('')
      setNewPwd('')
      setConfirmPwd('')
    } catch (err) {
      const data = getAxiosErrorData(err)?.data
      if (data?.errors) {
        const first = Object.values(data.errors as Record<string, string[]>)[0]
        setError(Array.isArray(first) ? first[0] : String(first))
      } else {
        setError(data?.message || 'Error al cambiar la contraseña.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container">
      <div className="page-header mb-8">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Shield size={28} className="text-accent" />
            Seguridad
          </h1>
          <p className="page-subtitle">Gestiona tu contraseña y revisa el estado de tu cuenta.</p>
        </div>
      </div>

      <div className="flex flex-col gap-6" style={{ maxWidth: '640px' }}>

        {/* Cambio de contraseña */}
        <div className="card p-8">
          <h2 className="text-base font-bold text-white flex items-center gap-2 mb-6">
            <KeyRound size={18} className="text-accent" />
            Cambiar Contraseña
          </h2>

          {success && (
            <div className="alert alert-success mb-4 flex items-center gap-2">
              <CheckCircle2 size={16} />
              {success}
            </div>
          )}
          {error && (
            <div className="alert alert-error mb-4 flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
            <div className="input-group">
              <label>Contraseña actual</label>
              <div className="input-icon-wrapper">
                <Lock size={15} className="input-icon" />
                <input
                  type="password"
                  className="input input-with-icon"
                  placeholder="••••••••"
                  value={currentPwd}
                  onChange={e => setCurrentPwd(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label>Nueva contraseña</label>
              <div className="input-icon-wrapper">
                <Lock size={15} className="input-icon" />
                <input
                  type="password"
                  className="input input-with-icon"
                  placeholder="Mínimo 8 caracteres"
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
            </div>

            <div className="input-group">
              <label>Confirmar nueva contraseña</label>
              <div className="input-icon-wrapper">
                <Lock size={15} className="input-icon" />
                <input
                  type="password"
                  className="input input-with-icon"
                  placeholder="••••••••"
                  value={confirmPwd}
                  onChange={e => setConfirmPwd(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="submit" className="btn btn-primary px-8" disabled={loading}>
                {loading ? <span className="spinner" /> : null}
                {loading ? 'Guardando...' : 'Actualizar Contraseña'}
              </button>
            </div>
          </form>
        </div>

        {/* Info de la sesión */}
        <div className="card p-8">
          <h2 className="text-base font-bold text-white flex items-center gap-2 mb-6">
            <Monitor size={18} className="text-accent" />
            Sesión Actual
          </h2>
          <div className="flex flex-col gap-3">
            {[
              { label: 'Usuario', value: user?.nombre_completo, color: 'var(--text-primary)' },
              { label: 'Email',   value: user?.email,            color: 'var(--text-primary)' },
              { label: 'Rol',     value: user?.role_label,        color: 'var(--accent-light)' },
            ].map((row, i, arr) => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 0',
                borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : undefined,
              }}>
                <span className="text-sm text-muted">{row.label}</span>
                <span className="text-sm font-semibold" style={{ color: row.color }}>{row.value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px' }}>
              <span className="text-sm text-muted">Estado</span>
              <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--success)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
                Sesión activa
              </span>
            </div>
          </div>
        </div>

        {/* Recomendaciones */}
        <div className="card p-8" style={{ borderColor: 'rgba(99,102,241,0.25)' }}>
          <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
            <Shield size={18} className="text-accent" />
            Buenas Prácticas
          </h2>
          <ul className="flex flex-col gap-3">
            {[
              'Usa una contraseña de al menos 12 caracteres con letras, números y símbolos.',
              'No compartas tu contraseña con nadie, ni con el equipo de soporte.',
              'Cierra sesión siempre que uses un equipo compartido.',
              'Reporta inmediatamente cualquier acceso sospechoso al administrador.',
            ].map((tip, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-muted">
                <CheckCircle2 size={15} style={{ color: 'var(--accent)', marginTop: 2, flexShrink: 0 }} />
                {tip}
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  )
}
