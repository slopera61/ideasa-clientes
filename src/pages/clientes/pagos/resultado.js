import Link from 'next/link'
import { useRouter } from 'next/router'

import PageHeader from '../../../components/PageHeader'
import PortalLayout from '../../../components/PortalLayout'
import { withClientSession } from '../../../components/ProtectedPage'

export const getServerSideProps = withClientSession()

export default function ResultadoPagoPage({ session }) {
  const router = useRouter()
  const { provider, reference, status, id } = router.query

  return (
    <PortalLayout title="Resultado de pago" session={session}>
      <PageHeader
        eyebrow="Resultado visual"
        title="Estamos verificando tu pago"
        description="La confirmación contable depende del webhook de la pasarela. Esta pantalla solo muestra el regreso del checkout."
      />
      <section className="panel result-panel">
        <dl className="detail-list">
          <dt>Pasarela</dt>
          <dd>{provider || '-'}</dd>
          <dt>Referencia</dt>
          <dd>{reference || '-'}</dd>
          <dt>Estado informado</dt>
          <dd>{status || 'pendiente de webhook'}</dd>
          <dt>ID transacción</dt>
          <dd>{id || '-'}</dd>
        </dl>
        <div className="button-row">
          <Link className="primary-button" href="/clientes/pagos">
            Ver mis pagos
          </Link>
          <Link className="secondary-button" href="/clientes/facturas">
            Volver a facturas
          </Link>
        </div>
      </section>
    </PortalLayout>
  )
}
