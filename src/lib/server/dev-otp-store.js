import { isProduction } from './env'

function getStore() {
  if (!globalThis.__ideasaDevOtpStore) {
    globalThis.__ideasaDevOtpStore = new Map()
  }

  return globalThis.__ideasaDevOtpStore
}

export function saveDevAccessCode({ documento, codCliente, emailDestino, otpHash, expiresAt, client }) {
  if (isProduction()) return null

  const record = {
    id: `dev-${Date.now()}`,
    cod_cliente: codCliente,
    documento,
    email_destino: emailDestino,
    otp_hash: otpHash,
    intentos: 0,
    vence_en: expiresAt,
    usado: false,
    client
  }

  getStore().set(documento, record)

  return record
}

export function saveDevAdminAccessCode({ emailDestino, codVendedor, otpHash, expiresAt, admin }) {
  if (isProduction()) return null

  const record = {
    id: `dev-admin-${Date.now()}`,
    cod_vendedor: codVendedor,
    email_destino: emailDestino,
    otp_hash: otpHash,
    intentos: 0,
    vence_en: expiresAt,
    usado: false,
    admin
  }

  getStore().set(`admin:${emailDestino.toLowerCase()}`, record)

  return record
}

export function getDevAccessCode(documento) {
  if (isProduction()) return null

  const record = getStore().get(documento)

  if (!record || record.usado || new Date(record.vence_en).getTime() <= Date.now()) return null

  return record
}

export function getDevAdminAccessCode(email) {
  if (isProduction()) return null

  const record = getStore().get(`admin:${String(email || '').toLowerCase()}`)

  if (!record || record.usado || new Date(record.vence_en).getTime() <= Date.now()) return null

  return record
}

export function incrementDevAccessCodeAttempts(documento) {
  const record = getDevAccessCode(documento)

  if (record) record.intentos += 1
}

export function incrementDevAdminAccessCodeAttempts(email) {
  const record = getDevAdminAccessCode(email)

  if (record) record.intentos += 1
}

export function markDevAccessCodeUsed(documento) {
  const record = getDevAccessCode(documento)

  if (record) record.usado = true
}

export function markDevAdminAccessCodeUsed(email) {
  const record = getDevAdminAccessCode(email)

  if (record) record.usado = true
}
