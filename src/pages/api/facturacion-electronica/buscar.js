import { allowMethods } from '../../../lib/server/api'
import { PublicInvoiceError, searchElectronicInvoice } from '../../../lib/server/electronic-invoicing'

function sendError(res, error) {
  if (error instanceof PublicInvoiceError) {
    res.status(error.status).json({ error: error.message })

    return
  }

  console.error(error)
  res.status(500).json({ error: 'No pudimos consultar la factura electronica en este momento.' })
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return

  try {
    const invoice = await searchElectronicInvoice(req.body || {})

    res.status(200).json({ invoice })
  } catch (error) {
    sendError(res, error)
  }
}
