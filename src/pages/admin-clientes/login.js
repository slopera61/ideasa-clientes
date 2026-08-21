import { useState } from 'react'
import { useRouter } from 'next/router'

import AuthShell from '../../components/AuthShell'
import Notice from '../../components/Notice'
import { apiFetch } from '../../lib/client/api'

const OTP_REQUEST_TIMEOUT_MS = 45000

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [emailHint, setEmailHint] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    setEmailHint('')

    try {
      const payload = await apiFetch('/api/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({ identifier: email }),
        timeoutMs: OTP_REQUEST_TIMEOUT_MS
      })

      sessionStorage.setItem('ideasa_identifier', email)
      sessionStorage.setItem('ideasa_email_hint', payload.emailHint || '')
      setMessage(payload.message)
      setEmailHint(payload.emailHint || '')
      router.push('/admin-clientes/verificar')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Admin clientes" eyebrow="Ingreso interno">
      <h2>Accede al panel interno</h2>
      <p className="muted">Ingresa tu correo corporativo registrado como vendedor admin.</p>
      <form className="stacked-form" onSubmit={submit}>
        <label htmlFor="email">Correo corporativo</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={event => setEmail(event.target.value)}
          placeholder="usuario@ideasa.com"
          required
        />
        <button type="submit" className="primary-button" disabled={loading}>
          {loading ? 'Validando...' : 'Enviar código'}
        </button>
      </form>
      <Notice>{message}</Notice>
      {emailHint ? (
        <Notice>
          El código va al correo registrado en la empresa: <strong>{emailHint}</strong>.
        </Notice>
      ) : null}
      <Notice type="error">{error}</Notice>
    </AuthShell>
  )
}
