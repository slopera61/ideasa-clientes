import crypto from 'crypto'

import {
  getDevOrderDetails,
  getDevPaymentOrderForClient,
  listDevPaymentOrders,
  saveDevPaymentAttempt,
  saveDevPaymentOrder
} from './dev-payment-store'
import { getEnv, portalUrl, requireEnv } from './env'
import { hasuraRequest } from './hasura'

const WOMPI_COMPANY_CODES = ['002', '003']

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function constantTimeEqual(a, b) {
  const left = Buffer.from(String(a || '').toLowerCase())
  const right = Buffer.from(String(b || '').toLowerCase())

  return left.length === right.length && crypto.timingSafeEqual(left, right)
}

function getNestedValue(source, path) {
  return path
    .split('.')
    .reduce((value, key) => (value === undefined || value === null ? undefined : value[key]), source)
}

function parseMercadoPagoSignature(header = '') {
  return header.split(',').reduce((parts, item) => {
    const [key, value] = item.split('=')

    if (key && value) parts[key.trim()] = value.trim()

    return parts
  }, {})
}

function getScopedEnv(name, companyCode) {
  const normalizedCompanyCode = String(companyCode || '').trim()

  if (normalizedCompanyCode) {
    const scopedValue = getEnv(`${name}_${normalizedCompanyCode}`)

    if (scopedValue) return scopedValue
  }

  return getEnv(name)
}

function requireScopedEnv(name, companyCode) {
  const value = getScopedEnv(name, companyCode)

  if (!value) {
    const suffix = companyCode ? `_${companyCode}` : ''

    throw new Error(`Missing required environment variable: ${name}${suffix}`)
  }

  return value
}

function getWompiEventSecrets() {
  const secrets = []
  const seen = new Set()

  WOMPI_COMPANY_CODES.forEach(companyCode => {
    const secret = getScopedEnv('WOMPI_EVENTS_SECRET', companyCode)

    if (secret && !seen.has(secret)) {
      secrets.push({ companyCode, secret })
      seen.add(secret)
    }
  })

  const globalSecret = getEnv('WOMPI_EVENTS_SECRET')

  if (globalSecret && !seen.has(globalSecret)) {
    secrets.push({ companyCode: null, secret: globalSecret })
  }

  return secrets
}

function getInvoiceCompanies(invoices) {
  return [
    ...new Set(
      (Array.isArray(invoices) ? invoices : []).map(invoice => String(invoice?.empresa || '').trim()).filter(Boolean)
    )
  ]
}

function resolveSingleCompanyForWompi(invoices) {
  const companies = getInvoiceCompanies(invoices)

  if (companies.length !== 1) {
    throw new Error('Para pagar con Wompi, selecciona facturas de una sola empresa.')
  }

  return companies[0]
}

function buildWompiRedirectUrl({ reference, companyCode }) {
  const configuredPortalUrl = portalUrl()
  const redirectUrl = `${configuredPortalUrl}/clientes/pagos/resultado?provider=wompi&company=${encodeURIComponent(
    companyCode || ''
  )}&reference=${encodeURIComponent(reference)}`

  try {
    const parsedUrl = new URL(redirectUrl)
    const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(parsedUrl.hostname)

    if (parsedUrl.protocol !== 'https:' || isLocalHost) return ''

    return redirectUrl
  } catch (error) {
    return ''
  }
}

export function createWompiCheckoutUrl({ reference, amountInCents, currency = 'COP', customer, companyCode }) {
  const publicKey = requireScopedEnv('WOMPI_PUBLIC_KEY', companyCode)
  const integritySecret = requireScopedEnv('WOMPI_INTEGRITY_SECRET', companyCode)
  const redirectUrl = buildWompiRedirectUrl({ reference, companyCode })
  const signature = sha256(`${reference}${amountInCents}${currency}${integritySecret}`)
  const url = new URL('https://checkout.wompi.co/p/')

  url.searchParams.set('public-key', publicKey)
  url.searchParams.set('currency', currency)
  url.searchParams.set('amount-in-cents', String(amountInCents))
  url.searchParams.set('reference', reference)
  url.searchParams.set('signature:integrity', signature)

  if (redirectUrl) url.searchParams.set('redirect-url', redirectUrl)

  if (customer?.email) url.searchParams.set('customer-data:email', customer.email)
  if (customer?.nombre) url.searchParams.set('customer-data:full-name', customer.nombre)
  if (customer?.documento) {
    url.searchParams.set('customer-data:legal-id', customer.documento)
    url.searchParams.set('customer-data:legal-id-type', customer.documento.length > 9 ? 'NIT' : 'CC')
  }

  return {
    checkoutUrl: url.toString(),
    providerPayload: {
      reference,
      amountInCents,
      currency,
      companyCode,
      signature
    }
  }
}

export function validateWompiEvent(req, event) {
  const checksum = req.headers['x-event-checksum'] || event?.signature?.checksum
  const properties = event?.signature?.properties || []

  if (!checksum || !Array.isArray(properties) || !event?.timestamp) return false

  const values = properties.map(property => {
    const normalized = property.startsWith('transaction.') ? `data.${property}` : property

    return getNestedValue(event, normalized)
  })

  if (values.some(value => value === undefined || value === null)) return false

  const signedPayload = `${values.join('')}${event.timestamp}`
  const secrets = getWompiEventSecrets()

  return secrets.some(({ secret }) => constantTimeEqual(sha256(`${signedPayload}${secret}`), checksum))
}

export function validateMercadoPagoEvent(req) {
  const signatureHeader = Array.isArray(req.headers['x-signature'])
    ? req.headers['x-signature'][0]
    : req.headers['x-signature']
  const requestId = Array.isArray(req.headers['x-request-id'])
    ? req.headers['x-request-id'][0]
    : req.headers['x-request-id']
  const dataId = req.query['data.id'] || req.body?.data?.id
  const parts = parseMercadoPagoSignature(signatureHeader)

  if (!parts.ts || !parts.v1) return false

  const manifestParts = []

  if (dataId) manifestParts.push(`id:${dataId}`)
  if (requestId) manifestParts.push(`request-id:${requestId}`)
  manifestParts.push(`ts:${parts.ts}`)

  const manifest = `${manifestParts.join(';')};`
  const expected = crypto.createHmac('sha256', requireEnv('MERCADOPAGO_WEBHOOK_SECRET')).update(manifest).digest('hex')

  return constantTimeEqual(expected, parts.v1)
}

export async function createMercadoPagoPreference({ reference, amountInCents, currency = 'COP', customer }) {
  const accessToken = requireEnv('MERCADOPAGO_ACCESS_TOKEN')
  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      items: [
        {
          title: `Pago facturas IDEASA ${reference}`,
          quantity: 1,
          currency_id: currency,
          unit_price: amountInCents / 100
        }
      ],
      payer: {
        email: customer?.email
      },
      external_reference: reference,
      notification_url: `${portalUrl()}/api/webhooks/mercadopago?source_news=webhooks`,
      back_urls: {
        success: `${portalUrl()}/clientes/pagos/resultado?provider=mercadopago&reference=${encodeURIComponent(
          reference
        )}&status=success`,
        pending: `${portalUrl()}/clientes/pagos/resultado?provider=mercadopago&reference=${encodeURIComponent(
          reference
        )}&status=pending`,
        failure: `${portalUrl()}/clientes/pagos/resultado?provider=mercadopago&reference=${encodeURIComponent(
          reference
        )}&status=failure`
      },
      auto_return: 'approved'
    })
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    console.error('Mercado Pago preference failed', payload)
    throw new Error('No pudimos iniciar el pago en Mercado Pago.')
  }

  return {
    checkoutUrl: payload.init_point || payload.sandbox_init_point,
    providerPayload: payload
  }
}

export async function fetchMercadoPagoPayment(paymentId) {
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: {
      authorization: `Bearer ${requireEnv('MERCADOPAGO_ACCESS_TOKEN')}`
    }
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    console.error('Mercado Pago payment fetch failed', payload)
    throw new Error('No pudimos validar el pago en Mercado Pago.')
  }

  return payload
}

export function generatePaymentReference(identifier) {
  return `IDEASA-${identifier}-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
}

export function generateReceiptNumber(reference) {
  return `CP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(reference || '')
    .replace(/[^0-9a-zA-Z]/g, '')
    .slice(-8)
    .toUpperCase()}`
}

export async function createPaymentOrder({ codCliente, documento, invoices, provider }) {
  const amountInCents = invoices.reduce((total, invoice) => total + invoice.importeCentavos, 0)

  if (amountInCents <= 0) {
    throw new Error('Selecciona al menos una factura con saldo pendiente.')
  }

  if (provider === 'wompi') {
    resolveSingleCompanyForWompi(invoices)
  }

  const reference = generatePaymentReference(documento || codCliente)
  let savedOrder

  try {
    const order = await hasuraRequest(
      `
        mutation CreatePaymentOrder($object: ordenes_pago_insert_input!) {
          insert_ordenes_pago_one(object: $object) {
            id
            cod_cliente
            referencia
            total_centavos
            moneda
            estado
            proveedor_preferido
            creado_en
          }
        }
      `,
      {
        object: {
          cod_cliente: codCliente,
          documento,
          referencia: reference,
          proveedor_preferido: provider,
          total_centavos: amountInCents,
          moneda: 'COP',
          estado: 'creada'
        }
      }
    )

    savedOrder = order.insert_ordenes_pago_one

    await hasuraRequest(
      `
        mutation InsertPaymentOrderDetails($objects: [ordenes_pago_detalle_insert_input!]!) {
          insert_ordenes_pago_detalle(objects: $objects) {
            affected_rows
          }
        }
      `,
      {
        objects: invoices.map(invoice => ({
          orden_pago_id: savedOrder.id,
          empresa: invoice.empresa,
          serie: invoice.serie,
          numero: String(invoice.numero),
          importe_centavos: invoice.importeCentavos,
          fecha_vencimiento: invoice.fechaVencimiento
        }))
      }
    )
  } catch (error) {
    const devOrder = saveDevPaymentOrder({
      codCliente,
      reference,
      amountInCents,
      currency: 'COP',
      provider,
      invoices
    })

    if (!devOrder) throw error

    console.warn('Payment order stored in development memory fallback', error.message)

    return devOrder
  }

  return savedOrder
}

export async function getPaymentOrderForClient({ id, codCliente, codClientes }) {
  let data

  try {
    data = await hasuraRequest(
      `
        query GetPaymentOrderForClient($id: uniqueidentifier!) {
          ordenes_pago_by_pk(id: $id) {
            id
            cod_cliente
            referencia
            total_centavos
            moneda
            estado
            proveedor_preferido
          }
        }
      `,
      { id }
    )
  } catch (error) {
    const devOrder = getDevPaymentOrderForClient({ id, codCliente, codClientes })

    if (!devOrder) throw error

    console.warn('Payment order loaded from development memory fallback', error.message)

    return devOrder
  }

  const order = data.ordenes_pago_by_pk
  const allowedCodClientes = Array.isArray(codClientes) && codClientes.length > 0 ? codClientes : [codCliente]

  if (!order || !allowedCodClientes.map(String).includes(String(order.cod_cliente))) return null

  return order
}

export async function listPaymentOrders(codClientes) {
  const ids = Array.isArray(codClientes) ? codClientes.filter(Boolean) : [codClientes].filter(Boolean)

  if (ids.length === 0) return { ordenes: [], pagos: [] }

  try {
    const data = await hasuraRequest(
      `
        query ListPaymentOrders($codClientes: [Int!]) {
          ordenes_pago(where: { cod_cliente: { _in: $codClientes } }, order_by: { creado_en: desc }, limit: 30) {
            id
            referencia
            total_centavos
            moneda
            estado
            proveedor_preferido
            creado_en
          }
          pagos(where: { cod_cliente: { _in: $codClientes } }, order_by: { confirmado_en: desc }, limit: 30) {
            id
            referencia
            proveedor
            transaccion_pasarela_id
            total_centavos
            moneda
            estado
            confirmado_en
          }
        }
      `,
      { codClientes: ids }
    )

    return {
      ordenes: data.ordenes_pago || [],
      pagos: data.pagos || []
    }
  } catch (error) {
    const history = listDevPaymentOrders(ids)

    if (!history) throw error

    console.warn('Payment history loaded from development memory fallback', error.message)

    return history
  }
}

export async function getPaymentReceiptByNumber(receiptNumber, codClientes) {
  const safeReceiptNumber = String(receiptNumber || '').replace(/\.pdf$/i, '')

  if (!safeReceiptNumber) return null

  const data = await hasuraRequest(
    `
      query GetPaymentReceiptByNumber($receiptNumber: String!) {
        pagos(where: { comprobante_numero: { _eq: $receiptNumber } }, limit: 1) {
          id
          orden_pago_id
          cod_cliente
          documento
          referencia
          proveedor
          transaccion_pasarela_id
          total_centavos
          moneda
          estado
          confirmado_en
          comprobante_numero
          creado_en
        }
      }
    `,
    { receiptNumber: safeReceiptNumber }
  )
  const payment = data.pagos?.[0]

  if (!payment) return null

  const allowedCodClientes = Array.isArray(codClientes) && codClientes.length > 0 ? codClientes : []

  if (allowedCodClientes.length > 0 && !allowedCodClientes.map(String).includes(String(payment.cod_cliente))) {
    return null
  }

  const details = await getOrderDetails(payment.orden_pago_id)

  return { payment, details }
}

export async function insertPaymentAttempt({ order, provider, checkoutUrl, providerPayload }) {
  try {
    const data = await hasuraRequest(
      `
        mutation InsertPaymentAttempt($object: intentos_pago_insert_input!) {
          insert_intentos_pago_one(object: $object) {
            id
            checkout_url
            estado
          }
        }
      `,
      {
        object: {
          orden_pago_id: order.id,
          proveedor: provider,
          referencia: order.referencia,
          estado: 'iniciado',
          checkout_url: checkoutUrl,
          respuesta_pasarela: providerPayload
        }
      }
    )

    return data.insert_intentos_pago_one
  } catch (error) {
    const devAttempt = saveDevPaymentAttempt({ order, provider, checkoutUrl, providerPayload })

    if (!devAttempt) throw error

    console.warn('Payment attempt stored in development memory fallback', error.message)

    return devAttempt
  }
}

export async function getPaymentOrderCompanyForWompi(orderId) {
  let details

  try {
    details = await getOrderDetails(orderId)
  } catch (error) {
    details = getDevOrderDetails(orderId)

    if (!details) throw error

    console.warn('Payment order details loaded from development memory fallback', error.message)
  }

  return resolveSingleCompanyForWompi(details)
}

async function getOrderDetails(orderId) {
  try {
    const data = await hasuraRequest(
      `
        query GetOrderDetails($orderId: uniqueidentifier!) {
          ordenes_pago_detalle(where: { orden_pago_id: { _eq: $orderId } }) {
            id
            empresa
            serie
            numero
            importe_centavos
          }
        }
      `,
      { orderId }
    )

    return data.ordenes_pago_detalle || []
  } catch (error) {
    const details = getDevOrderDetails(orderId)

    if (!details) throw error

    return details
  }
}

export async function recordGatewayEvent({ provider, eventId, headers, payload, valid }) {
  try {
    await hasuraRequest(
      `
        mutation RecordGatewayEvent($object: eventos_pasarela_insert_input!) {
          insert_eventos_pasarela_one(object: $object) {
            id
          }
        }
      `,
      {
        object: {
          proveedor: provider,
          evento_id: eventId,
          headers,
          payload,
          firma_valida: valid
        }
      }
    )
  } catch (error) {
    if (getDevOrderDetails('health-check') === null) throw error

    console.warn('Gateway event skipped in development memory fallback', error.message)
  }
}

async function findPaymentOrderByReference(reference) {
  const data = await hasuraRequest(
    `
      query FindPaymentOrderByReference($reference: String!) {
        ordenes_pago(where: { referencia: { _eq: $reference } }, limit: 1) {
          id
          cod_cliente
          documento
          referencia
          total_centavos
          moneda
          estado
        }
      }
    `,
    { reference }
  )

  return data.ordenes_pago?.[0] || null
}

async function findExistingPayment(provider, gatewayTransactionId) {
  const data = await hasuraRequest(
    `
      query FindExistingPayment($provider: String!, $gatewayTransactionId: String!) {
        pagos(
          where: {
            proveedor: { _eq: $provider }
            transaccion_pasarela_id: { _eq: $gatewayTransactionId }
          }
          limit: 1
        ) {
          id
        }
      }
    `,
    { provider, gatewayTransactionId }
  )

  return data.pagos?.[0] || null
}
export async function registerApprovedPayment({
  provider,
  reference,
  gatewayTransactionId,
  amountInCents,
  currency = 'COP',
  rawPayload
}) {
  const order = await findPaymentOrderByReference(reference)

  if (!order) {
    throw new Error('La referencia de pago no existe.')
  }

  if (Number(order.total_centavos) !== Number(amountInCents) || order.moneda !== currency) {
    throw new Error('El monto o la moneda del pago no coinciden con la orden.')
  }

  const existingPayment = await findExistingPayment(provider, gatewayTransactionId)

  if (existingPayment) return existingPayment

  const receiptNumber = generateReceiptNumber(reference)
  const receiptGeneratedAt = new Date().toISOString()
  const paymentData = await hasuraRequest(
    `
      mutation InsertApprovedPayment($object: pagos_insert_input!) {
        insert_pagos_one(object: $object) {
          id
          comprobante_numero
        }
      }
    `,
    {
      object: {
        orden_pago_id: order.id,
        cod_cliente: order.cod_cliente,
        documento: order.documento,
        referencia: reference,
        proveedor: provider,
        transaccion_pasarela_id: gatewayTransactionId,
        total_centavos: amountInCents,
        moneda: currency,
        estado: 'aprobado',
        confirmado_en: new Date().toISOString(),
        comprobante_numero: receiptNumber,
        comprobante_pdf_path: `/api/payments/receipts/${receiptNumber}.pdf`,
        comprobante_pdf_url: `/api/payments/receipts/${receiptNumber}.pdf`,
        comprobante_generado_en: receiptGeneratedAt,
        payload_pasarela: rawPayload
      }
    }
  )

  const payment = paymentData.insert_pagos_one
  const details = await getOrderDetails(order.id)

  if (details.length > 0) {
    await hasuraRequest(
      `
        mutation InsertPaymentApplications($objects: [pagos_aplicados_insert_input!]!) {
          insert_pagos_aplicados(objects: $objects) {
            affected_rows
          }
        }
      `,
      {
        objects: details.map(detail => ({
          pago_id: payment.id,
          orden_pago_detalle_id: detail.id,
          serie: detail.serie,
          empresa: detail.empresa,
          numero: detail.numero,
          importe_centavos: detail.importe_centavos
        }))
      }
    )
  }

  await hasuraRequest(
    `
      mutation MarkOrderPaid($id: uniqueidentifier!, $updatedAt: datetimeoffset!) {
        update_ordenes_pago_by_pk(
          pk_columns: { id: $id }
          _set: { estado: "pago_confirmado", actualizado_en: $updatedAt }
        ) {
          id
        }
      }
    `,
    { id: order.id, updatedAt: new Date().toISOString() }
  )

  return payment
}
