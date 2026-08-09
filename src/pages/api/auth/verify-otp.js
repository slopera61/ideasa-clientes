import { allowMethods, sendApiError } from '../../../lib/server/api'
import {
  findAdminByEmail,
  getLatestAdminAccessCode,
  incrementAdminAccessCodeAttempts,
  markAdminAccessCodeUsed
} from '../../../lib/server/admin-data'
import {
  findClientByDocument,
  getLatestAccessCode,
  incrementAccessCodeAttempts,
  markAccessCodeUsed
} from '../../../lib/server/client-data'
import {
  getDevAccessCode,
  getDevAdminAccessCode,
  incrementDevAccessCodeAttempts,
  incrementDevAdminAccessCodeAttempts,
  markDevAccessCodeUsed,
  markDevAdminAccessCodeUsed
} from '../../../lib/server/dev-otp-store'
import { createAdminSessionCookie, createClientSessionCookie } from '../../../lib/server/session'
import {
  hashOtp,
  isEmailIdentifier,
  isValidOtpFormat,
  normalizeDocument,
  normalizeEmail,
  safeHashEqual
} from '../../../lib/server/otp'

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return

  try {
    const rawIdentifier = String(req.body?.identifier || req.body?.documento || '')
    const isAdminLogin = isEmailIdentifier(rawIdentifier)
    const identifier = isAdminLogin ? normalizeEmail(rawIdentifier) : normalizeDocument(rawIdentifier)
    const code = String(req.body?.code || '').trim()

    if (!identifier || !isValidOtpFormat(code)) {
      res.status(400).json({ error: 'Código no válido.' })

      return
    }

    let accessCode
    let usingDevStore = false

    try {
      accessCode = isAdminLogin ? await getLatestAdminAccessCode(identifier) : await getLatestAccessCode(identifier)
    } catch (lookupError) {
      accessCode = isAdminLogin ? getDevAdminAccessCode(identifier) : getDevAccessCode(identifier)
      usingDevStore = Boolean(accessCode)

      if (!accessCode) throw lookupError
    }

    if (!accessCode || accessCode.intentos >= 5) {
      res.status(401).json({ error: 'Código vencido o no válido.' })

      return
    }

    if (!safeHashEqual(hashOtp(identifier, code), accessCode.otp_hash)) {
      if (usingDevStore) {
        if (isAdminLogin) {
          incrementDevAdminAccessCodeAttempts(identifier)
        } else {
          incrementDevAccessCodeAttempts(identifier)
        }
      } else if (isAdminLogin) {
        await incrementAdminAccessCodeAttempts(accessCode.id)
      } else {
        await incrementAccessCodeAttempts(accessCode.id)
      }
      res.status(401).json({ error: 'Código vencido o no válido.' })

      return
    }

    if (usingDevStore) {
      if (isAdminLogin) {
        markDevAdminAccessCodeUsed(identifier)
      } else {
        markDevAccessCodeUsed(identifier)
      }
    } else if (isAdminLogin) {
      await markAdminAccessCodeUsed(accessCode.id)
    } else {
      await markAccessCodeUsed(accessCode.id)
    }

    if (isAdminLogin) {
      const admin = accessCode.admin || (await findAdminByEmail(identifier))

      if (!admin) {
        res.status(401).json({ error: 'No pudimos crear la sesión.' })

        return
      }

      res.setHeader('Set-Cookie', createAdminSessionCookie(admin))
      res.status(200).json({ ok: true, redirectTo: '/admin-clientes' })

      return
    }

    const client = accessCode.client || (await findClientByDocument(identifier))

    if (!client) {
      res.status(401).json({ error: 'No pudimos crear la sesión.' })

      return
    }

    res.setHeader('Set-Cookie', createClientSessionCookie(client))
    res.status(200).json({ ok: true, redirectTo: '/clientes/facturas' })
  } catch (error) {
    sendApiError(res, error)
  }
}
