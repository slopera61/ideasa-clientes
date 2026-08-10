import crypto from 'crypto'

import { allowMethods } from '../../../lib/server/api'
import { getEnv, isProduction } from '../../../lib/server/env'

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ''))
  const rightBuffer = Buffer.from(String(right || ''))

  if (leftBuffer.length !== rightBuffer.length) return false

  return crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

function isAuthorized(req) {
  const expectedToken = getEnv('HEALTHCHECK_TOKEN')

  if (!expectedToken) return !isProduction()

  const providedToken = req.headers['x-healthcheck-token'] || req.query.token

  return safeEqual(providedToken, expectedToken)
}

function endpointHost(endpoint) {
  try {
    return new URL(endpoint).host
  } catch (error) {
    return ''
  }
}

function errorCode(error) {
  if (error.name === 'AbortError') return 'HASURA_TIMEOUT'
  if (error.name === 'TypeError') return 'HASURA_FETCH_FAILED'

  return 'HASURA_UNKNOWN_ERROR'
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET'])) return

  if (!isAuthorized(req)) {
    res.status(404).json({ error: 'No encontrado.' })

    return
  }

  const endpoint = getEnv('HASURA_GRAPHQL_ENDPOINT')
  const adminSecret = getEnv('HASURA_ADMIN_SECRET')
  const startedAt = Date.now()
  const result = {
    ok: false,
    checkedAt: new Date().toISOString(),
    hasEndpoint: Boolean(endpoint),
    hasAdminSecret: Boolean(adminSecret),
    endpointHost: endpointHost(endpoint),
    latencyMs: 0
  }

  if (!endpoint || !adminSecret) {
    res.status(500).json({
      ...result,
      code: 'HASURA_ENV_MISSING'
    })

    return
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'x-hasura-admin-secret': adminSecret
      },
      body: JSON.stringify({ query: 'query Healthcheck { __typename }' })
    })
    const payload = await response.json().catch(() => ({}))
    const hasErrors = Array.isArray(payload.errors) && payload.errors.length > 0

    res.status(response.ok && !hasErrors ? 200 : 502).json({
      ...result,
      ok: response.ok && !hasErrors,
      status: response.status,
      latencyMs: Date.now() - startedAt,
      code: response.ok && !hasErrors ? 'HASURA_OK' : 'HASURA_RESPONSE_ERROR',
      message: hasErrors ? payload.errors[0]?.message || 'Hasura respondio con error.' : undefined
    })
  } catch (error) {
    res.status(502).json({
      ...result,
      latencyMs: Date.now() - startedAt,
      code: errorCode(error)
    })
  } finally {
    clearTimeout(timeout)
  }
}
