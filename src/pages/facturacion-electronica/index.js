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
            +
          </span>
          <strong>Solicitar registro</strong>
          <small>Envia los datos basicos para activar facturacion electronica.</small>
        </Link>
        <Link href="/facturacion-electronica/descargar" className="public-action-card">
          <span className="action-icon" aria-hidden="true">
            PDF
          </span>
          <strong>Descargar factura</strong>
          <small>Consulta con empresa, prefijo, consecutivo y NIT o cedula.</small>
        </Link>
      </div>

      <Link href="/clientes" className="secondary-button">
        Volver al ingreso de clientes
      </Link>
    </AuthShell>
  )
}
