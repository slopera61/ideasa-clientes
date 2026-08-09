import { allowMethods, requireClientSession, sendApiError } from '../../../lib/server/api'
import {
  createInvoiceRequest,
  createProfileRequest,
  getClientProfileForAccounts,
  listClientRequests
} from '../../../lib/server/client-data'

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
      const requests = await listClientRequests(getSessionCodClientes(session))

      res.status(200).json({ requests })

      return
    }

    if (req.body?.kind === 'perfil') {
      const profile = await getClientProfileForAccounts(session.accounts)
      const request = await createProfileRequest({
        codCliente: session.codCliente,
        currentData: profile.client,
        requestedData: req.body.requestedData || {},
        message: req.body.message || ''
      })

      res.status(201).json({ request })

      return
    }

    if (req.body?.kind === 'factura') {
      const numero = String(req.body.numero || '').trim()
      const empresa = String(req.body.empresa || '').trim()
      const account = (Array.isArray(session.accounts) ? session.accounts : []).find(item => item.empresa === empresa)

      if (!empresa || !numero || !req.body.message) {
        res.status(400).json({ error: 'Indica la empresa, la factura y el mensaje de la solicitud.' })

        return
      }

      if (!account) {
        res.status(400).json({ error: 'La empresa de la factura no pertenece a la sesión del cliente.' })

        return
      }

      const request = await createInvoiceRequest({
        codCliente: account.codCliente,
        empresa,
        serie: String(req.body.serie || '').trim(),
        numero,
        requestType: String(req.body.requestType || 'reclamo'),
        message: String(req.body.message || '').trim()
      })

      res.status(201).json({ request })

      return
    }

    res.status(400).json({ error: 'Tipo de solicitud no válido.' })
  } catch (error) {
    sendApiError(res, error)
  }
}
