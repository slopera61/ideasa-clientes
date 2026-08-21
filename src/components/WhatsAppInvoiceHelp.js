const WHATSAPP_INVOICE_HELP_NUMBER = '573148943294'

const COMPANY_NAMES = {
  '002': 'Pinturas Idea',
  '003': 'Pinturas Industriales'
}

function compact(value) {
  return String(value || '').trim()
}

function invoiceReference(context = {}) {
  return compact(context.referencia || `${context.prefijo || ''}${context.consecutivo || ''}`)
}

function buildMessage(context = {}) {
  const reference = invoiceReference(context)
  const company = COMPANY_NAMES[compact(context.empresa)] || compact(context.empresa)
  const document = compact(context.documento)
  const lines = ['Hola IDEASA, necesito ayuda para validar una factura electronica que no pude encontrar en el portal.']

  if (reference) lines.push(`Factura: ${reference}`)
  if (company) lines.push(`Empresa: ${company}`)
  if (document) lines.push(`NIT o cedula del comprador: ${document}`)
  if (context.source === 'qr') lines.push('Consulta realizada desde codigo QR.')

  return lines.join('\n')
}

export default function WhatsAppInvoiceHelp({ context }) {
  const href = `https://wa.me/${WHATSAPP_INVOICE_HELP_NUMBER}?text=${encodeURIComponent(buildMessage(context))}`

  return (
    <div className="whatsapp-help">
      <p>No encontramos la factura. Escríbenos por WhatsApp y revisamos el caso.</p>
      <a className="secondary-button whatsapp-help-button" href={href} target="_blank" rel="noreferrer">
        <svg className="button-line-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7.5 18.5 4 20l1.1-3.8a8 8 0 1 1 2.4 2.3Z" />
          <path d="M9.2 8.8c.2-.4.4-.5.8-.5h.5c.2 0 .4.1.5.4l.7 1.6c.1.2.1.4-.1.6l-.4.5c-.1.2-.2.4 0 .6.4.8 1.1 1.5 2 2 .2.1.4.1.6-.1l.6-.5c.2-.1.4-.2.6-.1l1.5.7c.3.1.4.3.4.6v.4c0 .4-.2.7-.5.9-.5.3-1.2.5-2.1.3-2.7-.6-5.2-3-5.9-5.7-.2-.8 0-1.4.3-1.8Z" />
        </svg>
        Validar por WhatsApp
      </a>
    </div>
  )
}
