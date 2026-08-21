import { allowMethods } from '../../../lib/server/api'
import { PublicInvoiceError, resendElectronicInvoiceEmail } from '../../../lib/server/electronic-invoicing'

function sendError(res, error) {
  if (error instanceof PublicInvoiceError) {
    res.status(error.status).json({ error: error.message })

    return
  }

  console.error(error)
  res.status(500).json({ error: 'No pudimos reenviar la factura electronica en este momento.' })
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return

  try {
    const result = await resendElectronicInvoiceEmail({
      token: req.body?.token,
      mode: req.body?.mode,
      emails: req.body?.emails
    })

    res.status(200).json(result)
  } catch (error) {
    sendError(res, error)
  }
}
