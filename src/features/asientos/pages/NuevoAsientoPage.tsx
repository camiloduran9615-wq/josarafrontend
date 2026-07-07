/**
 * Página para crear un nuevo asiento contable manual.
 * Envuelve <AsientoForm/> + useCreateAsiento, redirige al detalle al guardar.
 */
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, BookMarked } from 'lucide-react'
import { AsientoForm } from '../components/AsientoForm'
import { useCreateAsiento } from '../hooks/useAsientos'
import type { StoreAsientoForm } from '../api/asientos.types'

export function NuevoAsientoPage() {
  const navigate = useNavigate()
  const createMutation = useCreateAsiento()

  const handleSubmit = async (data: StoreAsientoForm) => {
    try {
      await createMutation.mutateAsync(data)
      // Redirige al Libro Diario donde se aprueba/edita/descarta el borrador.
      navigate('/asientos')
    } catch {
      /* Error ya mostrado por el toast del hook */
    }
  }

  return (
    <div className="main-content fade-in">
      <div className="page-header">
        <div>
          <Link
            to="/asientos"
            className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--accent)] mb-2"
          >
            <ArrowLeft size={14} /> Volver al Libro Diario
          </Link>
          <h1 className="page-title flex items-center gap-3">
            <BookMarked size={26} className="text-[var(--accent)]" />
            Nuevo Asiento Contable
          </h1>
          <p className="page-subtitle">
            Registra un movimiento manual de partida doble. Débitos = Créditos.
          </p>
        </div>
      </div>

      <div className="card">
        <AsientoForm
          onSubmit={handleSubmit}
          isPending={createMutation.isPending}
          submitLabel="Guardar borrador"
        />
      </div>
    </div>
  )
}
