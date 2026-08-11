import { allowMethods } from '../../../lib/server/api'
import { isHealthcheckAuthorized } from '../../../lib/server/healthcheck'
import { runHasuraApolloHealthcheck } from '../../../../apollo-client'

function errorCode(error) {
  if (error.message?.includes('Missing required environment variable')) return 'APOLLO_ENV_MISSING'
  if (error.networkError) return 'APOLLO_NETWORK_ERROR'
  if (Array.isArray(error.graphQLErrors) && error.graphQLErrors.length > 0) return 'APOLLO_GRAPHQL_ERROR'

  return 'APOLLO_UNKNOWN_ERROR'
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET'])) return

  if (!isHealthcheckAuthorized(req)) {
    res.status(404).json({ error: 'No encontrado.' })

    return
  }

  try {
    const result = await runHasuraApolloHealthcheck()

    res.status(result.ok ? 200 : 502).json({
      ...result,
      checkedAt: new Date().toISOString(),
      code: result.ok ? 'APOLLO_HASURA_OK' : 'APOLLO_HASURA_RESPONSE_ERROR'
    })
  } catch (error) {
    console.error('Apollo healthcheck failed', error)
    res.status(502).json({
      ok: false,
      checkedAt: new Date().toISOString(),
      code: errorCode(error),
      message: error.message || 'No pudimos consultar Hasura con Apollo.'
    })
  }
}
