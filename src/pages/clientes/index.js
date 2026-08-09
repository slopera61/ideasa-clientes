import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'

import AuthShell from '../../components/AuthShell'
import Notice from '../../components/Notice'
import { apiFetch } from '../../lib/client/api'

export default function ClienteIngreso() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [emailHint, setEmailHint] = useState('')
  const [readyToVerify, setReadyToVerify] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    setEmailHint('')
    setReadyToVerify(false)

    try {
      const payload = await apiFetch('/api/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({ identifier })
      })

      sessionStorage.setItem('ideasa_identifier', identifier)
      sessionStorage.setItem('ideasa_email_hint', payload.emailHint || '')
      setMessage(payload.message)
      setEmailHint(payload.emailHint || '')
      setReadyToVerify(true)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Ingreso" eyebrow="Ingreso de clientes" layout="balanced">
      <h2>Accede a tu portal de pagos</h2>
      <p className="muted">Ingresa tu NIT, cédula o correo corporativo registrado en IDEASA.</p>
      <div className="public-entry-actions" aria-label="Accesos publicos de facturacion electronica">
        <Link href="/facturacion-electronica/registro" className="secondary-button">
          Solicitar facturacion electronica
        </Link>
        <Link href="/facturacion-electronica/descargar" className="secondary-button">
          Descargar factura electronica
        </Link>
      </div>
      <form className="stacked-form" onSubmit={submit}>
        <label htmlFor="identifier">NIT, cédula o correo</label>
        <input
          id="identifier"
          name="identifier"
          autoComplete="username"
          value={identifier}
          onChange={event => setIdentifier(event.target.value)}
          placeholder="Ej. 900123456 o usuario@ideasa.com"
          required
        />
        <button type="submit" className="primary-button" disabled={loading}>
          {loading ? 'Validando...' : 'Enviar código'}
        </button>
      </form>
      <Notice>{message}</Notice>
      {emailHint ? (
        <Notice>
          El código va al correo registrado: <strong>{emailHint}</strong>.
        </Notice>
      ) : null}
      {readyToVerify ? (
        <button type="button" className="secondary-button" onClick={() => router.push('/clientes/verificar')}>
          Ingresar código
        </button>
      ) : null}
      <Notice type="error">{error}</Notice>
    </AuthShell>
  )
}
