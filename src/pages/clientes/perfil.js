import { useEffect, useState } from 'react'

import Notice from '../../components/Notice'
import PageHeader from '../../components/PageHeader'
import PortalLayout from '../../components/PortalLayout'
import { withClientSession } from '../../components/ProtectedPage'
import { apiFetch } from '../../lib/client/api'
import { formatCurrency } from '../../lib/format'

export const getServerSideProps = withClientSession()

const DATA_REQUEST_TIMEOUT_MS = 60000
const DATA_PROGRESS_LIMIT = 95

function valueOrNA(value) {
  return value === undefined || value === null || value === '' ? 'N/A' : value
}

export default function PerfilPage({ session }) {
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ email: '', telefono: '', direccion: '', mensaje: '' })
  const [loading, setLoading] = useState(true)
  const [loadProgress, setLoadProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const startedAt = Date.now()
    const progressTimer = setInterval(() => {
      setLoadProgress(current => {
        const elapsed = Date.now() - startedAt
        const nextProgress = 10 + Math.round((elapsed / DATA_REQUEST_TIMEOUT_MS) * 85)

        return Math.max(current, Math.min(DATA_PROGRESS_LIMIT, nextProgress))
      })
    }, 700)

    setLoading(true)
    setLoadProgress(10)
    setError('')

    apiFetch('/api/client/me', { timeoutMs: DATA_REQUEST_TIMEOUT_MS })
      .then(payload => {
        if (!active) return

        setProfile(payload)
        setForm({
          email: payload.client?.email || '',
          telefono: payload.client?.telefono || '',
          direccion: payload.client?.direccion || '',
          mensaje: ''
        })
      })
      .catch(requestError => {
        if (!active) return

        setError(requestError.message)
      })
      .finally(() => {
        if (!active) return

        clearInterval(progressTimer)
        setLoadProgress(100)
        setLoading(false)
      })

    return () => {
      active = false
      clearInterval(progressTimer)
    }
  }, [])

  async function submit(event) {
    event.preventDefault()
    setMessage('')
    setError('')

    try {
      await apiFetch('/api/client/requests', {
        method: 'POST',
        body: JSON.stringify({
          kind: 'perfil',
          requestedData: {
            email: form.email,
            telefono: form.telefono,
            direccion: form.direccion
          },
          message: form.mensaje
        })
      })
      setMessage('Recibimos tu solicitud. Un usuario interno revisará el cambio.')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const client = profile?.client
  const finance = profile?.finance
  const companyProfiles = profile?.clients || []

  return (
    <PortalLayout title="Mi perfil" session={session}>
      <PageHeader
        eyebrow="Datos del cliente"
        title="Mi perfil"
        description="Información registrada en CLIENTES para el documento con acceso al portal."
      />
      <Notice>{message}</Notice>
      <Notice type="error">{error}</Notice>
      {loading ? (
        <div className="request-progress data-progress" role="status" aria-live="polite">
          <div className="request-progress-header">
            <span>Consultando perfil y resumen financiero</span>
            <strong>{loadProgress}%</strong>
          </div>
          <div className="request-progress-track" aria-hidden="true">
            <span style={{ width: `${loadProgress}%` }} />
          </div>
          <small>Estamos consultando la información registrada del cliente y los datos de cartera disponibles.</small>
        </div>
      ) : null}
      <div className="profile-grid">
        <section className="panel profile-card">
          <div className="profile-heading">
            <span className="avatar-initial large">{(client?.nombre || 'C').slice(0, 1)}</span>
            <div>
              <h2>{valueOrNA(client?.nombre)}</h2>
              <p>{valueOrNA(client?.empresaNombre)}</p>
            </div>
          </div>
          <dl className="profile-details">
            <dt>Nombre</dt>
            <dd>{valueOrNA(client?.razonSocial || client?.nombre)}</dd>
            <dt>Nombre comercial</dt>
            <dd>{valueOrNA(client?.nombreComercial)}</dd>
            <dt>Cédula/NIT</dt>
            <dd>{valueOrNA(client?.documento)}</dd>
            <dt>Correo electrónico</dt>
            <dd>{valueOrNA(client?.email)}</dd>
            <dt>Estado</dt>
            <dd>
              <span className="status-pill">{valueOrNA(client?.estado)}</span>
            </dd>
            <dt>Rol</dt>
            <dd>{valueOrNA(client?.rol)}</dd>
            <dt>Teléfono</dt>
            <dd>{valueOrNA(client?.telefono)}</dd>
            <dt>Idioma</dt>
            <dd>{valueOrNA(client?.idioma)}</dd>
            <dt>País</dt>
            <dd>{valueOrNA(client?.pais)}</dd>
            <dt>Dirección</dt>
            <dd>{valueOrNA(client?.direccion)}</dd>
            <dt>Empresa</dt>
            <dd>{valueOrNA(client?.empresaNombre)}</dd>
          </dl>
        </section>
        <section className="panel finance-card">
          <h2>Resumen financiero</h2>
          <div className="metric-list">
            <div>
              <span>Cupo</span>
              <strong>{formatCurrency(finance?.cupo)}</strong>
            </div>
            <div>
              <span>Cupo disponible</span>
              <strong>{formatCurrency(finance?.cupoDisponible)}</strong>
            </div>
            <div>
              <span>Deuda total</span>
              <strong>{formatCurrency(finance?.totalDeuda)}</strong>
            </div>
            <div>
              <span>Plazo</span>
              <strong>{valueOrNA(finance?.plazo)}</strong>
            </div>
          </div>
        </section>
      </div>
      {companyProfiles.length > 1 ? (
        <section className="company-profile-section">
          <h2>Perfiles por empresa</h2>
          <div className="company-profile-grid">
            {companyProfiles.map(companyClient => (
              <article className="company-profile-card" key={`${companyClient.empresa}-${companyClient.codCliente}`}>
                <div className="company-profile-card-header">
                  <div>
                    <span className="status-pill">{valueOrNA(companyClient.empresaNombre)}</span>
                    <h3>{valueOrNA(companyClient.razonSocial || companyClient.nombre)}</h3>
                  </div>
                </div>
                <dl className="compact-details">
                  <dt>Nombre comercial</dt>
                  <dd>{valueOrNA(companyClient.nombreComercial)}</dd>
                  <dt>Cédula/NIT</dt>
                  <dd>{valueOrNA(companyClient.documento)}</dd>
                  <dt>Correo</dt>
                  <dd>{valueOrNA(companyClient.email)}</dd>
                  <dt>Teléfono</dt>
                  <dd>{valueOrNA(companyClient.telefono)}</dd>
                  <dt>País</dt>
                  <dd>{valueOrNA(companyClient.pais)}</dd>
                  <dt>Dirección</dt>
                  <dd>{valueOrNA(companyClient.direccion)}</dd>
                  <dt>Estado</dt>
                  <dd>{valueOrNA(companyClient.estado)}</dd>
                </dl>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      <section className="panel">
        <h2>Solicitud de actualización</h2>
        <p className="muted">
          Estimado cliente, si desea realizar cambio de algo de la información, puede ponerlo acá y con gusto el
          personal realizará el cambio.
        </p>
        <form className="grid-form" onSubmit={submit}>
          <label>
            Correo
            <input value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} />
          </label>
          <label>
            Teléfono
            <input value={form.telefono} onChange={event => setForm({ ...form, telefono: event.target.value })} />
          </label>
          <label className="span-2">
            Dirección
            <input value={form.direccion} onChange={event => setForm({ ...form, direccion: event.target.value })} />
          </label>
          <label className="span-2">
            Comentario
            <textarea
              value={form.mensaje}
              onChange={event => setForm({ ...form, mensaje: event.target.value })}
              rows={4}
            />
          </label>
          <button type="submit" className="primary-button">
            Enviar solicitud
          </button>
        </form>
      </section>
    </PortalLayout>
  )
}
