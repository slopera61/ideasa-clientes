import { allowMethods, requireClientSession, sendApiError } from '../../../lib/server/api'
import { getClientProfile, getClientProfileForAccounts } from '../../../lib/server/client-data'

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET'])) return

  const session = requireClientSession(req, res)

  if (!session) return

  try {
    const profile =
      Array.isArray(session.accounts) && session.accounts.length > 0
        ? await getClientProfileForAccounts(session.accounts)
        : await getClientProfile(session.codCliente)

    res.status(200).json(profile)
  } catch (error) {
    sendApiError(res, error)
  }
}
