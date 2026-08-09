import { useEffect, useState } from 'react'

import AdminLayout from '../../components/AdminLayout'
import Notice from '../../components/Notice'
import { withAdminSession } from '../../components/ProtectedPage'
import { apiFetch } from '../../lib/client/api'
import { formatCurrency, formatDate } from '../../lib/format'

export const getServerSideProps = withAdminSession()

export default function AdminCarteraPage({ session }) {
  const [cartera, setCartera] = useState({ companies: [], facturas: [], total: 0 })
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/api/admin/cartera')
      .then(payload => setCartera(payload.cartera || { companies: [], facturas: [], total: 0 }))
      .catch(requestError => setError(requestError.message))
  }, [])

  return (
    <AdminLayout title="Cartera clientes" session={session}>
      <Notice type="error">{error}</Notice>
      <section className="metrics-grid">
        <div className="metric-card">
          <span>Cartera global</span>
          <strong>{formatCurrency(cartera.total)}</strong>
          <small>{cartera.companies.reduce((sum, item) => sum + Number(item.facturas || 0), 0)} factura(s)</small>
        </div>
        {cartera.companies.map(company => (
          <div className="metric-card" key={company.empresa}>
            <span>{company.empresaNombre}</span>
            <strong>{formatCurrency(company.total)}</strong>
            <small>
              {company.empresa} - {company.facturas} factura(s)
            </small>
          </div>
        ))}
      </section>
      <section className="table-surface">
        <h2>Cartera reciente</h2>
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Empresa</th>
              <th>Factura</th>
              <th>Vence</th>
              <th>Días</th>
              <th>Edad cartera</th>
              <th className="right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {cartera.facturas.map(item => (
              <tr key={`${item.EMPRESA}-${item.SERIE || 'SIN_SERIE'}-${item.NUMERO}-${item.CODCLIENTE}`}>
                <td>{item.CODCLIENTE}</td>
                <td>{item.EMPRESA}</td>
                <td>{`${item.SERIE || ''} ${item.NUMERO}`}</td>
                <td>{formatDate(item.FECHAVENCIMIENTO)}</td>
                <td>{item.DIAS_PENDIENTES ?? '-'}</td>
                <td>{item.EDADES_CARTERA || '-'}</td>
                <td className="right">{formatCurrency(item.IMPORTE)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AdminLayout>
  )
}
