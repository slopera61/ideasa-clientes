import { ApolloClient, gql, HttpLink, InMemoryCache } from '@apollo/client'

function hasuraEndpointHost() {
  try {
    return new URL(process.env.HASURA_GRAPHQL_ENDPOINT || '').host
  } catch (error) {
    return ''
  }
}

function createHasuraApolloClient() {
  return new ApolloClient({
    link: new HttpLink({
      uri: process.env.HASURA_GRAPHQL_ENDPOINT,
      headers: {
        'x-hasura-admin-secret': process.env.HASURA_ADMIN_SECRET || ''
      },
      fetch
    }),
    cache: new InMemoryCache(),
    defaultOptions: {
      query: {
        fetchPolicy: 'no-cache',
        errorPolicy: 'all'
      }
    }
  })
}

export async function runHasuraApolloHealthcheck() {
  const startedAt = Date.now()
  const hasEndpoint = Boolean(process.env.HASURA_GRAPHQL_ENDPOINT)
  const hasAdminSecret = Boolean(process.env.HASURA_ADMIN_SECRET)

  if (!hasEndpoint || !hasAdminSecret) {
    return {
      ok: false,
      checkedAt: new Date().toISOString(),
      hasEndpoint,
      hasAdminSecret,
      endpointHost: hasuraEndpointHost(),
      code: 'HASURA_ENV_MISSING'
    }
  }

  const client = createHasuraApolloClient()

  try {
    const result = await client.query({
      query: gql`
        query HasuraApolloHealthcheck {
          __typename
        }
      `
    })

    return {
      ok: !result.error,
      checkedAt: new Date().toISOString(),
      hasEndpoint,
      hasAdminSecret,
      endpointHost: hasuraEndpointHost(),
      latencyMs: Date.now() - startedAt,
      typename: result.data?.__typename || null,
      code: result.error ? 'HASURA_APOLLO_GRAPHQL_ERROR' : 'OK'
    }
  } catch (error) {
    return {
      ok: false,
      checkedAt: new Date().toISOString(),
      hasEndpoint,
      hasAdminSecret,
      endpointHost: hasuraEndpointHost(),
      latencyMs: Date.now() - startedAt,
      code: 'HASURA_APOLLO_FETCH_FAILED',
      message: error.message || 'No pudimos consultar Hasura con Apollo.'
    }
  }
}
