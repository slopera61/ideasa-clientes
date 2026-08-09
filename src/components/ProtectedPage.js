import { getClientSession } from '../lib/server/session'

export function withClientSession() {
  return async function getServerSideProps({ req }) {
    const session = getClientSession(req)

    if (!session) {
      return {
        redirect: {
          destination: '/clientes',
          permanent: false
        }
      }
    }

    return { props: { session } }
  }
}

export function withAdminSession() {
  return async function getServerSideProps({ req }) {
    const session = getClientSession(req)

    if (!session || !Array.isArray(session.roles) || !session.roles.includes('admin_clientes')) {
      return {
        redirect: {
          destination: '/clientes',
          permanent: false
        }
      }
    }

    return { props: { session } }
  }
}
