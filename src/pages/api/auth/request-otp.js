import { allowMethods, getRequestMeta } from '../../../lib/server/api'
import { findAdminByEmail, insertAdminAccessCode } from '../../../lib/server/admin-data'
import { findClientByDocument, insertAccessCode } from '../../../lib/server/client-data'
import { saveDevAccessCode, saveDevAdminAccessCode } from '../../../lib/server/dev-otp-store'
import { sendOtpEmail } from '../../../lib/server/mail'
import {
  createOtpCode,
  hashOtp,
  isEmailIdentifier,
  maskEmail,
  normalizeDocument,
  normalizeEmail
} from '../../../lib/server/otp'

const GENERIC_MESSAGE = 'Si encontramos un acceso asociado, enviaremos un código al correo registrado.'

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return

  const rawIdentifier = String(req.body?.identifier || req.body?.documento || '')
  const isAdminLogin = isEmailIdentifier(rawIdentifier)
  const identifier = isAdminLogin ? normalizeEmail(rawIdentifier) : normalizeDocument(rawIdentifier)
  let emailHint = ''

  try {
    if (identifier) {
      const account = isAdminLogin ? await findAdminByEmail(identifier) : await findClientByDocument(identifier)

      if (account?.email) {
        emailHint = maskEmail(account.email)

        const code = createOtpCode()
        const meta = getRequestMeta(req)
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
        const otpHash = hashOtp(identifier, code)

        try {
          if (isAdminLogin) {
            await insertAdminAccessCode({
              codVendedor: account.codVendedor,
              emailDestino: account.email,
              otpHash,
              expiresAt,
              ipOrigen: meta.ip,
              userAgent: meta.userAgent
            })
          } else {
            await insertAccessCode({
              codCliente: account.codCliente,
              documento: identifier,
              emailDestino: account.email,
              otpHash,
              expiresAt,
              ipOrigen: meta.ip,
              userAgent: meta.userAgent
            })
          }
        } catch (persistError) {
          const devRecord = isAdminLogin
            ? saveDevAdminAccessCode({
                codVendedor: account.codVendedor,
                emailDestino: account.email,
                otpHash,
                expiresAt,
                admin: account
              })
            : saveDevAccessCode({
                codCliente: account.codCliente,
                documento: identifier,
                emailDestino: account.email,
                otpHash,
                expiresAt,
                client: account
              })

          if (!devRecord) throw persistError

          console.warn('OTP stored in development memory fallback', persistError.message)
        }

        try {
          const deliveryInfo = await sendOtpEmail({ to: account.email, code, clientName: account.nombre })

          if (process.env.NODE_ENV !== 'production') {
            console.info('OTP email accepted', {
              to: maskEmail(account.email),
              accepted: (deliveryInfo.accepted || []).map(maskEmail),
              rejected: (deliveryInfo.rejected || []).map(maskEmail),
              response: deliveryInfo.response || ''
            })
          }
        } catch (deliveryError) {
          console.error('OTP delivery failed', deliveryError)
        }
      }
    }
  } catch (error) {
    console.error('OTP request failed', error)
  }

  res.status(200).json({ message: GENERIC_MESSAGE, emailHint })
}
