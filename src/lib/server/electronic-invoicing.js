import crypto from 'crypto'

import { getEnv, isProduction, portalUrl } from './env'

export const ELECTRONIC_INVOICE_COMPANIES = [
  { code: '002', name: 'Pinturas Idea' },
  { code: '003', name: 'Pinturas Industriales' }
]

const DEFAULT_TIMEOUT_MS = 15000
const TOKEN_VERSION = 1
const DOWNLOAD_TOKEN_TTL_MS = 30 * 60 * 1000

export class PublicInvoiceError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.name = 'PublicInvoiceError'
    this.status = status
  }
}

export function companyName(empresa) {
  return ELECTRONIC_INVOICE_COMPANIES.find(company => company.code === empresa)?.name || empresa || 'IDEASA'
}

function cleanText(value) {
  return String(value || '').trim()
}

function compact(value) {
  return cleanText(value).replace(/\s+/g, ' ')
}

function normalizeDocument(value) {
  return cleanText(value).replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
}

function normalizeEmail(value) {
  return cleanText(value).toLowerCase()
}

function normalizePrefix(value) {
  return cleanText(value).replace(/\s+/g, '').toUpperCase()
}

function normalizeConsecutive(value) {
  return cleanText(value).replace(/\s+/g, '').toUpperCase()
}

function validateCompany(empresa) {
  const company = ELECTRONIC_INVOICE_COMPANIES.find(item => item.code === cleanText(empresa))

  if (!company) {
    throw new PublicInvoiceError('Selecciona una empresa valida.')
  }

  return company.code
}

function validateEmail(email) {
  const normalized = normalizeEmail(email)

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new PublicInvoiceError('Indica un correo electronico valido.')
  }

  return normalized
}

function tokenSecret() {
  const secret = getEnv('CLIENT_SESSION_SECRET')

  if (secret) return secret

  if (isProduction()) {
    throw new Error('CLIENT_SESSION_SECRET es requerido para firmar enlaces de facturacion electronica.')
  }

  return 'dev-electronic-invoicing-secret'
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url')
}

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function signPayload(encodedPayload) {
  return crypto.createHmac('sha256', tokenSecret()).update(encodedPayload).digest('base64url')
}

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(String(left || ''))
  const rightBuffer = Buffer.from(String(right || ''))

  if (leftBuffer.length !== rightBuffer.length) return false

  return crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

export function signInvoiceToken(payload, { expiresInMs = DOWNLOAD_TOKEN_TTL_MS } = {}) {
  const tokenPayload = {
    v: TOKEN_VERSION,
    ...payload,
    exp: expiresInMs ? Date.now() + expiresInMs : undefined
  }
  const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload))
  const signature = signPayload(encodedPayload)

  return `${encodedPayload}.${signature}`
}

export function verifyInvoiceToken(token) {
  const [encodedPayload, signature] = cleanText(token).split('.')

  if (!encodedPayload || !signature || !safeCompare(signPayload(encodedPayload), signature)) {
    throw new PublicInvoiceError('El enlace de factura no es valido o ya vencio.', 400)
  }

  let payload

  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload))
  } catch (error) {
    throw new PublicInvoiceError('El enlace de factura no es valido o ya vencio.', 400)
  }

  if (payload.v !== TOKEN_VERSION || (payload.exp && payload.exp < Date.now())) {
    throw new PublicInvoiceError('El enlace de factura no es valido o ya vencio.', 400)
  }

  return payload
}

function apiConfig() {
  const url = getEnv('FACTURACION_API_URL').replace(/\/$/, '')

  return {
    configured: Boolean(url),
    url,
    key: getEnv('FACTURACION_API_KEY'),
    timeoutMs: Number(getEnv('FACTURACION_API_TIMEOUT_MS')) || DEFAULT_TIMEOUT_MS,
    registrationPath: getEnv('FACTURACION_API_REGISTRATION_PATH', '/solicitudes/facturacion-electronica'),
    searchPath: getEnv('FACTURACION_API_SEARCH_PATH', '/facturas/buscar'),
    downloadPath: getEnv('FACTURACION_API_DOWNLOAD_PATH', '/facturas/descargar')
  }
}

function buildUrl(baseUrl, path) {
  if (/^https?:\/\//i.test(path)) return path

  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`
}

async function fetchJsonFromBillingApi(path, body) {
  const config = apiConfig()

  if (!config.configured) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs)

  try {
    const response = await fetch(buildUrl(config.url, path), {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        ...(config.key ? { authorization: `Bearer ${config.key}` } : {})
      },
      body: JSON.stringify(body)
    })

    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(payload.error || payload.message || 'La API de facturacion electronica no respondio correctamente.')
    }

    return payload
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('La API de facturacion electronica tardo demasiado en responder.')
    }

    throw error
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchFileFromBillingApi(path, body) {
  const config = apiConfig()

  if (!config.configured) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs)

  try {
    const response = await fetch(buildUrl(config.url, path), {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        ...(config.key ? { authorization: `Bearer ${config.key}` } : {})
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))

      throw new Error(payload.error || payload.message || 'No pudimos descargar la factura electronica.')
    }

    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      contentType: response.headers.get('content-type') || 'application/octet-stream',
      filename: filenameFromDisposition(response.headers.get('content-disposition'))
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('La API de facturacion electronica tardo demasiado en responder.')
    }

    throw error
  } finally {
    clearTimeout(timeout)
  }
}

function filenameFromDisposition(disposition) {
  const match = String(disposition || '').match(/filename="?([^"]+)"?/i)

  return match?.[1] || ''
}

export function normalizeRegistrationRequest(body, meta = {}) {
  const empresa = validateCompany(body?.empresa)
  const documento = normalizeDocument(body?.documento)
  const email = validateEmail(body?.email)
  const nombre = compact(body?.nombre)
  const telefono = compact(body?.telefono)
  const direccion = compact(body?.direccion)

  if (!documento) throw new PublicInvoiceError('Indica el NIT o cedula del cliente.')
  if (!nombre) throw new PublicInvoiceError('Indica el nombre o razon social.')
  if (!telefono) throw new PublicInvoiceError('Indica un telefono de contacto.')
  if (!direccion) throw new PublicInvoiceError('Indica la direccion principal.')

  return {
    empresa,
    empresaNombre: companyName(empresa),
    tipoDocumento: cleanText(body?.tipoDocumento || 'nit').toLowerCase(),
    documento,
    nombre,
    nombreComercial: compact(body?.nombreComercial),
    email,
    telefono,
    direccion,
    ciudad: compact(body?.ciudad),
    departamento: compact(body?.departamento),
    responsable: compact(body?.responsable),
    notas: compact(body?.notas),
    origen: 'portal-clientes',
    ipOrigen: meta.ip || '',
    userAgent: meta.userAgent || ''
  }
}

export function normalizeInvoiceLookup(body, { requireDocument = true } = {}) {
  const empresa = validateCompany(body?.empresa)
  const prefijo = normalizePrefix(body?.prefijo)
  const consecutivo = normalizeConsecutive(body?.consecutivo)
  const documento = normalizeDocument(body?.documento)
  const cufe = cleanText(body?.cufe).toUpperCase()

  if (!cufe && (!prefijo || !consecutivo)) {
    throw new PublicInvoiceError('Indica el prefijo y consecutivo completo de la factura.')
  }

  if (requireDocument && !documento) {
    throw new PublicInvoiceError('Indica el NIT o cedula asociado a la factura.')
  }

  return {
    empresa,
    empresaNombre: companyName(empresa),
    prefijo,
    consecutivo,
    referencia: cufe || `${prefijo}${consecutivo}`,
    documento,
    cufe
  }
}

export async function createElectronicBillingRegistration(body, meta) {
  const request = normalizeRegistrationRequest(body, meta)
  const payload = await fetchJsonFromBillingApi(apiConfig().registrationPath, request)

  if (payload) {
    return {
      request: payload.request || payload,
      integrationPending: false,
      message: 'Recibimos tu solicitud de facturacion electronica.'
    }
  }

  return {
    request: {
      id: `FE-${Date.now()}`,
      estado: 'pendiente',
      empresa: request.empresa,
      documento: request.documento,
      email: request.email,
      creadoEn: new Date().toISOString()
    },
    integrationPending: true,
    message: 'Recibimos tu solicitud de facturacion electronica.'
  }
}

function mapInvoiceResponse(payload, lookup) {
  const invoice = payload?.invoice || payload?.factura || payload || {}
  const prefijo = invoice.prefijo || invoice.prefix || lookup.prefijo
  const consecutivo = invoice.consecutivo || invoice.numero || invoice.number || lookup.consecutivo
  const cufe = invoice.cufe || invoice.CUFE || lookup.cufe || ''
  const normalized = {
    empresa: invoice.empresa || lookup.empresa,
    empresaNombre: companyName(invoice.empresa || lookup.empresa),
    prefijo,
    consecutivo,
    referencia: invoice.referencia || invoice.reference || cufe || `${prefijo}${consecutivo}`,
    documento: invoice.documento || invoice.nit || lookup.documento,
    cliente: invoice.cliente || invoice.customerName || invoice.razonSocial || 'Cliente IDEASA',
    fecha: invoice.fecha || invoice.issueDate || invoice.createdAt || '',
    total: Number(invoice.total || invoice.valor || invoice.amount || 0),
    moneda: invoice.moneda || invoice.currency || 'COP',
    estado: invoice.estado || invoice.status || 'Disponible',
    cufe,
    facturaId: invoice.id || invoice.facturaId || invoice.invoiceId || '',
    integrationPending: false
  }

  const token = signInvoiceToken({
    empresa: normalized.empresa,
    prefijo: normalized.prefijo,
    consecutivo: normalized.consecutivo,
    documento: normalized.documento,
    cufe: normalized.cufe,
    facturaId: normalized.facturaId
  })

  return {
    ...normalized,
    token,
    qrUrl: `${portalUrl()}/facturacion-electronica/factura/${encodeURIComponent(token)}`
  }
}

function mockInvoice(lookup) {
  const token = signInvoiceToken({
    empresa: lookup.empresa,
    prefijo: lookup.prefijo,
    consecutivo: lookup.consecutivo,
    documento: lookup.documento,
    cufe: lookup.cufe
  })

  return {
    empresa: lookup.empresa,
    empresaNombre: lookup.empresaNombre,
    prefijo: lookup.prefijo,
    consecutivo: lookup.consecutivo,
    referencia: lookup.referencia,
    documento: lookup.documento,
    cliente: 'Cliente IDEASA',
    fecha: new Date().toISOString(),
    total: 0,
    moneda: 'COP',
    estado: 'Pendiente de conexion REST',
    cufe: lookup.cufe,
    integrationPending: true,
    token,
    qrUrl: `${portalUrl()}/facturacion-electronica/factura/${encodeURIComponent(token)}`
  }
}

export async function searchElectronicInvoice(body, options = {}) {
  const lookup = normalizeInvoiceLookup(body, options)
  const payload = await fetchJsonFromBillingApi(apiConfig().searchPath, lookup)

  if (payload) return mapInvoiceResponse(payload, lookup)

  return mockInvoice(lookup)
}

export async function resolveInvoiceFromToken(token) {
  const payload = verifyInvoiceToken(token)

  return searchElectronicInvoice(payload, { requireDocument: false })
}

function pdfEscape(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function buildMockPdf(invoice) {
  const lines = [
    'IDEASA - Facturacion electronica',
    `Factura: ${invoice.prefijo || ''}${invoice.consecutivo || ''}`,
    `Empresa: ${companyName(invoice.empresa)}`,
    `Documento cliente: ${invoice.documento || 'No disponible'}`,
    'Documento de prueba generado mientras se conecta la API REST externa.'
  ]
  const text = lines.map((line, index) => `${index === 0 ? '72 760 Td' : '0 -24 Td'} (${pdfEscape(line)}) Tj`).join('\n')
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${text.length + 31} >>\nstream\nBT\n/F1 12 Tf\n${text}\nET\nendstream\nendobj\n`
  ]
  let pdf = '%PDF-1.4\n'
  const offsets = [0]

  objects.forEach(object => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'))
    pdf += object
  })

  const xrefOffset = Buffer.byteLength(pdf, 'latin1')
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  pdf += offsets
    .slice(1)
    .map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`)
    .join('')
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return Buffer.from(pdf, 'latin1')
}

function buildMockXml(invoice) {
  return Buffer.from(
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<facturaElectronica estado="pendiente-integracion">',
      `  <empresa>${companyName(invoice.empresa)}</empresa>`,
      `  <referencia>${invoice.prefijo || ''}${invoice.consecutivo || ''}</referencia>`,
      `  <documentoCliente>${invoice.documento || ''}</documentoCliente>`,
      '  <nota>Documento de prueba generado mientras se conecta la API REST externa.</nota>',
      '</facturaElectronica>'
    ].join('\n'),
    'utf8'
  )
}

export async function downloadElectronicInvoice({ token, formato }) {
  const invoice = verifyInvoiceToken(token)
  const safeFormat = cleanText(formato || 'pdf').toLowerCase()
  const { v, exp, ...invoiceLookup } = invoice

  if (!['pdf', 'xml'].includes(safeFormat)) {
    throw new PublicInvoiceError('Selecciona un formato de descarga valido.')
  }

  const file = await fetchFileFromBillingApi(apiConfig().downloadPath, {
    ...invoiceLookup,
    formato: safeFormat
  })

  if (file) {
    return {
      ...file,
      filename: file.filename || `factura-electronica-${invoice.prefijo || ''}${invoice.consecutivo || ''}.${safeFormat}`
    }
  }

  if (safeFormat === 'xml') {
    return {
      buffer: buildMockXml(invoice),
      contentType: 'application/xml; charset=utf-8',
      filename: `factura-electronica-${invoice.prefijo || ''}${invoice.consecutivo || ''}.xml`
    }
  }

  return {
    buffer: buildMockPdf(invoice),
    contentType: 'application/pdf',
    filename: `factura-electronica-${invoice.prefijo || ''}${invoice.consecutivo || ''}.pdf`
  }
}
