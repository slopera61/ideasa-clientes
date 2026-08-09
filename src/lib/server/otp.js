import crypto from 'crypto'

import { requireEnv } from './env'

export function normalizeDocument(value) {
  return String(value || '')
    .trim()
    .replace(/[^0-9a-zA-Z]/g, '')
    .toUpperCase()
}

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

export function isEmailIdentifier(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value))
}

export function normalizeOtpIdentifier(value) {
  return isEmailIdentifier(value) ? normalizeEmail(value) : normalizeDocument(value)
}

export function createOtpCode() {
  return crypto.randomInt(0, 1000000).toString().padStart(6, '0')
}

export function hashOtp(identifier, code) {
  return crypto
    .createHmac('sha256', requireEnv('CLIENT_SESSION_SECRET'))
    .update(`${normalizeOtpIdentifier(identifier)}:${String(code).trim()}`)
    .digest('hex')
}

export function isValidOtpFormat(code) {
  return /^\d{6}$/.test(String(code || '').trim())
}

export function maskEmail(email = '') {
  const [name, domain] = String(email).split('@')

  if (!name || !domain) return ''

  const visible = name.slice(0, 2)

  return `${visible}${'*'.repeat(Math.max(name.length - 2, 2))}@${domain}`
}

export function safeHashEqual(a, b) {
  const left = Buffer.from(String(a || ''), 'hex')
  const right = Buffer.from(String(b || ''), 'hex')

  return left.length === right.length && crypto.timingSafeEqual(left, right)
}
