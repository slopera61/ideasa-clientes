import { getClientSession, sessionHasRole } from './session'

export function allowMethods(req, res, methods) {
  if (methods.includes(req.method)) return true

  res.setHeader('Allow', methods.join(', '))
  res.status(405).json({ error: 'Método no permitido.' })

  return false
}

export function requireClientSession(req, res) {
  const session = getClientSession(req)

  if (!session) {
    res.status(401).json({ error: 'Sesión no válida.' })

    return null
  }

  return session
}

export function requireAdminSession(req, res) {
  const session = getClientSession(req)

  if (!session || !sessionHasRole(session, 'admin_clientes')) {
    res.status(401).json({ error: 'No autorizado.' })

    return null
  }

  return session
}

export function sendApiError(res, error, status = 500) {
  console.error(error)
  res.status(status).json({ error: error.message || 'No pudimos completar la solicitud.' })
}

export function getRequestMeta(req) {
  const forwardedFor = req.headers['x-forwarded-for']
  const ip = Array.isArray(forwardedFor) ? forwardedFor[0] : String(forwardedFor || req.socket.remoteAddress || '')

  return {
    ip: ip.split(',')[0].trim(),
    userAgent: req.headers['user-agent'] || ''
  }
}
