import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Settings, X, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { getTenantId } from '@/services/auth.service'

type Modulo = 'compra' | 'factura' | 'cierre'

interface ClaveFaltante {
  clave: string
  label: string
}

interface Props {
  modulo: Modulo
  isOpen: boolean      // se valida cada vez que cambia a true
  onClose: () => void  // cerrar el padre si decide cancelar
  onValido: () => void // se ejecuta cuando todo está OK
}

/**
 * Valida que las cuentas críticas del módulo estén parametrizadas ANTES de
 * permitir abrir el formulario padre. Si faltan, muestra un modal bloqueante
 * con la lista de claves y un CTA para ir a Configuración → Cuentas Maestras.
 *
 * Uso típico (envolver en el modal de crear documento):
 *   <ParametrizacionGuard
 *     modulo="compra"
 *     isOpen={isOpen}
 *     onClose={onClose}
 *     onValido={() => setReadyToShow(true)}
 *   />
 *   {readyToShow && <FormularioReal />}
 */
export default function ParametrizacionGuard({ modulo, isOpen, onClose, onValido }: Props) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [faltantes, setFaltantes] = useState<ClaveFaltante[] | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [validationAttempt, setValidationAttempt] = useState(0)

  useEffect(() => {
    if (!isOpen) {
      setFaltantes(null)
      setValidationError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setValidationError(null)
    api.get(`/${getTenantId()}/parametrizacion-contable/validar/${modulo}`)
      .then(res => {
        if (cancelled) return
        if (res.data?.data?.valido) {
          setFaltantes([])
          onValido()
        } else {
          setFaltantes(res.data?.data?.faltantes ?? [])
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const apiError = error as { response?: { data?: { message?: string } } }
          setFaltantes(null)
          setValidationError(
            apiError.response?.data?.message
              ?? 'No fue posible validar la parametrización contable. Reintenta antes de continuar.',
          )
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [isOpen, modulo, onValido, validationAttempt])

  if (!isOpen) return null

  if (loading) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 'var(--radius-xl)' }}>
          <Loader2 size={20} className="spinner" />
        </div>
      </div>
    )
  }

  if (validationError) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="parametrizacion-error-title"
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)', zIndex: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}
      >
        <div style={{
          background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)',
          border: '1px solid rgba(239,68,68,0.4)', width: '100%', maxWidth: 520,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)', padding: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <AlertTriangle size={22} style={{ color: '#ef4444', flexShrink: 0 }} />
            <div>
              <h3 id="parametrizacion-error-title" style={{ margin: 0, fontSize: '1.05rem' }}>
                No se pudo validar la parametrización
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 8 }}>
                {validationError}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                El formulario permanecerá bloqueado para evitar documentos sin asiento contable válido.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-secondary" onClick={() => navigate('/configuracion')}>
              <Settings size={14} /> Ir a parametrizar
            </button>
            <button className="btn btn-primary" onClick={() => setValidationAttempt(attempt => attempt + 1)}>
              Reintentar
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (faltantes === null || faltantes.length === 0) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)', zIndex: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid rgba(251,191,36,0.4)',
          width: '100%', maxWidth: 560,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Header amarillo */}
        <div style={{
          padding: '18px 24px',
          background: 'rgba(251,191,36,0.08)',
          borderBottom: '1px solid rgba(251,191,36,0.25)',
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <AlertTriangle size={22} style={{ color: '#fbbf24', flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#fef3c7' }}>
              Parametrización contable incompleta
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Antes de registrar este documento, configura las cuentas críticas
              del módulo <strong>{modulo === 'compra' ? 'Compras' : modulo === 'factura' ? 'Facturación' : 'Cierre'}</strong>.
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: 4,
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
            Las siguientes <strong>{faltantes.length} cuenta(s) maestra(s)</strong> no están
            asignadas. Sin ellas, el asiento contable no podrá generarse correctamente:
          </p>

          <ul style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '12px 16px',
            margin: 0,
            listStyle: 'none',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            {faltantes.map(f => (
              <li key={f.clave} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: '0.85rem',
              }}>
                <span style={{ color: '#ef4444', fontSize: '0.7rem' }}>●</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{f.label}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontFamily: 'monospace' }}>
                  {f.clave}
                </span>
              </li>
            ))}
          </ul>

          <div style={{
            marginTop: 16,
            padding: '12px 14px',
            background: 'rgba(59,130,246,0.08)',
            border: '1px solid rgba(59,130,246,0.25)',
            borderRadius: 'var(--radius)',
            fontSize: '0.78rem',
            color: '#93c5fd',
          }}>
            💡 <strong>Como Administrador/Contador</strong> debes asignar las cuentas PUC
            que corresponden a cada operación. Esto se hace una sola vez al inicio.
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'flex-end', gap: 10,
        }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            onClick={() => { onClose(); navigate('/configuracion') }}
          >
            <Settings size={14} /> Ir a parametrizar
          </button>
        </div>
      </div>
    </div>
  )
}
