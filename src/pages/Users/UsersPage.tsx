import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userService } from '@/services/user.service'
import { useAuth } from '@/context/AuthContext'
import type { User, CreateUserPayload, UpdateUserPayload, Role } from '@/types'
import {
  UserPlus, Pencil, UserX, Search, Shield,
  CheckCircle, XCircle, X,
} from 'lucide-react'

const ROLES: { value: Role; label: string }[] = [
  { value: 'admin',    label: 'Administrador' },
  { value: 'contador', label: 'Contador Certificado' },
  { value: 'auxiliar', label: 'Auxiliar Contable' },
  { value: 'auditor',  label: 'Auditor Interno' },
  { value: 'readonly', label: 'Solo Lectura' },
]

const ROLE_BADGE: Record<Role, string> = {
  admin:    'badge-info',
  contador: 'badge-success',
  auxiliar: 'badge-warning',
  auditor:  'badge-muted',
  readonly: 'badge-muted',
}

/* ─── Modal de creación ─────────────────────────────────────────── */
function CreateUserModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<CreateUserPayload>({
    nombre: '', apellido: '', email: '',
    password: '', password_confirmation: '', role: 'auxiliar',
  })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: userService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); onClose() },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? 'Error al crear usuario.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.password_confirmation) {
      setError('Las contraseñas no coinciden.')
      return
    }
    mutation.mutate(form)
  }

  const f = (field: keyof CreateUserPayload, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Nuevo Usuario</h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose}><X size={16}/></button>
        </div>

        {error && <div className="alert alert-error mb-4"><XCircle size={16}/>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="grid-cols-2">
            <div className="input-group">
              <label>Nombre</label>
              <input className="input" value={form.nombre} onChange={e => f('nombre', e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Apellido</label>
              <input className="input" value={form.apellido} onChange={e => f('apellido', e.target.value)} required />
            </div>
          </div>
          <div className="input-group mt-4">
            <label>Correo electrónico</label>
            <input type="email" className="input" value={form.email} onChange={e => f('email', e.target.value)} required />
          </div>
          <div className="input-group mt-4">
            <label>Rol</label>
            <select className="input" value={form.role} onChange={e => f('role', e.target.value as Role)}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="grid-cols-2 mt-4">
            <div className="input-group">
              <label>Contraseña</label>
              <input type="password" className="input" value={form.password} onChange={e => f('password', e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Confirmar contraseña</label>
              <input type="password" className="input" value={form.password_confirmation} onChange={e => f('password_confirmation', e.target.value)} required />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={mutation.isPending} style={{ flex: 1 }}>
              {mutation.isPending ? <><span className="spinner" /> Creando...</> : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Modal de edición ──────────────────────────────────────────── */
function EditUserModal({ user, onClose }: { user: User; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<UpdateUserPayload>({
    nombre:   user.nombre,
    apellido: user.apellido,
    email:    user.email,
    role:     user.role,
    activo:   user.activo,
  })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: (payload: UpdateUserPayload) => userService.update(user.id, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); onClose() },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? 'Error al actualizar usuario.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    mutation.mutate(form)
  }

  const f = <K extends keyof UpdateUserPayload>(field: K, value: UpdateUserPayload[K]) =>
    setForm(prev => ({ ...prev, [field]: value }))

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Editar Usuario</h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose}><X size={16}/></button>
        </div>

        {error && <div className="alert alert-error mb-4"><XCircle size={16}/>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="grid-cols-2">
            <div className="input-group">
              <label>Nombre</label>
              <input className="input" value={form.nombre ?? ''} onChange={e => f('nombre', e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Apellido</label>
              <input className="input" value={form.apellido ?? ''} onChange={e => f('apellido', e.target.value)} required />
            </div>
          </div>
          <div className="input-group mt-4">
            <label>Correo electrónico</label>
            <input type="email" className="input" value={form.email ?? ''} onChange={e => f('email', e.target.value)} required />
          </div>
          <div className="input-group mt-4">
            <label>Rol</label>
            <select className="input" value={form.role} onChange={e => f('role', e.target.value as Role)}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-3 mt-4" style={{ cursor: 'pointer', userSelect: 'none', fontSize: '0.88rem' }}>
            <input type="checkbox" checked={form.activo ?? true} onChange={e => f('activo', e.target.checked)} />
            <span>Usuario <strong>{form.activo ? 'activo' : 'inactivo'}</strong></span>
          </label>

          <div className="flex gap-3 mt-6">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={mutation.isPending} style={{ flex: 1 }}>
              {mutation.isPending ? <><span className="spinner" /> Guardando...</> : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Página principal ──────────────────────────────────────────── */
export default function UsersPage() {
  const { user: me } = useAuth()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: userService.list,
  })

  const deactivate = useMutation({
    mutationFn: userService.deactivate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const filtered = users.filter(u =>
    `${u.nombre_completo} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  )

  if (!me?.can.manage_users) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 48 }}>
        <Shield size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
        <h3>Acceso restringido</h3>
        <p>Solo los administradores pueden gestionar usuarios.</p>
      </div>
    )
  }

  return (
    <>
      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} />}
      {editUser && <EditUserModal user={editUser} onClose={() => setEditUser(null)} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">Usuarios</h1>
          <p className="page-subtitle">Gestiona los usuarios de tu empresa</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <UserPlus size={18} /> Nuevo Usuario
        </button>
      </div>

      {/* Buscador */}
      <div className="card mb-4" style={{ padding: '14px 16px' }}>
        <div className="flex items-center gap-3">
          <Search size={18} color="var(--text-muted)" />
          <input
            className="input"
            style={{ border: 'none', background: 'none', padding: '4px 0' }}
            placeholder="Buscar por nombre o correo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <span className="text-muted text-sm">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Tabla */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div className="spinner-center"><span className="spinner" /></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Último acceso</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No se encontraron usuarios</td></tr>
                ) : filtered.map((u: User) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div style={{
                          width: 36, height: 36,
                          background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
                          borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.75rem', fontWeight: 700, color: '#fff', flexShrink: 0,
                        }}>
                          {u.nombre.charAt(0)}{u.apellido.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{u.nombre_completo}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={`badge ${ROLE_BADGE[u.role]}`}>{u.role_label}</span></td>
                    <td>
                      {u.activo
                        ? <span className="badge badge-success"><CheckCircle size={12}/>Activo</span>
                        : <span className="badge badge-danger"><XCircle size={12}/>Inactivo</span>
                      }
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {u.last_login
                        ? new Date(u.last_login).toLocaleDateString('es-CO')
                        : 'Nunca'}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          className="btn btn-secondary btn-sm"
                          title="Editar"
                          onClick={() => setEditUser(u)}
                        >
                          <Pencil size={14} />
                        </button>
                        {u.id !== me?.id && u.activo && (
                          <button
                            className="btn btn-danger btn-sm"
                            title="Desactivar"
                            onClick={() => deactivate.mutate(u.id)}
                            disabled={deactivate.isPending}
                          >
                            <UserX size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
