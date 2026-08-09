import { allowMethods, requireClientSession, sendApiError } from '../../../../lib/server/api'
import { formatCents, formatDate } from '../../../../lib/format'
import { getPaymentReceiptByNumber } from '../../../../lib/server/payments'

function pdfEscape(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function paymentProviderLabel(provider) {
  if (provider === 'wompi') return 'Wompi'
  if (provider === 'mercadopago') return 'Mercado Pago'

  return provider || 'Pasarela'
}

function buildPdfBuffer({ payment, details }) {
  const rows = [
    { size: 18, text: 'IDEASA - Comprobante de pago' },
    { size: 10, text: `Comprobante: ${payment.comprobante_numero}` },
    { size: 10, text: `Referencia: ${payment.referencia}` },
    { size: 10, text: `Cliente: ${payment.documento || payment.cod_cliente}` },
    { size: 10, text: `Pasarela: ${paymentProviderLabel(payment.proveedor)}` },
    { size: 10, text: `Transaccion: ${payment.transaccion_pasarela_id}` },
    { size: 10, text: `Fecha confirmacion: ${formatDate(payment.confirmado_en)}` },
    { size: 12, text: `Total pagado: ${formatCents(payment.total_centavos)}` },
    { size: 10, text: '' },
    { size: 12, text: 'Facturas aplicadas' },
    ...details.map(detail => ({
      size: 9,
      text: `${detail.empresa || ''} ${detail.serie || ''} ${detail.numero} - ${formatCents(
        detail.importe_centavos
      )}`
    }))
  ]

  const content = rows
    .reduce(
      (commands, row, index) => {
        const leading = index === 0 ? 0 : row.size + 7

        commands.push(`/${row.size >= 12 ? 'F2' : 'F1'} ${row.size} Tf`)
        commands.push(`0 -${leading} Td`)
        commands.push(`(${pdfEscape(row.text)}) Tj`)

        return commands
      },
      ['BT', '50 742 Td']
    )
    .concat('ET')
    .join('\n')

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`
  ]
  const parts = ['%PDF-1.4\n']
  const offsets = [0]

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(parts.join('')))
    parts.push(`${index + 1} 0 obj\n${object}\nendobj\n`)
  })

  const xrefOffset = Buffer.byteLength(parts.join(''))
  const xref = [
    `xref\n0 ${objects.length + 1}`,
    '0000000000 65535 f ',
    ...offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n `),
    'trailer',
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    'startxref',
    String(xrefOffset),
    '%%EOF'
  ].join('\n')

  parts.push(xref)

  return Buffer.from(parts.join(''), 'binary')
}

function getSessionCodClientes(session) {
  const accounts = Array.isArray(session.accounts) ? session.accounts : []
  const ids = [...new Set(accounts.map(account => account.codCliente).filter(Boolean))]

  return ids.length > 0 ? ids : [session.codCliente].filter(Boolean)
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET'])) return

  const session = requireClientSession(req, res)

  if (!session) return

  try {
    const receipt = await getPaymentReceiptByNumber(req.query.receiptNumber, getSessionCodClientes(session))

    if (!receipt) {
      res.status(404).json({ error: 'Comprobante no encontrado.' })

      return
    }

    const pdf = buildPdfBuffer(receipt)
    const filename = `${receipt.payment.comprobante_numero}.pdf`

    res.setHeader('content-type', 'application/pdf')
    res.setHeader('content-disposition', `inline; filename="${filename}"`)
    res.status(200).send(pdf)
  } catch (error) {
    sendApiError(res, error)
  }
}
