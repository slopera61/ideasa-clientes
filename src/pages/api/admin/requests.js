import { allowMethods, requireAdminSession } from '../../../lib/server/api'
import { listAdminRequests } from '../../../lib/server/client-data'

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET'])) return

  const session = requireAdminSession(req, res)

  if (!session) return

  try {
    const requests = await listAdminRequests()

    res.status(200).json({ requests })
  } catch (error) {
    console.warn('Admin requests unavailable', error.message)
    res.status(200).json({
      requests: { perfil: [], facturas: [] },
      warning: 'Las tablas de solicitudes todavía no están disponibles en Hasura.'
    })
  }
}
