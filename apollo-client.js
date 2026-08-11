import { ApolloClient, InMemoryCache, HttpLink, split } from '@apollo/client'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { createClient } from 'graphql-ws'
import { getMainDefinition } from '@apollo/client/utilities'
import { persistCache, LocalStorageWrapper } from 'apollo3-cache-persist'

const cache = new InMemoryCache()

const httpLink = new HttpLink({
  uri: 'https://pinturasidea.com/v1/graphql',
  headers: {
    'x-hasura-admin-secret': 'ideasasecret2023/*.secret'
  }
})

const wsLink =
  typeof window !== 'undefined'
    ? new GraphQLWsLink(
        createClient({
          url: 'ws://79.125.59.101:8080/v1/graphql',
          connectionParams: {
            headers: {
              'x-hasura-admin-secret': 'ideasasecret2023/*.secret'
            }
          }
        })
      )
    : null

const splitLink =
  typeof window !== 'undefined' && wsLink != null
    ? split(
        ({ query }) => {
          const definition = getMainDefinition(query)

          return definition.kind === 'OperationDefinition' && definition.operation === 'subscription'
        },
        wsLink,
        httpLink
      )
    : httpLink

// ** Función asincrónica para persistir el caché
const persistCacheAsync = async () => {
  try {
    if (typeof window !== 'undefined') {
      // Código que utiliza window.localStorage
      await persistCache({
        cache,
        storage: new LocalStorageWrapper(window.localStorage)
      })
    }
  } catch (error) {
    console.error('Error persisting cache:', error)
  }
}

persistCacheAsync()

const client = new ApolloClient({
  link: splitLink,
  cache
})

export default client
