import { useEffect, useState } from 'react'

import Notice from './Notice'
import { formatCurrency, formatDate } from '../lib/format'
import { apiFetch } from '../lib/client/api'

function PdfIcon() {
  return (
    <svg className="button-line-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v5h4" />
      <path d="M8.7 16.5h1.1c.9 0 1.5-.5 1.5-1.3s-.6-1.3-1.5-1.3H8.7v4.1" />
      <path d="M13 18v-4.1h1.1c1.2 0 2 .8 2 2s-.8 2.1-2 2.1z" />
      <path d="M17.3 18v-4.1h2.2" />
      <path d="M17.3 15.8h1.7" />
    </svg>
  )
}

function XmlIcon() {
  return (
    <svg className="button-line-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m8 9-4 3 4 3" />
      <path d="m16 9 4 3-4 3" />
      <path d="m14 5-4 14" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg className="button-line-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6h16v12H4z" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg className="button-line-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M3.8 19a5.2 5.2 0 0 1 10.4 0" />
      <path d="M17 11.2a2.6 2.6 0 1 0 0-5.2" />
      <path d="M16.2 14.2A4.7 4.7 0 0 1 21 19" />
    </svg>
  )
}

export default function ElectronicInvoiceResult({ invoice }) {
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const [resendError, setResendError] = useState('')
  const [resendDialogOpen, setResendDialogOpen] = useState(false)
  const [resendMode, setResendMode] = useState('registered')
  const [resendEmails, setResendEmails] = useState('')

  useEffect(() => {
    setResendMessage('')
    setResendError('')
    setResendDialogOpen(false)
    setResendMode('registered')
    setResendEmails('')
  }, [invoice?.token])

  if (!invoice) return null

  const downloadBase = `/api/facturacion-electronica/descargar?token=${encodeURIComponent(invoice.token)}`
  const reference = invoice.referencia || `${invoice.prefijo || ''}${invoice.consecutivo || ''}`

  async function resendInvoice(event) {
    event.preventDefault()

    if (!invoice?.token) return

    setResending(true)
    setResendMessage('')
    setResendError('')

    try {
      const payload = await apiFetch('/api/facturacion-electronica/reenviar', {
        method: 'POST',
        timeoutMs: 60000,
        body: JSON.stringify({
          token: invoice.token,
          mode: resendMode,
          emails: resendMode === 'multiple' ? resendEmails : ''
        })
      })
      const emailHints = payload.emailHints || (payload.emailHint ? [payload.emailHint] : [])

      setResendMessage(
        emailHints.length
          ? `Factura reenviada a: ${emailHints.join(', ')}.`
          : payload.message
      )
      setResendDialogOpen(false)
    } catch (error) {
      setResendError(error.message)
    } finally {
      setResending(false)
    }
  }

  return (
    <section className="panel electronic-invoice-result">
      <div className="electronic-invoice-heading">
        <div>
          <p className="eyebrow">Factura encontrada</p>
          <h2>{reference}</h2>
          <p className="muted">{invoice.empresaNombre}</p>
        </div>
        <span className="status-pill">{invoice.estado}</span>
      </div>

      <dl className="detail-list">
        <dt>Cliente</dt>
        <dd>{invoice.cliente || 'Cliente IDEASA'}</dd>
        <dt>NIT o cedula del comprador</dt>
        <dd>{invoice.documento || 'No disponible'}</dd>
        <dt>Fecha</dt>
        <dd>{formatDate(invoice.fecha)}</dd>
        <dt>Total</dt>
        <dd>{formatCurrency(invoice.total)}</dd>
        {invoice.cufe ? (
          <>
            <dt>CUFE</dt>
            <dd>{invoice.cufe}</dd>
          </>
        ) : null}
      </dl>

      {invoice.integrationPending ? (
        <p className="muted">
          Esta es una respuesta de prueba mientras conectamos la API REST externa de facturacion electronica.
        </p>
      ) : null}

      <div className="button-row">
        <a className="primary-button" href={`${downloadBase}&formato=pdf`}>
          <PdfIcon />
          Descargar PDF
        </a>
        <a className="secondary-button" href={`${downloadBase}&formato=xml`}>
          <XmlIcon />
          Descargar XML
        </a>
        <button
          type="button"
          className="secondary-button"
          disabled={resending || invoice.integrationPending}
          onClick={() => setResendDialogOpen(true)}
        >
          <MailIcon />
          {resending ? 'Reenviando...' : 'Reenviar factura'}
        </button>
      </div>

      {invoice.emailHint ? (
        <p className="muted">El reenvio se realiza al correo registrado en la empresa: {invoice.emailHint}.</p>
      ) : null}

      <Notice>{resendMessage}</Notice>
      <Notice type="error">{resendError}</Notice>

      {resendDialogOpen ? (
        <div className="modal-backdrop" role="presentation">
          <form className="modal-card resend-dialog" onSubmit={resendInvoice}>
            <div className="modal-heading">
              <div>
                <p className="eyebrow">Reenvio de factura</p>
                <h3>Selecciona el destino</h3>
              </div>
              <button
                type="button"
                className="ghost-button icon-only-button"
                aria-label="Cerrar"
                onClick={() => setResendDialogOpen(false)}
              >
                <svg className="button-line-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m6 6 12 12" />
                  <path d="m18 6-12 12" />
                </svg>
              </button>
            </div>

            <div className="resend-mode-grid" role="radiogroup" aria-label="Destino del reenvio">
              <button
                type="button"
                className={`resend-mode-card ${resendMode === 'registered' ? 'active' : ''}`}
                onClick={() => setResendMode('registered')}
              >
                <MailIcon />
                <span>
                  <strong>Correo registrado</strong>
                  <small>{invoice.emailHint || 'Usa el correo registrado en la empresa.'}</small>
                </span>
              </button>
              <button
                type="button"
                className={`resend-mode-card ${resendMode === 'multiple' ? 'active' : ''}`}
                onClick={() => setResendMode('multiple')}
              >
                <UsersIcon />
                <span>
                  <strong>Varios correos</strong>
                  <small>Escríbelos bien y separados por comas.</small>
                </span>
              </button>
            </div>

            {resendMode === 'multiple' ? (
              <label>
                Correos destino
                <textarea
                  value={resendEmails}
                  onChange={event => setResendEmails(event.target.value)}
                  placeholder="correo1@empresa.com, correo2@empresa.com"
                  rows={3}
                  required
                />
              </label>
            ) : null}

            <Notice type="error">{resendError}</Notice>

            <div className="button-row modal-actions">
              <button type="submit" className="primary-button" disabled={resending}>
                <MailIcon />
                {resending ? 'Reenviando...' : 'Confirmar reenvio'}
              </button>
              <button type="button" className="secondary-button" onClick={() => setResendDialogOpen(false)}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  )
}
