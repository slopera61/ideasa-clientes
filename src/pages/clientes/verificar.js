import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

import AuthShell from '../../components/AuthShell'
import Notice from '../../components/Notice'
import { apiFetch } from '../../lib/client/api'

export default function VerificarCodigo() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [emailHint, setEmailHint] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setIdentifier(sessionStorage.getItem('ideasa_identifier') || sessionStorage.getItem('ideasa_documento') || '')
    setEmailHint(sessionStorage.getItem('ideasa_email_hint') || '')
  }, [])

  async function submit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const payload = await apiFetch('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ identifier, code })
      })

      router.push(payload.redirectTo || '/clientes/facturas')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Verificación" eyebrow="Código de acceso">
      <h2>Confirma tu identidad</h2>
      <p className="muted">Escribe el código de seis dígitos enviado al correo registrado.</p>
      {emailHint ? <Notice>Enviamos el código a {emailHint}.</Notice> : null}
      <form className="stacked-form" onSubmit={submit}>
        <label htmlFor="code">Código</label>
        <input
          className="otp-input"
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={event => setCode(event.target.value)}
          maxLength={6}
          placeholder="000000"
          required
        />
        <button type="submit" className="primary-button" disabled={loading || !identifier}>
          {loading ? 'Verificando...' : 'Ingresar'}
        </button>
      </form>
      {!identifier ? (
        <Notice type="error">
          No encontramos una solicitud en este navegador. <Link href="/clientes">Solicita un nuevo código</Link>.
        </Notice>
      ) : null}
      <Notice type="error">{error}</Notice>
    </AuthShell>
  )
}
