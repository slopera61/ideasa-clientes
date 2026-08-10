import crypto from 'crypto'

import { getEnv, isProduction } from './env'

export function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ''))
  const rightBuffer = Buffer.from(String(right || ''))

  if (leftBuffer.length !== rightBuffer.length) return false

  return crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

export function isHealthcheckAuthorized(req) {
  const expectedToken = getEnv('HEALTHCHECK_TOKEN')

  if (!expectedToken) return !isProduction()

  const providedToken = req.headers['x-healthcheck-token'] || req.query.token

  return safeEqual(providedToken, expectedToken)
}
