import { hasuraRequest } from './hasura'

export const CLIENT_COMPANY_CODES = ['002', '003']

const CLIENT_FIELDS = `
  CODCLIENTE
  NIF20
  NOMBRECLIENTE
  NOMBRECOMERCIAL
  EMPRESA
  E_MAIL
  DESCATALOGADO
  TELEFONO1
  DIRECCION1
  POBLACION
  PROVINCIA
  PAIS
  CANAL
  TIPOCLIENTE
  RIESGOCONCEDIDO
`

const INFO_FIELDS = `
  IDINFO
  IDCLIENTE
  CUPO
  CUPODISPONIBLE
  PLAZO
  TOTALDEUDA
`

const INVOICE_FIELDS = `
  CODCLIENTE
  EMPRESA
  SERIE
  NUMERO
  IMPORTE
  CUPO
  DIAS_PENDIENTES
  EDADES_CARTERA
  FECHADOCUMENTO
  FECHAVENCIMIENTO
`

export function companyName(empresa) {
  if (empresa === '002') return 'Pinturas Idea'
  if (empresa === '003') return 'Pinturas Industriales'

  return empresa || 'IDEASA'
}

function firstValue(items, key) {
  return items.find(item => item?.[key])?.[key] || ''
}

function uniqueBy(items, keyFn) {
  const seen = new Set()

  return items.filter(item => {
    const key = keyFn(item)

    if (seen.has(key)) return false

    seen.add(key)

    return true
  })
}

function accountWhere(accounts) {
  return {
    _or: accounts.map(account => ({
      CODCLIENTE: { _eq: account.codCliente },
      EMPRESA: { _eq: account.empresa }
    }))
  }
}

function invoiceWhere(accounts) {
  return {
    IMPORTE: { _gt: 0 },
    _or: accounts.map(account => ({
      CODCLIENTE: { _eq: account.codCliente },
      EMPRESA: { _eq: account.empresa }
    }))
  }
}

function toClient(row) {
  if (!row) return null

  const activo = row.DESCATALOGADO !== 'T'

  return {
    codCliente: row.CODCLIENTE,
    documento: row.NIF20,
    nombre: row.NOMBRECOMERCIAL || row.NOMBRECLIENTE || row.EMPRESA || 'Cliente IDEASA',
    razonSocial: row.NOMBRECLIENTE,
    nombreComercial: row.NOMBRECOMERCIAL,
    empresa: row.EMPRESA,
    empresaNombre: companyName(row.EMPRESA),
    email: row.E_MAIL,
    estado: activo ? 'Activo' : 'Inactivo',
    rol: 'Cliente',
    idioma: 'Español',
    telefono: row.TELEFONO1,
    direccion: row.DIRECCION1,
    poblacion: row.POBLACION,
    provincia: row.PROVINCIA,
    pais: row.PAIS,
    canal: row.CANAL,
    tipoCliente: row.TIPOCLIENTE,
    riesgoConcedido: row.RIESGOCONCEDIDO
  }
}

export function buildCombinedClient(clients) {
  const validClients = clients.filter(Boolean)
  const primary = validClients.find(client => client.email) || validClients[0]

  if (!primary) return null

  const accounts = validClients.map(client => ({
    codCliente: client.codCliente,
    documento: client.documento,
    empresa: client.empresa,
    empresaNombre: client.empresaNombre,
    nombre: client.razonSocial || client.nombre
  }))

  return {
    ...primary,
    nombre: primary.razonSocial || primary.nombre,
    razonSocial: firstValue(validClients, 'razonSocial') || primary.nombre,
    nombreComercial: firstValue(validClients, 'nombreComercial'),
    email: firstValue(validClients, 'email'),
    telefono: firstValue(validClients, 'telefono'),
    direccion: firstValue(validClients, 'direccion'),
    pais: firstValue(validClients, 'pais'),
    estado: validClients.some(client => client.estado === 'Activo') ? 'Activo' : 'Inactivo',
    empresa: undefined,
    empresaNombre: accounts.map(account => account.empresaNombre).join(' / '),
    accounts
  }
}

function toFinance(row) {
  if (!row) return null

  return {
    idInfo: row.IDINFO,
    codCliente: row.IDCLIENTE,
    cupo: Number(row.CUPO || 0),
    cupoDisponible: Number(row.CUPODISPONIBLE || 0),
    plazo: row.PLAZO,
    totalDeuda: Number(row.TOTALDEUDA || 0)
  }
}

function aggregateFinance(rows) {
  const finances = uniqueBy(rows.map(toFinance).filter(Boolean), item => item.codCliente || item.idInfo)

  return {
    cupo: finances.reduce((sum, item) => sum + item.cupo, 0),
    cupoDisponible: finances.reduce((sum, item) => sum + item.cupoDisponible, 0),
    totalDeuda: finances.reduce((sum, item) => sum + item.totalDeuda, 0),
    plazo: finances.map(item => item.plazo).filter(Boolean).join(' / ') || null
  }
}

export function toInvoice(row) {
  return {
    id: `${row.EMPRESA}-${row.SERIE || 'SIN_SERIE'}-${row.NUMERO}`,
    codCliente: row.CODCLIENTE,
    empresa: row.EMPRESA,
    empresaNombre: companyName(row.EMPRESA),
    serie: row.SERIE,
    numero: row.NUMERO,
    importe: Number(row.IMPORTE || 0),
    importeCentavos: Math.round(Number(row.IMPORTE || 0) * 100),
    cupo: Number(row.CUPO || 0),
    diasPendientes: row.DIAS_PENDIENTES,
    edadCartera: row.EDADES_CARTERA,
    fechaDocumento: row.FECHADOCUMENTO,
    fechaVencimiento: row.FECHAVENCIMIENTO
  }
}

export async function findClientsByDocument(documento) {
  const data = await hasuraRequest(
    `
      query FindClientsByDocument($documento: String!, $empresas: [String!]) {
        CLIENTES(
          where: {
            NIF20: { _eq: $documento }
            EMPRESA: { _in: $empresas }
          }
          order_by: { EMPRESA: asc }
          limit: 10
        ) {
          ${CLIENT_FIELDS}
        }
      }
    `,
    { documento, empresas: CLIENT_COMPANY_CODES }
  )

  return (data.CLIENTES || []).map(toClient).filter(Boolean)
}

export async function findClientByDocument(documento) {
  const clients = await findClientsByDocument(documento)

  return buildCombinedClient(clients)
}

export async function getClientProfileForAccounts(accounts) {
  const safeAccounts = Array.isArray(accounts) ? accounts : []

  if (safeAccounts.length === 0) {
    return { client: null, clients: [], finance: null, finances: [] }
  }

  const codClientes = uniqueBy(safeAccounts, account => account.codCliente).map(account => account.codCliente)
  const data = await hasuraRequest(
    `
      query GetClientProfileForAccounts($where: CLIENTES_bool_exp!, $codClientes: [Int!]) {
        CLIENTES(where: $where, order_by: { EMPRESA: asc }) {
          ${CLIENT_FIELDS}
        }
        INFOCLIENTE(where: { IDCLIENTE: { _in: $codClientes } }) {
          ${INFO_FIELDS}
        }
      }
    `,
    { where: accountWhere(safeAccounts), codClientes }
  )

  const clients = (data.CLIENTES || []).map(toClient).filter(Boolean)
  const finances = (data.INFOCLIENTE || []).map(toFinance).filter(Boolean)

  return {
    client: buildCombinedClient(clients),
    clients,
    finance: aggregateFinance(data.INFOCLIENTE || []),
    finances
  }
}

export async function getClientProfile(codCliente, empresa) {
  if (empresa) return getClientProfileForAccounts([{ codCliente, empresa }])

  return getClientProfileForAccounts(CLIENT_COMPANY_CODES.map(companyCode => ({ codCliente, empresa: companyCode })))
}

export async function getOpenInvoicesForAccounts(accounts) {
  const safeAccounts = Array.isArray(accounts) ? accounts : []

  if (safeAccounts.length === 0) return []

  const data = await hasuraRequest(
    `
      query GetOpenInvoices($where: CXC_EDADES_bool_exp!) {
        CXC_EDADES(
          where: $where
          order_by: { DIAS_PENDIENTES: desc }
        ) {
          ${INVOICE_FIELDS}
        }
      }
    `,
    { where: invoiceWhere(safeAccounts) }
  )

  return (data.CXC_EDADES || []).map(toInvoice)
}

export async function getOpenInvoices(codCliente, empresa) {
  if (empresa) return getOpenInvoicesForAccounts([{ codCliente, empresa }])

  return getOpenInvoicesForAccounts(CLIENT_COMPANY_CODES.map(companyCode => ({ codCliente, empresa: companyCode })))
}

export async function insertAccessCode({ codCliente, documento, emailDestino, otpHash, expiresAt, ipOrigen, userAgent }) {
  const data = await hasuraRequest(
    `
      mutation InsertAccessCode($object: cliente_codigos_acceso_insert_input!) {
        insert_cliente_codigos_acceso_one(object: $object) {
          id
        }
      }
    `,
    {
      object: {
        cod_cliente: codCliente,
        documento,
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

  return data.insert_cliente_codigos_acceso_one
}

export async function getLatestAccessCode(documento) {
  const data = await hasuraRequest(
    `
      query GetLatestAccessCode($documento: String!, $now: timestamptz!) {
        cliente_codigos_acceso(
          where: {
            documento: { _eq: $documento }
            usado: { _eq: false }
            vence_en: { _gt: $now }
          }
          order_by: { creado_en: desc }
          limit: 1
        ) {
          id
          cod_cliente
          documento
          email_destino
          otp_hash
          intentos
          vence_en
        }
      }
    `,
    { documento, now: new Date().toISOString() }
  )

  return data.cliente_codigos_acceso?.[0] || null
}

export async function incrementAccessCodeAttempts(id) {
  await hasuraRequest(
    `
      mutation IncrementAccessCodeAttempts($id: uuid!) {
        update_cliente_codigos_acceso_by_pk(
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

export async function markAccessCodeUsed(id) {
  await hasuraRequest(
    `
      mutation MarkAccessCodeUsed($id: uuid!, $usedAt: timestamptz!) {
        update_cliente_codigos_acceso_by_pk(
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

export async function listClientRequests(codClientes) {
  const ids = Array.isArray(codClientes) ? codClientes : [codClientes]
  const data = await hasuraRequest(
    `
      query ListClientRequests($codClientes: [Int!]) {
        solicitudes_actualizacion_cliente(
          where: { cod_cliente: { _in: $codClientes } }
          order_by: { creado_en: desc }
          limit: 20
        ) {
          id
          tipo
          estado
          datos_solicitados
          mensaje
          creado_en
          actualizado_en
        }
        solicitudes_factura(
          where: { cod_cliente: { _in: $codClientes } }
          order_by: { creado_en: desc }
          limit: 20
        ) {
          id
          empresa
          serie
          numero
          tipo
          estado
          mensaje
          creado_en
          actualizado_en
        }
      }
    `,
    { codClientes: ids }
  )

  return {
    perfil: data.solicitudes_actualizacion_cliente || [],
    facturas: data.solicitudes_factura || []
  }
}

export async function createProfileRequest({ codCliente, currentData, requestedData, message }) {
  const data = await hasuraRequest(
    `
      mutation CreateProfileRequest($object: solicitudes_actualizacion_cliente_insert_input!) {
        insert_solicitudes_actualizacion_cliente_one(object: $object) {
          id
          estado
          creado_en
        }
      }
    `,
    {
      object: {
        cod_cliente: codCliente,
        tipo: 'actualizacion_perfil',
        estado: 'pendiente',
        datos_actuales: currentData,
        datos_solicitados: requestedData,
        mensaje: message
      }
    }
  )

  return data.insert_solicitudes_actualizacion_cliente_one
}

export async function createInvoiceRequest({ codCliente, empresa, serie, numero, requestType, message }) {
  const data = await hasuraRequest(
    `
      mutation CreateInvoiceRequest($object: solicitudes_factura_insert_input!) {
        insert_solicitudes_factura_one(object: $object) {
          id
          estado
          creado_en
        }
      }
    `,
    {
      object: {
        cod_cliente: codCliente,
        empresa,
        serie,
        numero,
        tipo: requestType,
        estado: 'pendiente',
        mensaje: message
      }
    }
  )

  return data.insert_solicitudes_factura_one
}

export async function listAdminRequests() {
  const data = await hasuraRequest(`
    query ListAdminRequests {
      solicitudes_actualizacion_cliente(order_by: { creado_en: desc }, limit: 100) {
        id
        cod_cliente
        tipo
        estado
        datos_actuales
        datos_solicitados
        mensaje
        creado_en
        actualizado_en
      }
      solicitudes_factura(order_by: { creado_en: desc }, limit: 100) {
        id
        cod_cliente
        empresa
        serie
        numero
        tipo
        estado
        mensaje
        creado_en
        actualizado_en
      }
    }
  `)

  return {
    perfil: data.solicitudes_actualizacion_cliente || [],
    facturas: data.solicitudes_factura || []
  }
}
