import { allowMethods, sendApiError } from '../../../lib/server/api'
import {
  fetchMercadoPagoPayment,
  recordGatewayEvent,
  registerApprovedPayment,
  validateMercadoPagoEvent
} from '../../../lib/server/payments'

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return

  const valid = validateMercadoPagoEvent(req)
  const paymentId = req.query['data.id'] || req.body?.data?.id
  const eventId = String(req.body?.id || paymentId || Date.now())

  try {
    await recordGatewayEvent({
      provider: 'mercadopago',
      eventId,
      headers: req.headers,
      payload: req.body,
      valid
    })

    if (!valid) {
      res.status(401).json({ error: 'Firma no válida.' })

      return
    }

    if ((req.query.type || req.body?.type) === 'payment' && paymentId) {
      const payment = await fetchMercadoPagoPayment(paymentId)

      if (payment.status === 'approved') {
        await registerApprovedPayment({
          provider: 'mercadopago',
          reference: payment.external_reference,
          gatewayTransactionId: String(payment.id),
          amountInCents: Math.round(Number(payment.transaction_amount || 0) * 100),
          currency: payment.currency_id || 'COP',
          rawPayload: payment
        })
      }
    }

    res.status(200).json({ ok: true })
  } catch (error) {
    sendApiError(res, error)
  }
}
