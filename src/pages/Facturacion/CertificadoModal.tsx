import { useState } from 'react'
import { X, Printer, Loader2, FileCheck } from 'lucide-react'
import { api } from '@/lib/api'
import { getTenantId } from '@/services/auth.service'

interface CertificadoModalProps {
  isOpen: boolean
  onClose: () => void
  terceroId: string
  terceroNombre: string
}

export default function CertificadoModal({ isOpen, onClose, terceroId, terceroNombre }: CertificadoModalProps) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [startDate, setStartDate] = useState(new Date().getFullYear() + '-01-01')
  const [endDate, setEndDate] = useState(new Date().getFullYear() + '-12-31')

  const fetchCertificate = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/${getTenantId()}/reports/withholding-certificate/${terceroId}`, {
        params: { start_date: startDate, end_date: endDate }
      })
      setData(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '800px', maxHeight: '95vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2 className="page-title flex items-center gap-2">
            <FileCheck size={24} className="text-accent" />
            Certificado de Retención
          </h2>
          <button onClick={onClose} className="btn-icon">
            <X size={20} />
          </button>
        </div>

        {!data ? (
          <div className="flex flex-col gap-6">
            <p className="text-sm text-muted">Generar certificado para <strong>{terceroNombre}</strong></p>
            <div className="grid-cols-2">
              <div className="input-group">
                <label>Desde</label>
                <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="input-group">
                <label>Hasta</label>
                <input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="btn btn-secondary">Cancelar</button>
              <button onClick={fetchCertificate} className="btn btn-primary" disabled={loading}>
                {loading ? <Loader2 size={18} className="spinner" /> : 'Generar Vista Previa'}
              </button>
            </div>
          </div>
        ) : (
          <div className="certificate-preview">
            <div id="printable-certificate" className="p-8 bg-white text-black" style={{ minHeight: '100mm', fontFamily: 'serif' }}>
              <div className="text-center mb-8">
                <h1 className="text-xl font-bold uppercase">{data.empresa.nombre}</h1>
                <p className="text-sm">NIT: {data.empresa.nit}</p>
                <p className="text-xs">{data.empresa.direccion} - {data.empresa.ciudad}</p>
                <h2 className="text-lg font-bold mt-6 uppercase">Certificado de Retención en la Fuente</h2>
                <p className="text-sm italic">Periodo: {data.periodo.desde} a {data.periodo.hasta}</p>
              </div>

              <div className="mb-6 text-sm">
                <p><strong>Certifica que:</strong></p>
                <p className="uppercase">{data.tercero.razon_social}</p>
                <p>Identificado con NIT/CC: {data.tercero.identificacion}</p>
              </div>

              <table className="w-full text-sm border-collapse mb-8">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="text-left py-2">Concepto</th>
                    <th className="text-center py-2">Tasa</th>
                    <th className="text-right py-2">Base Gravable</th>
                    <th className="text-right py-2">Valor Retenido</th>
                  </tr>
                </thead>
                <tbody>
                  {data.retenciones.map((r: any, i: number) => (
                    <tr key={i} className="border-b border-gray-200">
                      <td className="py-2">{r.nombre}</td>
                      <td className="text-center">{r.tasa}%</td>
                      <td className="text-right">${parseFloat(r.total_base).toLocaleString()}</td>
                      <td className="text-right">${parseFloat(r.total_retenido).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold">
                    <td colSpan={3} className="text-right py-4 uppercase">Total Retenido:</td>
                    <td className="text-right py-4">
                      ${data.retenciones.reduce((acc: number, r: any) => acc + parseFloat(r.total_retenido), 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>

              <div className="mt-12 text-xs">
                <p>Se firma en {data.empresa.ciudad} a los {new Date().toLocaleDateString()}.</p>
                <p className="mt-2">No requiere firma autógrafa (Art. 10 D.R. 836/91 y Art. 381 del E.T.)</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 border-t pt-4">
              <button onClick={() => setData(null)} className="btn btn-secondary">Cambiar Periodo</button>
              <button onClick={() => window.print()} className="btn btn-primary">
                <Printer size={18} /> Imprimir Certificado
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
