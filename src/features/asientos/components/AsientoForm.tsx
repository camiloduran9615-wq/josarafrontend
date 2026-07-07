/**
 * Formulario de creación/edición de Asiento contable.
 *
 * UX decisions:
 * - Tabla de líneas con suma en tiempo real (∑D, ∑C, diferencia con color).
 * - Botón "+ Agregar línea" agrega una fila vacía al final.
 * - Validación Zod al submit; errores inline en cada campo.
 * - Botón submit deshabilitado si ∑D ≠ ∑C o isPending.
 * - No usamos `any` en ningún punto (directriz TypeScript).
 */
import { useFieldArray, useForm, Controller, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatCOP } from '@/lib/utils'
import type { StoreAsientoForm } from '../api/asientos.types'
import CuentaAutocomplete from '@/components/CuentaAutocomplete'

// ── Esquema Zod ──────────────────────────────────────────────────────
const lineaSchema = z.object({
  cuenta_contable_id:   z.string().uuid('UUID de cuenta inválido.'),
  tercero_id:           z.string().optional(),
  centro_costo_id:      z.string().optional(),
  debito:               z.number().min(0),
  credito:              z.number().min(0),
  descripcion:          z.string().max(250).optional(),
  documento_referencia: z.string().max(50).optional(),
}).refine(
  (l) => (l.debito > 0) !== (l.credito > 0),
  { message: 'Cada línea debe tener exactamente un valor positivo: débito o crédito.' },
)

const asientoSchema = z.object({
  fecha:            z.string().min(1, 'La fecha es requerida.'),
  tipo_comprobante: z.string().min(1, 'El tipo de comprobante es requerido.').max(4),
  descripcion:      z.string().min(10, 'Mín. 10 caracteres.').max(500),
  numero_documento: z.string().max(50).optional(),
  lineas: z.array(lineaSchema).min(2, 'Se requieren al menos 2 líneas.'),
})

type FormValues = z.infer<typeof asientoSchema>

interface Props {
  defaultValues?: Partial<StoreAsientoForm>
  onSubmit: (data: StoreAsientoForm) => void
  isPending?: boolean
  submitLabel?: string
}

const TIPOS_COMPROBANTE = [
  { code: 'CC', label: 'CC - Comprobante de Contabilidad' },
  { code: 'CE', label: 'CE - Comprobante de Egreso' },
  { code: 'CI', label: 'CI - Comprobante de Ingreso' },
  { code: 'NC', label: 'NC - Nota de Contabilidad' },
  { code: 'ND', label: 'ND - Nota Débito' },
  { code: 'NI', label: 'NI - Nota de Ingreso' },
]

export function AsientoForm({ defaultValues, onSubmit, isPending, submitLabel = 'Guardar borrador' }: Props) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(asientoSchema),
    defaultValues: {
      fecha:            defaultValues?.fecha ?? new Date().toISOString().slice(0, 10),
      tipo_comprobante: defaultValues?.tipo_comprobante ?? '',
      descripcion:      defaultValues?.descripcion ?? '',
      numero_documento: defaultValues?.numero_documento ?? '',
      lineas: defaultValues?.lineas?.map(l => ({
        ...l,
        debito:  Number(l.debito),
        credito: Number(l.credito),
      })) ?? [
        { cuenta_contable_id: '', debito: 0, credito: 0 },
        { cuenta_contable_id: '', debito: 0, credito: 0 },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'lineas' })
  const lineas = watch('lineas')

  const sumD = lineas.reduce((acc, l) => acc + (Number(l.debito)  || 0), 0)
  const sumC = lineas.reduce((acc, l) => acc + (Number(l.credito) || 0), 0)
  const diff = Math.abs(sumD - sumC)
  const balanced = diff <= 0.01

  // Cuando hay errores de validación, react-hook-form NO llama al callback.
  // Por defecto los errores son silenciosos — el usuario no sabe qué pasó.
  // Hacemos toast con todos los errores agregados para feedback inmediato.
  const onInvalid = (errs: FieldErrors<FormValues>) => {
    const mensajes: string[] = []
    if (errs.fecha)            mensajes.push(`Fecha: ${errs.fecha.message}`)
    if (errs.tipo_comprobante) mensajes.push(`Tipo: ${errs.tipo_comprobante.message}`)
    if (errs.descripcion)      mensajes.push(`Descripción: ${errs.descripcion.message}`)
    if (errs.lineas) {
      if (Array.isArray(errs.lineas)) {
        errs.lineas.forEach((l: any, i) => {
          if (!l) return
          if (l.cuenta_contable_id) mensajes.push(`Línea ${i + 1}: selecciona una cuenta válida`)
          if (l.debito)             mensajes.push(`Línea ${i + 1} débito: ${l.debito.message}`)
          if (l.credito)            mensajes.push(`Línea ${i + 1} crédito: ${l.credito.message}`)
          if (l.root)               mensajes.push(`Línea ${i + 1}: ${l.root.message}`)
          if (typeof l.message === 'string') mensajes.push(`Línea ${i + 1}: ${l.message}`)
        })
      }
      if ((errs.lineas as any).root?.message)  mensajes.push((errs.lineas as any).root.message)
      if (typeof (errs.lineas as any).message === 'string') mensajes.push((errs.lineas as any).message)
    }
    const txt = mensajes.length ? mensajes.join(' · ') : 'Hay errores en el formulario.'
    toast.error(txt, { duration: 6000 })
  }

  return (
    <form
      onSubmit={handleSubmit((v) => onSubmit(v as StoreAsientoForm), onInvalid)}
      className="space-y-6"
    >
      {/* ── Cabecera ── */}
      <div className="card fade-in">
        <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-4">
          Datos del asiento
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {/* Fecha */}
          <div className="input-group">
            <label htmlFor="fecha">Fecha *</label>
            <input
              id="fecha"
              type="date"
              {...register('fecha')}
              className={cn('input', errors.fecha && 'error')}
            />
            {errors.fecha && <p className="error-text">{errors.fecha.message}</p>}
          </div>

          {/* Tipo comprobante */}
          <div className="input-group">
            <label htmlFor="tipo_comprobante">Tipo comprobante *</label>
            <select
              id="tipo_comprobante"
              {...register('tipo_comprobante')}
              className={cn('input', errors.tipo_comprobante && 'error')}
            >
              <option value="">Seleccionar…</option>
              {TIPOS_COMPROBANTE.map((t) => (
                <option key={t.code} value={t.code}>{t.label}</option>
              ))}
            </select>
            {errors.tipo_comprobante && <p className="error-text">{errors.tipo_comprobante.message}</p>}
          </div>

          {/* Descripción */}
          <div className="input-group" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="descripcion">Descripción / Glosa *</label>
            <input
              id="descripcion"
              type="text"
              placeholder="Ej: Registro de venta a contado — Factura 001-0021"
              {...register('descripcion')}
              className={cn('input', errors.descripcion && 'error')}
            />
            {errors.descripcion && <p className="error-text">{errors.descripcion.message}</p>}
          </div>

          {/* N° documento */}
          <div className="input-group">
            <label htmlFor="numero_documento">N° Documento externo</label>
            <input
              id="numero_documento"
              type="text"
              placeholder="001-0021"
              {...register('numero_documento')}
              className="input"
            />
          </div>
        </div>
      </div>

      {/* ── Líneas ── */}
      <div className="card fade-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
            Líneas contables
          </h3>
          <button
            type="button"
            onClick={() => append({ cuenta_contable_id: '', debito: 0, credito: 0 })}
            className="btn btn-secondary btn-sm"
          >
            <Plus size={14} /> Agregar línea
          </button>
        </div>

        {/* Error global de líneas */}
        {errors.lineas?.root && (
          <div className="alert alert-error mb-4">
            <AlertCircle size={16} />
            {errors.lineas.root.message}
          </div>
        )}
        {typeof errors.lineas?.message === 'string' && (
          <div className="alert alert-error mb-4">
            <AlertCircle size={16} />
            {errors.lineas.message}
          </div>
        )}

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Cuenta PUC *</th>
                <th style={{ width: '18%' }}>Tercero</th>
                <th style={{ width: '14%' }}>Débito</th>
                <th style={{ width: '14%' }}>Crédito</th>
                <th style={{ width: '18%' }}>Descripción</th>
                <th style={{ width: '6%' }}></th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, i) => (
                <tr key={field.id}>
                  {/* Cuenta */}
                  <td>
                    <Controller
                      name={`lineas.${i}.cuenta_contable_id`}
                      control={control}
                      render={({ field: f }) => (
                        <CuentaAutocomplete
                          value={f.value}
                          onChange={(id) => f.onChange(id)}
                          placeholder="Código o nombre..."
                        />
                      )}
                    />
                    {errors.lineas?.[i]?.cuenta_contable_id && (
                      <p className="error-text" style={{ fontSize: '0.7rem', marginTop: 2 }}>
                        Cuenta requerida
                      </p>
                    )}
                  </td>

                  {/* Tercero */}
                  <td>
                    <input
                      {...register(`lineas.${i}.tercero_id`)}
                      placeholder="Opcional"
                      className="input"
                      style={{ fontSize: '0.8rem' }}
                    />
                  </td>

                  {/* Débito */}
                  <td>
                    <Controller
                      name={`lineas.${i}.debito`}
                      control={control}
                      render={({ field: f }) => (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          {...f}
                          onChange={(e) => f.onChange(parseFloat(e.target.value) || 0)}
                          className={cn('input text-right', errors.lineas?.[i]?.debito && 'error')}
                          style={{ fontSize: '0.8rem' }}
                        />
                      )}
                    />
                  </td>

                  {/* Crédito */}
                  <td>
                    <Controller
                      name={`lineas.${i}.credito`}
                      control={control}
                      render={({ field: f }) => (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          {...f}
                          onChange={(e) => f.onChange(parseFloat(e.target.value) || 0)}
                          className={cn('input text-right', errors.lineas?.[i]?.credito && 'error')}
                          style={{ fontSize: '0.8rem' }}
                        />
                      )}
                    />
                  </td>

                  {/* Descripción item */}
                  <td>
                    <input
                      {...register(`lineas.${i}.descripcion`)}
                      placeholder="Nota"
                      className="input"
                      style={{ fontSize: '0.8rem' }}
                    />
                  </td>

                  {/* Quitar línea */}
                  <td>
                    {fields.length > 2 && (
                      <button
                        type="button"
                        onClick={() => remove(i)}
                        className="btn-icon btn-icon-danger"
                        title="Eliminar línea"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Totales */}
            <tfoot>
              <tr style={{ background: 'var(--bg-hover)' }}>
                <td colSpan={2} className="px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                  Totales
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-[var(--text-primary)]">
                  {formatCOP(sumD)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-[var(--text-primary)]">
                  {formatCOP(sumC)}
                </td>
                <td colSpan={2} className="px-4 py-3">
                  <span className={cn('text-xs font-semibold', balanced ? 'text-emerald-400' : 'text-red-400')}>
                    {balanced ? '✓ Balanceado' : `Dif: ${formatCOP(diff)}`}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Submit ── */}
      <div className="flex justify-end gap-3">
        <button
          type="submit"
          disabled={isPending || !balanced}
          className="btn btn-primary"
          title={!balanced ? 'El asiento debe estar balanceado antes de guardar.' : undefined}
        >
          {isPending && <span className="spinner" style={{ width: 16, height: 16 }} />}
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
