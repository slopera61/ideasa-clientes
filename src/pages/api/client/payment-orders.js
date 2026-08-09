import { allowMethods, requireClientSession, sendApiError } from '../../../lib/server/api'
import { getOpenInvoices, getOpenInvoicesForAccounts } from '../../../lib/server/client-data'
import { createPaymentOrder, listPaymentOrders } from '../../../lib/server/payments'

function invoiceKey(invoice) {
  return `${invoice.empresa || ''}:${invoice.serie || ''}:${String(invoice.numero || '')}`
}

function getSessionCodClientes(session) {
  const accounts = Array.isArray(session.accounts) ? session.accounts : []
  const ids = [...new Set(accounts.map(account => account.codCliente).filter(Boolean))]

  return ids.length > 0 ? ids : [session.codCliente].filter(Boolean)
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET', 'POST'])) return

  const session = requireClientSession(req, res)

  if (!session) return

  try {
    if (req.method === 'GET') {
      const history = await listPaymentOrders(getSessionCodClientes(session))

      res.status(200).json(history)

      return
    }

    const provider = req.body?.provider === 'mercadopago' ? 'mercadopago' : 'wompi'
    const requestedInvoices = Array.isArray(req.body?.invoices) ? req.body.invoices : []

    if (requestedInvoices.length === 0) {
      res.status(400).json({ error: 'Selecciona al menos una factura.' })

      return
    }

    const requestedKeys = new Set(requestedInvoices.map(invoiceKey))
    const openInvoices =
      Array.isArray(session.accounts) && session.accounts.length > 0
        ? await getOpenInvoicesForAccounts(session.accounts)
        : await getOpenInvoices(session.codCliente)
    const selectedInvoices = openInvoices.filter(invoice => requestedKeys.has(invoiceKey(invoice)))

    if (selectedInvoices.length !== requestedKeys.size) {
      res.status(400).json({ error: 'Una o más facturas no pertenecen al cliente o ya no tienen saldo.' })

      return
    }

    const order = await createPaymentOrder({
      codCliente: selectedInvoices[0]?.codCliente || session.codCliente,
      documento: session.documento,
      invoices: selectedInvoices,
      provider
    })

    res.status(201).json({ order })
  } catch (error) {
    sendApiError(res, error)
  }
}
