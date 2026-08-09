import { requireEnv } from './env'

export async function hasuraRequest(query, variables = {}) {
  const endpoint = requireEnv('HASURA_GRAPHQL_ENDPOINT')
  const adminSecret = requireEnv('HASURA_ADMIN_SECRET')

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-hasura-admin-secret': adminSecret
    },
    body: JSON.stringify({ query, variables })
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok || payload.errors) {
    console.error('Hasura request failed', {
      status: response.status,
      errors: payload.errors
    })

    throw new Error('No pudimos consultar la información en este momento.')
  }

  return payload.data
}
