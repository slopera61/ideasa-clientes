import { allowMethods } from '../../../lib/server/api'
import { PublicInvoiceError, downloadElectronicInvoice } from '../../../lib/server/electronic-invoicing'

function sendError(res, error) {
  if (error instanceof PublicInvoiceError) {
    res.status(error.status).json({ error: error.message })

    return
  }

  console.error(error)
  res.status(500).json({ error: 'No pudimos descargar la factura electronica en este momento.' })
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET'])) return

  try {
    const file = await downloadElectronicInvoice({
      token: req.query.token,
      formato: req.query.formato
    })

    res.setHeader('content-type', file.contentType)
    res.setHeader('content-disposition', `attachment; filename="${file.filename}"`)
    res.status(200).send(file.buffer)
  } catch (error) {
    sendError(res, error)
  }
}
