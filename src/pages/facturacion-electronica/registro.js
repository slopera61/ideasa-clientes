import Link from 'next/link'
import { useState } from 'react'

import AuthShell from '../../components/AuthShell'
import Notice from '../../components/Notice'
import { apiFetch } from '../../lib/client/api'

const initialForm = {
  empresa: '002',
  tipoDocumento: 'nit',
  documento: '',
  nombre: '',
  nombreComercial: '',
  email: '',
  telefono: '',
  direccion: '',
  ciudad: '',
  departamento: '',
  responsable: '',
  notas: ''
}

export default function RegistroFacturacionElectronica() {
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [requestId, setRequestId] = useState('')
  const [integrationPending, setIntegrationPending] = useState(false)
  const [error, setError] = useState('')

  function updateField(name, value) {
    setForm(current => ({ ...current, [name]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    setRequestId('')
    setIntegrationPending(false)
    setError('')

    try {
      const payload = await apiFetch('/api/facturacion-electronica/solicitud-registro', {
        method: 'POST',
        body: JSON.stringify(form)
      })

      setMessage(payload.message)
      setRequestId(payload.request?.id || '')
      setIntegrationPending(Boolean(payload.integrationPending))
      setForm(initialForm)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Registro facturacion electronica"
      eyebrow="Solicitud de cliente"
      layout="balanced"
      visualPosition="raised"
      visualEyebrow="Registro"
      visualTitle="Datos basicos para activar facturacion electronica."
      visualDescription="La solicitud queda lista para viajar por la API interna y luego conectarse con el servicio REST externo."
    >
      <h2>Solicitar facturacion electronica</h2>
      <p className="muted">Completa los datos basicos del cliente para que el equipo valide la solicitud.</p>

      <form className="grid-form public-form" onSubmit={submit}>
        <label>
          Empresa
          <select value={form.empresa} onChange={event => updateField('empresa', event.target.value)} required>
            <option value="002">Pinturas Idea</option>
            <option value="003">Pinturas Industriales</option>
          </select>
        </label>
        <label>
          Tipo documento
          <select
            value={form.tipoDocumento}
            onChange={event => updateField('tipoDocumento', event.target.value)}
            required
          >
            <option value="nit">NIT</option>
            <option value="cedula">Cedula</option>
            <option value="ce">Cedula extranjeria</option>
          </select>
        </label>
        <label>
          NIT o cedula
          <input value={form.documento} onChange={event => updateField('documento', event.target.value)} required />
        </label>
        <label>
          Nombre o razon social
          <input value={form.nombre} onChange={event => updateField('nombre', event.target.value)} required />
        </label>
        <label>
          Nombre comercial
          <input value={form.nombreComercial} onChange={event => updateField('nombreComercial', event.target.value)} />
        </label>
        <label>
          Correo electronico
          <input
            type="email"
            value={form.email}
            onChange={event => updateField('email', event.target.value)}
            required
          />
        </label>
        <label>
          Telefono
          <input value={form.telefono} onChange={event => updateField('telefono', event.target.value)} required />
        </label>
        <label>
          Ciudad
          <input value={form.ciudad} onChange={event => updateField('ciudad', event.target.value)} />
        </label>
        <label className="span-2">
          Direccion
          <input value={form.direccion} onChange={event => updateField('direccion', event.target.value)} required />
        </label>
        <label>
          Departamento
          <input value={form.departamento} onChange={event => updateField('departamento', event.target.value)} />
        </label>
        <label>
          Responsable de contacto
          <input value={form.responsable} onChange={event => updateField('responsable', event.target.value)} />
        </label>
        <label className="span-2">
          Notas
          <textarea value={form.notas} onChange={event => updateField('notas', event.target.value)} rows={3} />
        </label>
        <button type="submit" className="primary-button" disabled={loading}>
          {loading ? 'Enviando...' : 'Enviar solicitud'}
        </button>
        <Link href="/facturacion-electronica" className="secondary-button">
          Volver
        </Link>
      </form>

      <Notice>
        {message}
        {requestId ? (
          <>
            {' '}
            Radicado: <strong>{requestId}</strong>.
          </>
        ) : null}
      </Notice>
      {integrationPending ? (
        <Notice>Flujo listo en modo prueba; quedara conectado cuando definamos la API REST externa.</Notice>
      ) : null}
      <Notice type="error">{error}</Notice>
    </AuthShell>
  )
}
