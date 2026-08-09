import { isProduction } from './env'

function getStore() {
  if (!globalThis.__ideasaDevPaymentStore) {
    globalThis.__ideasaDevPaymentStore = {
      orders: new Map(),
      details: new Map(),
      attempts: new Map()
    }
  }

  return globalThis.__ideasaDevPaymentStore
}

function createDevId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function allowedClient(order, codCliente, codClientes) {
  const allowedCodClientes = Array.isArray(codClientes) && codClientes.length > 0 ? codClientes : [codCliente]

  return allowedCodClientes.map(String).includes(String(order?.cod_cliente))
}

export function saveDevPaymentOrder({ codCliente, reference, amountInCents, currency = 'COP', provider, invoices }) {
  if (isProduction()) return null

  const store = getStore()
  const now = new Date().toISOString()
  const order = {
    id: createDevId('dev-order'),
    cod_cliente: codCliente,
    referencia: reference,
    total_centavos: amountInCents,
    moneda: currency,
    estado: 'creada',
    proveedor_preferido: provider,
    creado_en: now,
    actualizado_en: now
  }
  const details = invoices.map(invoice => ({
    id: createDevId('dev-detail'),
    orden_pago_id: order.id,
    empresa: invoice.empresa,
    serie: invoice.serie,
    numero: String(invoice.numero),
    importe_centavos: invoice.importeCentavos,
    fecha_vencimiento: invoice.fechaVencimiento,
    creado_en: now
  }))

  store.orders.set(order.id, order)
  store.details.set(order.id, details)

  return order
}

export function getDevPaymentOrderForClient({ id, codCliente, codClientes }) {
  if (isProduction()) return null

  const order = getStore().orders.get(id)

  if (!order || !allowedClient(order, codCliente, codClientes)) return null

  return order
}

export function listDevPaymentOrders(codClientes) {
  if (isProduction()) return null

  const ids = Array.isArray(codClientes) ? codClientes.filter(Boolean) : [codClientes].filter(Boolean)
  const allowed = new Set(ids.map(String))
  const orders = [...getStore().orders.values()]
    .filter(order => allowed.has(String(order.cod_cliente)))
    .sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en))

  return {
    ordenes: orders,
    pagos: []
  }
}

export function getDevOrderDetails(orderId) {
  if (isProduction()) return null

  return getStore().details.get(orderId) || []
}

export function saveDevPaymentAttempt({ order, provider, checkoutUrl, providerPayload }) {
  if (isProduction()) return null

  const attempt = {
    id: createDevId('dev-attempt'),
    orden_pago_id: order.id,
    proveedor: provider,
    referencia: order.referencia,
    estado: 'iniciado',
    checkout_url: checkoutUrl,
    respuesta_pasarela: providerPayload,
    creado_en: new Date().toISOString()
  }

  getStore().attempts.set(attempt.id, attempt)

  return {
    id: attempt.id,
    checkout_url: attempt.checkout_url,
    estado: attempt.estado
  }
}
