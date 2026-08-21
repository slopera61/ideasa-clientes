import Link from 'next/link'
import { useState } from 'react'

import AuthShell from '../../components/AuthShell'
import ElectronicInvoiceResult from '../../components/ElectronicInvoiceResult'
import Notice from '../../components/Notice'
import { apiFetch } from '../../lib/client/api'

const initialForm = {
  empresa: '002',
  prefijo: '',
  consecutivo: '',
  documento: ''
}

const prefijoHelp =
  'La factura comienza con un prefijo y luego el número. Ejemplo: si la factura es PAFE12345, el prefijo es PAFE.'

export default function DescargarFacturaElectronica() {
  const [form, setForm] = useState(initialForm)
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function updateField(name, value) {
    setForm(current => ({ ...current, [name]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    setLoading(true)
    setInvoice(null)
    setError('')

    try {
      const payload = await apiFetch('/api/facturacion-electronica/buscar', {
        method: 'POST',
        body: JSON.stringify(form)
      })

      setInvoice(payload.invoice)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Descargar factura"
      eyebrow="Facturacion electronica"
      layout="balanced"
      visualEyebrow="Descarga segura"
      visualTitle="Busca tu factura por empresa, prefijo y número de factura."
      visualDescription="El portal valida la consulta desde backend antes de permitir la descarga del PDF o XML."
    >
      <h2>Descarga tu factura electronica</h2>
      <p className="muted">Ingresa la empresa, el prefijo de la factura, el número de factura y el documento del comprador.</p>

      <form className="grid-form public-form" onSubmit={submit}>
        <label>
          Empresa
          <select value={form.empresa} onChange={event => updateField('empresa', event.target.value)} required>
            <option value="002">Pinturas Idea</option>
            <option value="003">Pinturas Industriales</option>
          </select>
        </label>
        <label>
          NIT o cedula del comprador
          <input value={form.documento} onChange={event => updateField('documento', event.target.value)} required />
        </label>
        <label>
          <span className="label-with-help">
            Prefijo factura
            <span className="field-help" tabIndex="0" aria-label={prefijoHelp} data-tooltip={prefijoHelp}>
              ?
            </span>
          </span>
          <input
            value={form.prefijo}
            onChange={event => updateField('prefijo', event.target.value)}
            placeholder="Ej. PAFE"
            required
          />
        </label>
        <label>
          Número de factura
          <input
            value={form.consecutivo}
            onChange={event => updateField('consecutivo', event.target.value)}
            placeholder="Ej. 12345"
            required
          />
        </label>
        <button type="submit" className="primary-button" disabled={loading}>
          {loading ? 'Consultando...' : 'Buscar factura'}
        </button>
        <Link href="/facturacion-electronica" className="secondary-button">
          Volver
        </Link>
      </form>

      <Notice type="error">{error}</Notice>
      <ElectronicInvoiceResult invoice={invoice} />
    </AuthShell>
  )
}
