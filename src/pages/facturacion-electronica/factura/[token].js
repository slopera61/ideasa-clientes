import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

import AuthShell from '../../../components/AuthShell'
import ElectronicInvoiceResult from '../../../components/ElectronicInvoiceResult'
import Notice from '../../../components/Notice'
import { apiFetch } from '../../../lib/client/api'

export default function FacturaQrPage() {
  const router = useRouter()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!router.isReady) return

    const token = router.query.token

    if (!token) return

    setLoading(true)
    setError('')
    apiFetch(`/api/facturacion-electronica/qr?token=${encodeURIComponent(token)}`)
      .then(payload => setInvoice(payload.invoice))
      .catch(requestError => setError(requestError.message))
      .finally(() => setLoading(false))
  }, [router.isReady, router.query.token])

  return (
    <AuthShell
      title="Factura electronica"
      eyebrow="Consulta por QR"
      layout="balanced"
      visualEyebrow="QR seguro"
      visualTitle="Consulta puntual de factura electronica."
      visualDescription="El enlace del QR viaja firmado y el backend resuelve la factura antes de entregar los archivos."
    >
      <h2>Factura electronica</h2>
      <p className="muted">Consulta puntual abierta desde un enlace o codigo QR de IDEASA.</p>

      {loading ? <Notice>Consultando factura...</Notice> : null}
      <Notice type="error">{error}</Notice>
      <ElectronicInvoiceResult invoice={invoice} />

      <Link href="/facturacion-electronica/descargar" className="secondary-button">
        Buscar otra factura
      </Link>
    </AuthShell>
  )
}
