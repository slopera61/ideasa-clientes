import { useEffect, useState } from 'react'

import Notice from '../../../components/Notice'
import PageHeader from '../../../components/PageHeader'
import PortalLayout from '../../../components/PortalLayout'
import { withClientSession } from '../../../components/ProtectedPage'
import { apiFetch } from '../../../lib/client/api'
import { formatCents, formatDate } from '../../../lib/format'

export const getServerSideProps = withClientSession()

export default function PagosPage({ session }) {
  const [history, setHistory] = useState({ ordenes: [], pagos: [] })
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/api/client/payment-orders')
      .then(payload => setHistory(payload))
      .catch(requestError => setError(requestError.message))
  }, [])

  return (
    <PortalLayout title="Mis pagos" session={session}>
      <PageHeader
        eyebrow="Pagos"
        title="Mis pagos"
        description="Consulta órdenes creadas y pagos confirmados por webhook."
      />
      <Notice type="error">{error}</Notice>
      <section className="table-surface">
        <h2>Órdenes recientes</h2>
        {history.ordenes.length === 0 ? (
          <p className="muted">No tienes órdenes de pago creadas por este medio.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Referencia</th>
                <th>Pasarela</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th className="right">Total</th>
              </tr>
            </thead>
            <tbody>
              {history.ordenes.map(order => (
                <tr key={order.id}>
                  <td>{order.referencia}</td>
                  <td>{order.proveedor_preferido || '-'}</td>
                  <td>
                    <span className="status-pill">{order.estado}</span>
                  </td>
                  <td>{formatDate(order.creado_en)}</td>
                  <td className="right">{formatCents(order.total_centavos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section className="table-surface">
        <h2>Pagos aprobados</h2>
        {history.pagos.length === 0 ? (
          <p className="muted">Lo sentimos, por este medio no ha realizado pagos.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Referencia</th>
                <th>Pasarela</th>
                <th>Transacción</th>
                <th>Fecha</th>
                <th className="right">Total</th>
              </tr>
            </thead>
            <tbody>
              {history.pagos.map(payment => (
                <tr key={payment.id}>
                  <td>{payment.referencia}</td>
                  <td>{payment.proveedor}</td>
                  <td>{payment.transaccion_pasarela_id}</td>
                  <td>{formatDate(payment.confirmado_en)}</td>
                  <td className="right">{formatCents(payment.total_centavos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </PortalLayout>
  )
}
