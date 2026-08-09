export async function apiFetch(path, options = {}) {
  const { timeoutMs = 20000, ...fetchOptions } = options
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  const response = await fetch(path, {
    ...fetchOptions,
    signal: controller.signal,
    headers: {
      'content-type': 'application/json',
      ...(fetchOptions.headers || {})
    }
  }).catch(error => {
    if (error.name === 'AbortError') {
      throw new Error('La solicitud tardó demasiado. Inténtalo de nuevo.')
    }

    throw error
  })

  clearTimeout(timeout)

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.error || 'No pudimos completar la solicitud.')
  }

  return payload
}
