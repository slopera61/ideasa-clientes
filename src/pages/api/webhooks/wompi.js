import { allowMethods, sendApiError } from '../../../lib/server/api'
import { recordGatewayEvent, registerApprovedPayment, validateWompiEvent } from '../../../lib/server/payments'

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return

  const valid = validateWompiEvent(req, req.body)
  const transaction = req.body?.data?.transaction || {}
  const eventId = `${req.body?.event || 'event'}:${transaction.id || 'without-id'}:${req.body?.timestamp || Date.now()}`

  try {
    await recordGatewayEvent({
      provider: 'wompi',
      eventId,
      headers: req.headers,
      payload: req.body,
      valid
    })

    if (!valid) {
      res.status(401).json({ error: 'Firma no válida.' })

      return
    }

    if (req.body?.event === 'transaction.updated' && transaction.status === 'APPROVED') {
      await registerApprovedPayment({
        provider: 'wompi',
        reference: transaction.reference,
        gatewayTransactionId: String(transaction.id),
        amountInCents: transaction.amount_in_cents || transaction.amountInCents,
        currency: transaction.currency || 'COP',
        rawPayload: req.body
      })
    }

    res.status(200).json({ ok: true })
  } catch (error) {
    sendApiError(res, error)
  }
}
