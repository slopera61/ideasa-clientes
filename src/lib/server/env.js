export function getEnv(name, fallback = '') {
  return process.env[name] || fallback
}

export function requireEnv(name) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

export function portalUrl() {
  return getEnv('NEXT_PUBLIC_PORTAL_URL', 'http://localhost:3000').replace(/\/$/, '')
}

export function isProduction() {
  return process.env.NODE_ENV === 'production'
}
