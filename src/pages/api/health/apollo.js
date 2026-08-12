import { allowMethods } from '../../../lib/server/api'
import { isHealthcheckAuthorized } from '../../../lib/server/healthcheck'
import { runHasuraApolloHealthcheck } from '../../../../apollo-client'

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET'])) return

  if (!isHealthcheckAuthorized(req)) {
    res.status(404).json({ error: 'No encontrado.' })

    return
  }

  try {
    const result = await runHasuraApolloHealthcheck()

    res.status(result.ok ? 200 : 500).json(result)
  } catch (error) {
    console.error('Apollo healthcheck failed', error)
    res.status(500).json({
      ok: false,
      checkedAt: new Date().toISOString(),
      code: 'HASURA_APOLLO_UNEXPECTED_ERROR',
      message: error.message || 'No pudimos consultar Hasura con Apollo.'
    })
  }
}
