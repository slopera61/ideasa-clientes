import { allowMethods, requireClientSession, sendApiError } from '../../../lib/server/api'
import {
  createMercadoPagoPreference,
  createWompiCheckoutUrl,
  getPaymentOrderCompanyForWompi,
  getPaymentOrderForClient,
  insertPaymentAttempt
} from '../../../lib/server/payments'

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return

  const session = requireClientSession(req, res)

  if (!session) return

  try {
    const provider = req.body?.provider === 'mercadopago' ? 'mercadopago' : 'wompi'
    const accountCodClientes = Array.isArray(session.accounts)
      ? [...new Set(session.accounts.map(account => account.codCliente).filter(Boolean))]
      : []
    const codClientes = accountCodClientes.length > 0 ? accountCodClientes : [session.codCliente].filter(Boolean)
    const order = await getPaymentOrderForClient({
      id: req.body?.orderId,
      codCliente: session.codCliente,
      codClientes
    })

    if (!order) {
      res.status(404).json({ error: 'Orden de pago no encontrada.' })

      return
    }

    const wompiCompanyCode = provider === 'wompi' ? await getPaymentOrderCompanyForWompi(order.id) : null
    const checkout =
      provider === 'mercadopago'
        ? await createMercadoPagoPreference({
            reference: order.referencia,
            amountInCents: order.total_centavos,
            currency: order.moneda,
            customer: session
          })
        : createWompiCheckoutUrl({
            reference: order.referencia,
            amountInCents: order.total_centavos,
            currency: order.moneda,
            customer: session,
            companyCode: wompiCompanyCode
          })

    const attempt = await insertPaymentAttempt({
      order,
      provider,
      checkoutUrl: checkout.checkoutUrl,
      providerPayload: checkout.providerPayload
    })

    res.status(201).json({ checkoutUrl: checkout.checkoutUrl, attempt })
  } catch (error) {
    sendApiError(res, error)
  }
}
