import { allowMethods } from '../../../lib/server/api'
import { findAdminByEmail } from '../../../lib/server/admin-data'
import { findClientByDocument } from '../../../lib/server/client-data'
import { isHealthcheckAuthorized } from '../../../lib/server/healthcheck'
import { isEmailIdentifier, maskEmail, normalizeDocument, normalizeEmail } from '../../../lib/server/otp'

function accountSummary(account, isAdminLogin) {
  if (!account) {
    return {
      found: false,
      hasEmail: false,
      emailHint: '',
      type: isAdminLogin ? 'admin' : 'client'
    }
  }

  return {
    found: true,
    hasEmail: Boolean(account.email),
    emailHint: account.email ? maskEmail(account.email) : '',
    type: isAdminLogin ? 'admin' : 'client',
    companies: Array.isArray(account.accounts)
      ? account.accounts.map(item => ({
          empresa: item.empresa,
          empresaNombre: item.empresaNombre,
          hasCodCliente: Boolean(item.codCliente)
        }))
      : undefined,
    role: account.rol || undefined
  }
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET'])) return

  if (!isHealthcheckAuthorized(req)) {
    res.status(404).json({ error: 'No encontrado.' })

    return
  }

  const rawIdentifier = String(req.query.identifier || '')
  const isAdminLogin = isEmailIdentifier(rawIdentifier)
  const identifier = isAdminLogin ? normalizeEmail(rawIdentifier) : normalizeDocument(rawIdentifier)

  if (!identifier) {
    res.status(400).json({ error: 'Indica identifier.' })

    return
  }

  try {
    const account = isAdminLogin ? await findAdminByEmail(identifier) : await findClientByDocument(identifier)

    res.status(200).json({
      ok: true,
      checkedAt: new Date().toISOString(),
      identifierType: isAdminLogin ? 'email' : 'document',
      identifierLength: identifier.length,
      account: accountSummary(account, isAdminLogin)
    })
  } catch (error) {
    console.error('Auth lookup healthcheck failed', error)
    res.status(502).json({
      ok: false,
      checkedAt: new Date().toISOString(),
      code: 'AUTH_LOOKUP_FAILED',
      message: error.message || 'No pudimos consultar el acceso.'
    })
  }
}
