import { allowMethods, requireAdminSession, sendApiError } from '../../../lib/server/api'
import { listAdminCarteraSummary } from '../../../lib/server/admin-data'

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET'])) return

  const session = requireAdminSession(req, res)

  if (!session) return

  try {
    const cartera = await listAdminCarteraSummary()

    res.status(200).json({ cartera })
  } catch (error) {
    sendApiError(res, error)
  }
}
