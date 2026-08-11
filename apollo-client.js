import { ApolloClient, HttpLink, InMemoryCache, gql } from '@apollo/client/core'

function requireServerEnv(name) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

export function createHasuraApolloClient() {
  const endpoint = requireServerEnv('HASURA_GRAPHQL_ENDPOINT')
  const adminSecret = requireServerEnv('HASURA_ADMIN_SECRET')

  return new ApolloClient({
    ssrMode: true,
    link: new HttpLink({
      uri: endpoint,
      fetch,
      headers: {
        'x-hasura-admin-secret': adminSecret
      }
    }),
    cache: new InMemoryCache(),
    defaultOptions: {
      query: {
        fetchPolicy: 'no-cache'
      }
    }
  })
}

export async function runHasuraApolloHealthcheck() {
  const client = createHasuraApolloClient()
  const startedAt = Date.now()
  const result = await client.query({
    query: gql`
      query ApolloHealthcheck {
        __typename
      }
    `
  })

  return {
    ok: result.data?.__typename === 'query_root',
    typename: result.data?.__typename || '',
    latencyMs: Date.now() - startedAt
  }
}

export default createHasuraApolloClient
