import { useEffect, useState } from 'react'

import AdminLayout from '../../components/AdminLayout'
import Notice from '../../components/Notice'
import { withAdminSession } from '../../components/ProtectedPage'
import { apiFetch } from '../../lib/client/api'
import { formatCurrency } from '../../lib/format'

export const getServerSideProps = withAdminSession()

export default function AdminClientesPage({ session }) {
  const [requests, setRequests] = useState({ perfil: [], facturas: [] })
  const [cartera, setCartera] = useState({ companies: [], facturas: [], total: 0 })
  const [warning, setWarning] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/api/admin/cartera')
      .then(payload => setCartera(payload.cartera || { companies: [], facturas: [], total: 0 }))
      .catch(requestError => setError(requestError.message))

    apiFetch('/api/admin/requests')
      .then(payload => {
        setRequests(payload.requests || { perfil: [], facturas: [] })
        setWarning(payload.warning || '')
      })
      .catch(requestError => setWarning(requestError.message))
  }, [])

  return (
    <AdminLayout title="Admin clientes" session={session}>
      <Notice type="error">{error}</Notice>
      <Notice>{warning}</Notice>
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
        <div className="metric-card">
          <span>Solicitudes</span>
          <strong>{requests.perfil.length + requests.facturas.length}</strong>
          <small>Pendientes y revisadas</small>
        </div>
      </section>
    </AdminLayout>
  )
}
