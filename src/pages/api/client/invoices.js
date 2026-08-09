import { allowMethods, requireClientSession, sendApiError } from '../../../lib/server/api'
import { getOpenInvoices, getOpenInvoicesForAccounts } from '../../../lib/server/client-data'

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET'])) return

  const session = requireClientSession(req, res)

  if (!session) return

  try {
    const invoices =
      Array.isArray(session.accounts) && session.accounts.length > 0
        ? await getOpenInvoicesForAccounts(session.accounts)
        : await getOpenInvoices(session.codCliente)

    res.status(200).json({ invoices })
  } catch (error) {
    sendApiError(res, error)
  }
}
