import { allowMethods, getRequestMeta } from '../../../lib/server/api'
import {
  PublicInvoiceError,
  createElectronicBillingRegistration
} from '../../../lib/server/electronic-invoicing'

function sendError(res, error) {
  if (error instanceof PublicInvoiceError) {
    res.status(error.status).json({ error: error.message })

    return
  }

  console.error(error)
  res.status(500).json({ error: 'No pudimos registrar la solicitud en este momento.' })
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return

  try {
    const payload = await createElectronicBillingRegistration(req.body || {}, getRequestMeta(req))

    res.status(payload.integrationPending ? 202 : 201).json(payload)
  } catch (error) {
    sendError(res, error)
  }
}
