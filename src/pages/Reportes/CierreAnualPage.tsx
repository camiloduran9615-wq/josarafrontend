import { useState } from 'react'
import { CalendarOff, AlertTriangle, Loader2, CheckCircle2, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import { getTenantId } from '@/services/auth.service'
import { extractApiError } from '@/lib/errors'

interface ResultadoCierre {
  anio:                   number
  resultado:              'utilidad' | 'perdida' | 'equilibrio'
  monto:                  number
  asiento_cancelacion_id: string
  asiento_traslado_id:    string
  mensaje:                string
}

const currentYear = new Date().getFullYear()

export default function CierreAnualPage() {
  const [año, setAño]           = useState(currentYear - 1)
  const [paso, setPaso]         = useState<1 | 2 | 3>(1)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [resultado, setResultado] = useState<ResultadoCierre | null>(null)
  const [confirmText, setConfirmText] = useState('')

  const CONFIRM_PHRASE = `CERRAR ${año}`

  const ejecutarCierre = async () => {
    if (confirmText !== CONFIRM_PHRASE) {
      setError(`Escribe exactamente: ${CONFIRM_PHRASE}`)
      return
    }
    setLoading(true); setError('')
    try {
      const res = await api.post(`/${getTenantId()}/cierre-anual/${año}`, { confirmar: true })
      setResultado(res.data.data)
      setPaso(3)
    } catch (e: unknown) {
      setError(extractApiError(e, 'Error al ejecutar el cierre anual.'))
    } finally {
      setLoading(false)
    }
  }

  const reiniciar = () => {
    setPaso(1)
    setResultado(null)
    setError('')
    setConfirmText('')
  }

  return (
    <div className="annual-close-page page-container">
      {/* Encabezado */}
      <div className="page-header annual-close-header">
        <div className="annual-close-title-row">
        <div className="annual-close-icon"><CalendarOff size={20} aria-hidden="true" /></div>
        <div>
          <h1 className="page-title">Cierre Anual</h1>
          <p className="page-subtitle">Operacion irreversible - cancelacion de PyG y traslado a patrimonio</p>
        </div>
        </div>
      </div>

      {/* Advertencia principal */}
      <div className="annual-close-warning">
        <AlertTriangle size={20} className="annual-close-warning__icon" aria-hidden="true" />
        <div>
          <p className="font-semibold">Esta operación es irreversible.</p>
          <ul>
            <li>Genera asiento de cancelacion: debita/acredita cuenta 5905 (Ganancias y Perdidas)</li>
            <li>Traslada el resultado neto a cuenta 3605 (Utilidad del Ejercicio) en patrimonio</li>
            <li>Bloquea la edicion de todos los periodos del año cerrado</li>
            <li>Solo puede ejecutarse si todos los periodos mensuales del año estan cerrados</li>
          </ul>
        </div>
      </div>

      {/* Stepper */}
      {resultado === null && (
        <div className="annual-close-stepper" aria-label="Progreso del cierre anual">
          {[1, 2, 3].map(n => (
            <div key={n} className="annual-close-stepper__item">
              <div className={`annual-close-stepper__dot ${paso >= n ? 'active' : ''}`}>
                {n}
              </div>
              {n < 3 && <ChevronRight size={12} className="annual-close-stepper__chevron" aria-hidden="true" />}
            </div>
          ))}
          <span className="annual-close-stepper__label">
            {paso === 1 ? 'Seleccionar año' : paso === 2 ? 'Confirmar operacion' : 'Completado'}
          </span>
        </div>
      )}

      {/* Paso 1: Selector de año */}
      {paso === 1 && (
        <div className="card annual-close-card">
          <h2 className="annual-close-section-title">Selecciona el año a cerrar</h2>
          <div className="annual-close-form-row">
            <div className="input-group">
              <label>Año fiscal</label>
              <select
                value={año}
                onChange={e => setAño(Number(e.target.value))}
                className="input"
              >
                {[currentYear - 2, currentYear - 1, currentYear].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setPaso(2)}
              className="btn btn-primary annual-close-form-row__button"
            >
              Continuar
            </button>
          </div>
          <p className="annual-close-note">
            El cierre genera automaticamente los asientos contables requeridos por las NIIF para el año <strong>{año}</strong>.
          </p>
        </div>
      )}

      {/* Paso 2: Confirmación */}
      {paso === 2 && (
        <div className="card annual-close-card">
          <h2 className="annual-close-section-title">Confirma el cierre anual de <span>{año}</span></h2>

          <div className="annual-close-summary">
            <p><span>Año a cerrar:</span> <strong>{año}</strong></p>
            <p><span>Asiento 1:</span> Cancelacion P&G - debita/acredita 5905 por cada cuenta de ingreso/gasto</p>
            <p><span>Asiento 2:</span> Traslado saldo neto de 5905 a cuenta 3605 (patrimonio)</p>
          </div>

          <div className="input-group">
            <label>
              Para confirmar, escribe exactamente: <strong className="annual-close-confirm-phrase">{CONFIRM_PHRASE}</strong>
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              className="input annual-close-confirm-input"
            />
          </div>

          {error && (
            <div className="alert alert-error">
              <AlertTriangle size={14} />{error}
            </div>
          )}

          <div className="annual-close-actions">
            <button
              onClick={() => { setPaso(1); setError(''); setConfirmText('') }}
              className="btn btn-secondary"
            >
              Volver
            </button>
            <button
              onClick={ejecutarCierre}
              disabled={loading || confirmText !== CONFIRM_PHRASE}
              className="btn btn-danger"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <CalendarOff size={14} />}
              Ejecutar Cierre {año}
            </button>
          </div>
        </div>
      )}

      {/* Paso 3: Resultado */}
      {resultado && (
        <div className="card annual-close-card">
          <div className="annual-close-result-header">
            <CheckCircle2 size={24} />
            <div>
              <h2>Cierre anual {resultado.anio} completado</h2>
              <p>{resultado.mensaje}</p>
            </div>
          </div>

          <div className="annual-close-result-grid">
            <div className="annual-close-result-row">
              <span>Resultado del ejercicio</span>
              <strong className={`capitalize ${resultado.resultado === 'utilidad' ? 'tone-success' : resultado.resultado === 'perdida' ? 'tone-danger' : ''}`}>
                {resultado.resultado}
              </strong>
            </div>
            <div className="annual-close-result-row">
              <span>Monto</span>
              <strong className="annual-close-money">
                COP {Number(resultado.monto).toLocaleString('es-CO')}
              </strong>
            </div>
            <div className="annual-close-result-row border-top">
              <span>Asiento cancelacion P&G</span>
              <strong className="annual-close-money">{resultado.asiento_cancelacion_id}</strong>
            </div>
            <div className="annual-close-result-row">
              <span className="text-slate-400">Asiento traslado patrimonio</span>
              <strong className="annual-close-money">{resultado.asiento_traslado_id}</strong>
            </div>
          </div>

          <button
            onClick={reiniciar}
            className="btn btn-secondary btn-full"
          >
            Cerrar otro año
          </button>
        </div>
      )}
    </div>
  )
}
