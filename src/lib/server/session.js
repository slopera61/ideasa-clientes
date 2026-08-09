import crypto from 'crypto'

import { isProduction, requireEnv } from './env'

export const SESSION_COOKIE = 'ideasa_cliente_session'
const SESSION_TTL_SECONDS = 60 * 60 * 8

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url')
}

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function sign(value) {
  return crypto.createHmac('sha256', requireEnv('CLIENT_SESSION_SECRET')).update(value).digest('base64url')
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a))
  const right = Buffer.from(String(b))

  return left.length === right.length && crypto.timingSafeEqual(left, right)
}

function parseCookies(cookieHeader = '') {
  return cookieHeader.split(';').reduce((cookies, cookie) => {
    const [rawName, ...rawValue] = cookie.trim().split('=')

    if (!rawName) return cookies

    cookies[rawName] = decodeURIComponent(rawValue.join('='))

    return cookies
  }, {})
}

function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`]

  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`)
  if (options.httpOnly) parts.push('HttpOnly')
  if (options.secure) parts.push('Secure')
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`)
  if (options.path) parts.push(`Path=${options.path}`)

  return parts.join('; ')
}

export function createClientSessionCookie(client) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  const payload = base64UrlEncode(
    JSON.stringify({
      kind: 'client',
      codCliente: client.codCliente,
      documento: client.documento,
      accounts: client.accounts || [],
      empresaNombre: client.empresaNombre,
      email: client.email,
      nombre: client.nombre,
      roles: ['cliente'],
      exp: expiresAt
    })
  )
  const signature = sign(payload)

  return serializeCookie(SESSION_COOKIE, `${payload}.${signature}`, {
    httpOnly: true,
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
    sameSite: 'Lax',
    secure: isProduction()
  })
}

export function createAdminSessionCookie(admin) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  const payload = base64UrlEncode(
    JSON.stringify({
      kind: 'admin',
      codVendedor: admin.codVendedor,
      email: admin.email,
      nombre: admin.nombre,
      rol: admin.rol,
      roles: ['admin_clientes'],
      exp: expiresAt
    })
  )
  const signature = sign(payload)

  return serializeCookie(SESSION_COOKIE, `${payload}.${signature}`, {
    httpOnly: true,
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
    sameSite: 'Lax',
    secure: isProduction()
  })
}

export function clearClientSessionCookie() {
  return serializeCookie(SESSION_COOKIE, '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
    sameSite: 'Lax',
    secure: isProduction()
  })
}

export function getClientSession(req) {
  const token = parseCookies(req.headers.cookie || '')[SESSION_COOKIE]

  if (!token) return null

  const [payload, signature] = token.split('.')

  if (!payload || !signature || !safeEqual(sign(payload), signature)) return null

  try {
    const session = JSON.parse(base64UrlDecode(payload))

    if (!session.exp || session.exp < Math.floor(Date.now() / 1000)) return null

    return session
  } catch (error) {
    return null
  }
}

export function sessionHasRole(session, role) {
  return Array.isArray(session?.roles) && session.roles.includes(role)
}
