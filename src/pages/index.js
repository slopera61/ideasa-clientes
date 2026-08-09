export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/clientes',
      permanent: false
    }
  }
}

export default function Home() {
  return null
}
