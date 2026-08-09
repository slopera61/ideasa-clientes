import { useEffect, useMemo, useState } from 'react'

import Notice from '../../components/Notice'
import PageHeader from '../../components/PageHeader'
import PortalLayout from '../../components/PortalLayout'
import { withClientSession } from '../../components/ProtectedPage'
import { apiFetch } from '../../lib/client/api'
import { formatCurrency, formatDate } from '../../lib/format'

export const getServerSideProps = withClientSession()

export default function FacturasPage({ session }) {
  const [profile, setProfile] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [selected, setSelected] = useState({})
  const [provider, setProvider] = useState('wompi')
  const [loading, setLoading] = useState(true)
  const [payingKey, setPayingKey] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([apiFetch('/api/client/me'), apiFetch('/api/client/invoices')])
      .then(([profilePayload, invoicesPayload]) => {
        setProfile(profilePayload)
        setInvoices(invoicesPayload.invoices || [])
      })
      .catch(requestError => setError(requestError.message))
      .finally(() => setLoading(false))
  }, [])

  const selectedInvoices = useMemo(() => invoices.filter(invoice => selected[invoice.id]), [invoices, selected])
  const selectedInvoiceGroups = useMemo(
    () =>
      Object.values(
        selectedInvoices.reduce((groups, invoice) => {
          const key = invoice.empresa || 'IDEASA'

          if (!groups[key]) {
            groups[key] = {
              empresa: invoice.empresa,
              empresaNombre: invoice.empresaNombre || invoice.empresa || 'IDEASA',
              facturas: 0,
              total: 0,
              invoices: []
            }
          }

          groups[key].facturas += 1
          groups[key].total += Number(invoice.importe || 0)
          groups[key].invoices.push(invoice)

          return groups
        }, {})
      ).sort((a, b) => String(a.empresa || '').localeCompare(String(b.empresa || ''))),
    [selectedInvoices]
  )
  const total = selectedInvoices.reduce((sum, invoice) => sum + Number(invoice.importe || 0), 0)
  const totalCartera = invoices.reduce((sum, invoice) => sum + Number(invoice.importe || 0), 0)
  const vencidas = invoices.filter(invoice => Number(invoice.diasPendientes || 0) > 0)
  const porVencer = invoices.filter(invoice => Number(invoice.diasPendientes || 0) <= 0)
  const carteraVencida = vencidas.reduce((sum, invoice) => sum + Number(invoice.importe || 0), 0)
  const carteraPorEmpresa = useMemo(() => {
    const accounts = profile?.client?.accounts || session?.accounts || []
    const groups = accounts.reduce((currentGroups, account) => {
      const key = account.empresa || 'IDEASA'

      currentGroups[key] = {
        empresa: account.empresa,
        empresaNombre: account.empresaNombre || account.empresa || 'IDEASA',
        facturas: 0,
        total: 0
      }

      return currentGroups
    }, {})

    invoices.forEach(invoice => {
      const key = invoice.empresa || 'IDEASA'

      if (!groups[key]) {
        groups[key] = {
          empresa: invoice.empresa,
          empresaNombre: invoice.empresaNombre || invoice.empresa || 'IDEASA',
          facturas: 0,
          total: 0
        }
      }

      groups[key].facturas += 1
      groups[key].total += Number(invoice.importe || 0)
    })

    return Object.values(groups)
  }, [invoices, profile, session])
  const proximoVencimiento = [...invoices]
    .filter(invoice => invoice.fechaVencimiento)
    .sort((a, b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento))[0]

  function toggleInvoice(invoiceId) {
    setSelected(current => ({ ...current, [invoiceId]: !current[invoiceId] }))
  }

  const splitWompiPayment = provider === 'wompi' && selectedInvoiceGroups.length > 1
  const paying = Boolean(payingKey)

  async function startPayment(invoicesForPayment = selectedInvoices, paymentKey = 'selected') {
    if (!Array.isArray(invoicesForPayment) || invoicesForPayment.length === 0) return

    setPayingKey(paymentKey)
    setError('')

    try {
      const orderPayload = await apiFetch('/api/client/payment-orders', {
        method: 'POST',
        body: JSON.stringify({
          provider,
          invoices: invoicesForPayment.map(invoice => ({
            empresa: invoice.empresa,
            serie: invoice.serie,
            numero: invoice.numero
          }))
        })
      })
      const attemptPayload = await apiFetch('/api/payments/create-attempt', {
        method: 'POST',
        body: JSON.stringify({ orderId: orderPayload.order.id, provider })
      })

      window.location.href = attemptPayload.checkoutUrl
    } catch (requestError) {
      setError(requestError.message)
      setPayingKey('')
    }
  }

  const client = profile?.client
  const finance = profile?.finance

  return (
    <PortalLayout title='Mis facturas' session={session}>
      <PageHeader
        eyebrow='Cartera'
        title='Mis facturas'
        description='Selecciona una o varias facturas para crear una orden de pago.'
        actions={
          <div className='segmented-control' aria-label='Pasarela'>
            <button className={provider === 'wompi' ? 'active' : ''} type='button' onClick={() => setProvider('wompi')}>
              Wompi
            </button>
            <button
              className={provider === 'mercadopago' ? 'active' : ''}
              type='button'
              onClick={() => setProvider('mercadopago')}
            >
              Mercado Pago
            </button>
          </div>
        }
      />
      <Notice type='error'>{error}</Notice>
      <section className='client-overview panel'>
        <div>
          <span className='avatar-initial large'>{(client?.nombre || session?.nombre || 'C').slice(0, 1)}</span>
        </div>
        <div>
          <p className='eyebrow'>{client?.empresaNombre || session?.empresaNombre || 'IDEASA'}</p>
          <h2>{client?.razonSocial || client?.nombre || session?.nombre || 'Cliente'}</h2>
          <p>
            {client?.documento || session?.documento || 'NIT/Cédula'} · {client?.estado || 'Activo'}
          </p>
        </div>
      </section>
      <section className='metrics-grid'>
        <div className='metric-card'>
          <span>Saldo pendiente</span>
          <strong>{formatCurrency(totalCartera)}</strong>
          <small>{invoices.length} factura(s)</small>
        </div>
        <div className='metric-card danger'>
          <span>Cartera vencida</span>
          <strong>{formatCurrency(carteraVencida)}</strong>
          <small>{vencidas.length} factura(s) vencida(s)</small>
        </div>
        <div className='metric-card'>
          <span>Por vencer</span>
          <strong>{porVencer.length}</strong>
          <small>Próximo: {formatDate(proximoVencimiento?.fechaVencimiento)}</small>
        </div>
        <div className='metric-card'>
          <span>Cupo disponible</span>
          <strong>{formatCurrency(finance?.cupoDisponible)}</strong>
          <small>Deuda total: {formatCurrency(finance?.totalDeuda)}</small>
        </div>
      </section>
      {carteraPorEmpresa.length > 1 ? (
        <section className='company-balance-strip' aria-label='Saldo por empresa'>
          {carteraPorEmpresa.map(company => (
            <div key={company.empresa || company.empresaNombre}>
              <span>{company.empresaNombre}</span>
              <strong>{formatCurrency(company.total)}</strong>
              <small>
                {company.empresa} - {company.facturas} factura(s)
              </small>
            </div>
          ))}
        </section>
      ) : null}
      <section className='summary-band'>
        <div>
          <span>Seleccionadas</span>
          <strong>{selectedInvoices.length}</strong>
        </div>
        <div>
          <span>Total a pagar</span>
          <strong>{formatCurrency(total)}</strong>
        </div>
        {splitWompiPayment ? (
          <div className='payment-split-actions' aria-label='Pagos Wompi por empresa'>
            {selectedInvoiceGroups.map(group => {
              const key = group.empresa || group.empresaNombre

              return (
                <button
                  key={key}
                  type='button'
                  className='primary-button'
                  disabled={paying}
                  onClick={() => startPayment(group.invoices, key)}
                >
                  {payingKey === key
                    ? 'Creando pago...'
                    : `Pagar ${group.empresaNombre} - ${formatCurrency(group.total)}`}
                </button>
              )
            })}
          </div>
        ) : (
          <button
            type='button'
            className='primary-button'
            disabled={selectedInvoices.length === 0 || paying}
            onClick={() => startPayment(selectedInvoices)}
          >
            {paying ? 'Creando pago...' : 'Pagar selección'}
          </button>
        )}
      </section>
      <section className='table-surface'>
        {loading ? (
          <p className='muted'>Cargando facturas...</p>
        ) : invoices.length === 0 ? (
          <p className='muted'>No tienes facturas pendientes registradas.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Seleccionar</th>
                <th>Factura</th>
                <th>Empresa</th>
                <th>Emisión</th>
                <th>Vence</th>
                <th>Días</th>
                <th>Edad cartera</th>
                <th className='right'>Valor</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(invoice => (
                <tr key={invoice.id}>
                  <td>
                    <input
                      type='checkbox'
                      checked={Boolean(selected[invoice.id])}
                      onChange={() => toggleInvoice(invoice.id)}
                      aria-label={`Seleccionar factura ${invoice.numero}`}
                    />
                  </td>
                  <td>
                    <strong>{invoice.numero}</strong>
                    <span>{invoice.serie || 'Sin serie'}</span>
                  </td>
                  <td>
                    <strong>{invoice.empresaNombre || invoice.empresa}</strong>
                    <span>{invoice.empresa}</span>
                  </td>
                  <td>{formatDate(invoice.fechaDocumento)}</td>
                  <td>{formatDate(invoice.fechaVencimiento)}</td>
                  <td>{invoice.diasPendientes ?? '-'}</td>
                  <td>{invoice.edadCartera || '-'}</td>
                  <td className='right'>{formatCurrency(invoice.importe)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </PortalLayout>
  )
}
