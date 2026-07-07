import { AlertCircle, CheckCircle2, Circle, Loader2 } from 'lucide-react'
import './RegistrationProgressSteps.css'

export type RegistrationStepStatus = 'pending' | 'active' | 'completed' | 'error'

export interface RegistrationProgressStep {
  id: string
  label: string
  status: RegistrationStepStatus
}

interface RegistrationProgressStepsProps {
  steps: RegistrationProgressStep[]
  message?: string
  error?: string
}

export default function RegistrationProgressSteps({ steps, message, error }: RegistrationProgressStepsProps) {
  const completed = steps.filter(step => step.status === 'completed').length
  const hasError = steps.some(step => step.status === 'error')
  const progress = Math.round((completed / steps.length) * 100)
  const currentStep = steps.find(step => step.status === 'active') ?? steps.find(step => step.status === 'error')

  return (
    <section className="registration-progress" aria-live="polite">
      <div className="registration-progress__header">
        <div>
          <p className="registration-progress__eyebrow">Registro en curso</p>
          <h3>{hasError ? 'Necesitamos revisar el registro' : currentStep?.label ?? 'Finalizando registro'}</h3>
        </div>
        <span className="registration-progress__percent">{hasError ? 'Error' : `${progress}%`}</span>
      </div>

      <div className="registration-progress__bar" aria-hidden="true">
        <div style={{ width: `${hasError ? Math.max(progress, 12) : progress}%` }} />
      </div>

      <ol className="registration-progress__steps">
        {steps.map(step => (
          <li key={step.id} className={`registration-progress__step registration-progress__step--${step.status}`}>
            <span className="registration-progress__icon" aria-hidden="true">
              {step.status === 'completed' && <CheckCircle2 size={18} />}
              {step.status === 'active' && <Loader2 size={18} className="registration-progress__spin" />}
              {step.status === 'error' && <AlertCircle size={18} />}
              {step.status === 'pending' && <Circle size={18} />}
            </span>
            <span>{step.label}</span>
          </li>
        ))}
      </ol>

      {(message || error) && (
        <p className={error ? 'registration-progress__message registration-progress__message--error' : 'registration-progress__message'}>
          {error ?? message}
        </p>
      )}
    </section>
  )
}
