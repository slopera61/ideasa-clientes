import { hasuraRequest } from './hasura'
import { normalizeEmail } from './otp'

const ADMIN_ROLE = 'admin'

const SELLER_FIELDS = `
  ACTIVO
  CODVENDEDOR
  DESCATALOGADO
  EMAIL
  MOBIL
  NOMBRECORTO
  NOMVENDEDOR
  PROVINCIA
  TELEFONO
`

function normalizeRole(value) {
  return String(value || '').trim().toLowerCase()
}

function isActiveSeller(row) {
  const activo = row?.ACTIVO
  const descatalogado = String(row?.DESCATALOGADO || '').trim().toUpperCase()

  return activo !== false && activo !== 0 && activo !== '0' && descatalogado !== 'T'
}

function toAdmin(row) {
  if (!row || normalizeRole(row.PROVINCIA) !== ADMIN_ROLE || !isActiveSeller(row)) return null

  return {
    codVendedor: row.CODVENDEDOR,
    email: normalizeEmail(row.EMAIL),
    nombre: row.NOMVENDEDOR || row.NOMBRECORTO || row.EMAIL,
    nombreCorto: row.NOMBRECORTO,
    rol: ADMIN_ROLE,
    telefono: row.TELEFONO || row.MOBIL,
    activo: true
  }
}

export async function findAdminByEmail(email) {
  const normalizedEmail = normalizeEmail(email)

  if (!normalizedEmail) return null

  const data = await hasuraRequest(
    `
      query FindAdminByEmail($email: String!) {
        VENDEDORES(
          where: { EMAIL: { _like: $email } }
          limit: 20
        ) {
          ${SELLER_FIELDS}
        }
      }
    `,
    { email: `%${normalizedEmail}%` }
  )

  return (
    (data.VENDEDORES || [])
      .filter(row => normalizeEmail(row.EMAIL) === normalizedEmail)
      .map(toAdmin)
      .find(Boolean) || null
  )
}

export async function insertAdminAccessCode({ codVendedor, emailDestino, otpHash, expiresAt, ipOrigen, userAgent }) {
  const data = await hasuraRequest(
    `
      mutation InsertAdminAccessCode($object: admin_codigos_acceso_insert_input!) {
        insert_admin_codigos_acceso_one(object: $object) {
          id
        }
      }
    `,
    {
      object: {
        cod_vendedor: codVendedor,
        email_destino: emailDestino,
        otp_hash: otpHash,
        vence_en: expiresAt,
        intentos: 0,
        usado: false,
        ip_origen: ipOrigen,
        user_agent: userAgent
      }
    }
  )

  return data.insert_admin_codigos_acceso_one
}

export async function getLatestAdminAccessCode(email) {
  const data = await hasuraRequest(
    `
      query GetLatestAdminAccessCode($email: String!, $now: timestamptz!) {
        admin_codigos_acceso(
          where: {
            email_destino: { _eq: $email }
            usado: { _eq: false }
            vence_en: { _gt: $now }
          }
          order_by: { creado_en: desc }
          limit: 1
        ) {
          id
          cod_vendedor
          email_destino
          otp_hash
          intentos
          vence_en
        }
      }
    `,
    { email: normalizeEmail(email), now: new Date().toISOString() }
  )

  return data.admin_codigos_acceso?.[0] || null
}

export async function incrementAdminAccessCodeAttempts(id) {
  await hasuraRequest(
    `
      mutation IncrementAdminAccessCodeAttempts($id: uuid!) {
        update_admin_codigos_acceso_by_pk(
          pk_columns: { id: $id }
          _inc: { intentos: 1 }
        ) {
          id
        }
      }
    `,
    { id }
  )
}

export async function markAdminAccessCodeUsed(id) {
  await hasuraRequest(
    `
      mutation MarkAdminAccessCodeUsed($id: uuid!, $usedAt: timestamptz!) {
        update_admin_codigos_acceso_by_pk(
          pk_columns: { id: $id }
          _set: { usado: true, usado_en: $usedAt }
        ) {
          id
        }
      }
    `,
    { id, usedAt: new Date().toISOString() }
  )
}

export async function listAdminCarteraSummary() {
  const data = await hasuraRequest(`
    query ListAdminCarteraSummary {
      cartera002: CXC_EDADES_aggregate(where: { EMPRESA: { _eq: "002" }, IMPORTE: { _gt: 0 } }) {
        aggregate {
          count
          sum {
            IMPORTE
          }
        }
      }
      cartera003: CXC_EDADES_aggregate(where: { EMPRESA: { _eq: "003" }, IMPORTE: { _gt: 0 } }) {
        aggregate {
          count
          sum {
            IMPORTE
          }
        }
      }
      facturas: CXC_EDADES(
        where: { EMPRESA: { _in: ["002", "003"] }, IMPORTE: { _gt: 0 } }
        order_by: { DIAS_PENDIENTES: desc }
        limit: 100
      ) {
        CODCLIENTE
        EMPRESA
        SERIE
        NUMERO
        IMPORTE
        DIAS_PENDIENTES
        EDADES_CARTERA
        FECHADOCUMENTO
        FECHAVENCIMIENTO
      }
    }
  `)

  const companies = [
    {
      empresa: '002',
      empresaNombre: 'Pinturas Idea',
      facturas: data.cartera002?.aggregate?.count || 0,
      total: Number(data.cartera002?.aggregate?.sum?.IMPORTE || 0)
    },
    {
      empresa: '003',
      empresaNombre: 'Pinturas Industriales',
      facturas: data.cartera003?.aggregate?.count || 0,
      total: Number(data.cartera003?.aggregate?.sum?.IMPORTE || 0)
    }
  ]

  return {
    companies,
    total: companies.reduce((sum, item) => sum + item.total, 0),
    facturas: data.facturas || []
  }
}
