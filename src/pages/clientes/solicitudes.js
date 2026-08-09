import { useEffect, useState } from 'react'

import Notice from '../../components/Notice'
import PageHeader from '../../components/PageHeader'
import PortalLayout from '../../components/PortalLayout'
import { withClientSession } from '../../components/ProtectedPage'
import { apiFetch } from '../../lib/client/api'
import { formatDate } from '../../lib/format'

export const getServerSideProps = withClientSession()

export default function SolicitudesPage({ session }) {
  const accounts = session?.accounts || []
  const defaultEmpresa = accounts[0]?.empresa || ''
  const [requests, setRequests] = useState({ perfil: [], facturas: [] })
  const [form, setForm] = useState({ empresa: defaultEmpresa, serie: '', numero: '', requestType: 'reclamo', message: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function loadRequests() {
    apiFetch('/api/client/requests')
      .then(payload => setRequests(payload.requests))
      .catch(requestError => setError(requestError.message))
  }

  useEffect(() => {
    loadRequests()
  }, [])

  async function submit(event) {
    event.preventDefault()
    setMessage('')
    setError('')

    try {
      await apiFetch('/api/client/requests', {
        method: 'POST',
        body: JSON.stringify({
          kind: 'factura',
          ...form
        })
      })
      setForm({ empresa: defaultEmpresa, serie: '', numero: '', requestType: 'reclamo', message: '' })
      setMessage('Tu solicitud sobre la factura quedó registrada.')
      loadRequests()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <PortalLayout title="Solicitudes" session={session}>
      <PageHeader
        eyebrow="Soporte"
        title="Solicitudes"
        description="Registra reclamos, soportes o ajustes relacionados con facturas y datos de cliente."
      />
      <Notice>{message}</Notice>
      <Notice type="error">{error}</Notice>
      <section className="panel">
        <h2>Solicitud sobre factura</h2>
        <form className="grid-form" onSubmit={submit}>
          <label>
            Empresa
            <select value={form.empresa} onChange={event => setForm({ ...form, empresa: event.target.value })} required>
              {accounts.map(account => (
                <option key={`${account.empresa}-${account.codCliente}`} value={account.empresa}>
                  {account.empresaNombre} ({account.empresa})
                </option>
              ))}
            </select>
          </label>
          <label>
            Serie
            <input value={form.serie} onChange={event => setForm({ ...form, serie: event.target.value })} />
          </label>
          <label>
            Número de factura
            <input
              value={form.numero}
              onChange={event => setForm({ ...form, numero: event.target.value })}
              required
            />
          </label>
          <label>
            Tipo
            <select value={form.requestType} onChange={event => setForm({ ...form, requestType: event.target.value })}>
              <option value="reclamo">Reclamo</option>
              <option value="soporte">Soporte de pago</option>
              <option value="copia">Copia de factura</option>
              <option value="otro">Otro</option>
            </select>
          </label>
          <label className="span-2">
            Mensaje
            <textarea
              value={form.message}
              onChange={event => setForm({ ...form, message: event.target.value })}
              rows={4}
              required
            />
          </label>
          <button type="submit" className="primary-button">
            Crear solicitud
          </button>
        </form>
      </section>
      <section className="table-surface">
        <h2>Historial</h2>
        <table>
          <thead>
            <tr>
              <th>Origen</th>
              <th>Detalle</th>
              <th>Estado</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {[...requests.perfil, ...requests.facturas].map(item => (
              <tr key={item.id}>
                <td>{item.numero ? 'Factura' : 'Perfil'}</td>
                <td>{item.numero ? `${item.empresa || ''} ${item.serie || ''} ${item.numero}` : item.tipo}</td>
                <td>
                  <span className="status-pill">{item.estado}</span>
                </td>
                <td>{formatDate(item.creado_en)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </PortalLayout>
  )
}
