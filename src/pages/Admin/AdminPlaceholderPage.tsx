export default function AdminPlaceholderPage({ title }: { title: string }) {
  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1>{title}</h1>
          <p className="admin-muted">Módulo preparado para la operación SaaS central.</p>
        </div>
      </div>
      <div className="admin-card">
        <p className="admin-muted">Los modelos y endpoints base ya están disponibles para evolucionar esta pantalla sin tocar la lógica tenant.</p>
      </div>
    </>
  )
}
