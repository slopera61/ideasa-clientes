import Link from 'next/link'

import AuthShell from '../../components/AuthShell'

export default function FacturacionElectronicaHome() {
  return (
    <AuthShell
      title="Facturacion electronica"
      eyebrow="Servicios publicos"
      layout="balanced"
      visualEyebrow="IDEASA clientes"
      visualTitle="Facturacion electronica para Pinturas Idea e Industriales."
      visualDescription="Consulta, descarga y solicita soporte desde un modulo publico conectado a la API interna del portal."
    >
      <h2>Facturacion electronica</h2>
      <p className="muted">
        Solicita el registro para facturacion electronica o descarga una factura emitida por IDEASA.
      </p>

      <div className="public-action-grid">
        <Link href="/facturacion-electronica/registro" className="public-action-card">
          <span className="action-icon" aria-hidden="true">
            <svg className="action-line-icon" viewBox="0 0 24 24">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </span>
          <strong>Solicitar registro</strong>
          <small>Envia los datos basicos para activar facturacion electronica.</small>
        </Link>
        <Link href="/facturacion-electronica/descargar" className="public-action-card">
          <span className="action-icon" aria-hidden="true">
            <svg className="action-line-icon" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
              <path d="M14 2v6h6" />
              <path d="M12 18v-6" />
              <path d="m9 15 3 3 3-3" />
            </svg>
          </span>
          <strong>Descargar factura</strong>
          <small>Consulta con empresa, prefijo, número de factura y NIT o cedula del comprador.</small>
        </Link>
      </div>

      <Link href="/clientes" className="secondary-button">
        Volver al ingreso de clientes
      </Link>
    </AuthShell>
  )
}
