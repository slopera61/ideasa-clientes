import { formatCurrency, formatDate } from '../lib/format'

export default function ElectronicInvoiceResult({ invoice }) {
  if (!invoice) return null

  const downloadBase = `/api/facturacion-electronica/descargar?token=${encodeURIComponent(invoice.token)}`
  const reference = invoice.referencia || `${invoice.prefijo || ''}${invoice.consecutivo || ''}`

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
          Descargar PDF
        </a>
        <a className="secondary-button" href={`${downloadBase}&formato=xml`}>
          Descargar XML
        </a>
      </div>
    </section>
  )
}
