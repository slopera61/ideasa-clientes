import { useEffect, useState } from 'react'

import AdminLayout from '../../components/AdminLayout'
import Notice from '../../components/Notice'
import { withAdminSession } from '../../components/ProtectedPage'
import { apiFetch } from '../../lib/client/api'
import { formatDate } from '../../lib/format'

export const getServerSideProps = withAdminSession()

export default function AdminSolicitudesPage({ session }) {
  const [requests, setRequests] = useState({ perfil: [], facturas: [] })
  const [warning, setWarning] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/api/admin/requests')
      .then(payload => {
        setRequests(payload.requests || { perfil: [], facturas: [] })
        setWarning(payload.warning || '')
      })
      .catch(requestError => setError(requestError.message))
  }, [])

  return (
    <AdminLayout title="Solicitudes clientes" session={session}>
      <Notice>{warning}</Notice>
      <Notice type="error">{error}</Notice>
      <section className="table-surface">
        <h2>Actualización de perfil</h2>
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Estado</th>
              <th>Datos solicitados</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {requests.perfil.map(item => (
              <tr key={item.id}>
                <td>{item.cod_cliente}</td>
                <td>
                  <span className="status-pill">{item.estado}</span>
                </td>
                <td>
                  <pre>{JSON.stringify(item.datos_solicitados, null, 2)}</pre>
                </td>
                <td>{formatDate(item.creado_en)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="table-surface">
        <h2>Solicitudes de facturas</h2>
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Empresa</th>
              <th>Factura</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {requests.facturas.map(item => (
              <tr key={item.id}>
                <td>{item.cod_cliente}</td>
                <td>{item.empresa || '-'}</td>
                <td>{`${item.serie || ''} ${item.numero}`}</td>
                <td>{item.tipo}</td>
                <td>
                  <span className="status-pill">{item.estado}</span>
                </td>
                <td>{formatDate(item.creado_en)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AdminLayout>
  )
}
