import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'

import AuthShell from '../../components/AuthShell'
import Notice from '../../components/Notice'
import { apiFetch } from '../../lib/client/api'

const OTP_REQUEST_TIMEOUT_MS = 45000
const OTP_PROGRESS_LIMIT = 94

export default function ClienteIngreso() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
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
    setProgress(12)

    const startedAt = Date.now()
    const progressTimer = setInterval(() => {
      setProgress(current => {
        const elapsed = Date.now() - startedAt
        const nextProgress = 12 + Math.round((elapsed / OTP_REQUEST_TIMEOUT_MS) * 82)

        return Math.max(current, Math.min(OTP_PROGRESS_LIMIT, nextProgress))
      })
    }, 700)

    try {
      const payload = await apiFetch('/api/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({ identifier }),
        timeoutMs: OTP_REQUEST_TIMEOUT_MS
      })

      sessionStorage.setItem('ideasa_identifier', identifier)
      sessionStorage.setItem('ideasa_email_hint', payload.emailHint || '')
      setProgress(100)
      setMessage(payload.message)
      setEmailHint(payload.emailHint || '')
      setReadyToVerify(true)
    } catch (requestError) {
      setProgress(0)
      setError(requestError.message)
    } finally {
      clearInterval(progressTimer)
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Ingreso" eyebrow="Ingreso de clientes" layout="balanced">
      <h2>Accede a tu portal de pagos</h2>
      <p className="muted">Ingresa tu NIT, cédula del comprador o correo corporativo registrado en IDEASA.</p>
      <div className="public-entry-actions" aria-label="Accesos publicos de facturacion electronica">
        <Link href="/facturacion-electronica/registro" className="secondary-button">
          <svg className="button-line-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
          Solicitar facturacion electronica
        </Link>
        <Link href="/facturacion-electronica/descargar" className="secondary-button">
          <svg className="button-line-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
            <path d="M14 2v6h6" />
            <path d="M12 18v-6" />
            <path d="m9 15 3 3 3-3" />
          </svg>
          Descargar factura electronica
        </Link>
      </div>
      <form className="stacked-form" onSubmit={submit}>
        <label htmlFor="identifier">NIT, cédula del comprador o correo</label>
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
      {loading || progress === 100 ? (
        <div className="request-progress" role="status" aria-live="polite">
          <div className="request-progress-header">
            <span>{progress === 100 ? 'Código enviado' : 'Enviando código'}</span>
            <strong>{progress}%</strong>
          </div>
          <div className="request-progress-track" aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </div>
          <small>Estamos validando tu acceso y enviando el código al correo registrado en la empresa.</small>
        </div>
      ) : null}
      <Notice>{message}</Notice>
      {emailHint ? (
        <Notice>
          El código va al correo registrado en la empresa: <strong>{emailHint}</strong>.
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
