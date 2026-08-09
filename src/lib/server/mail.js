import nodemailer from 'nodemailer'

import { getEnv, requireEnv } from './env'

function smtpIsConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_FROM_EMAIL
  )
}

function smtpTimeoutMs() {
  const timeout = Number(getEnv('SMTP_TIMEOUT_MS', '8000'))

  return Number.isFinite(timeout) && timeout > 0 ? timeout : 8000
}

export async function sendOtpEmail({ to, code, clientName }) {
  if (!smtpIsConfigured()) {
    throw new Error('SMTP is not configured')
  }

  const timeout = smtpTimeoutMs()
  const transporter = nodemailer.createTransport({
    host: requireEnv('SMTP_HOST'),
    port: Number(requireEnv('SMTP_PORT')),
    secure: getEnv('SMTP_SECURE', 'false') === 'true',
    connectionTimeout: timeout,
    greetingTimeout: timeout,
    socketTimeout: timeout,
    auth: {
      user: requireEnv('SMTP_USER'),
      pass: requireEnv('SMTP_PASS')
    }
  })

  const fromName = getEnv('SMTP_FROM_NAME', 'IDEASA Pagos')
  const fromEmail = requireEnv('SMTP_FROM_EMAIL')
  const safeName = clientName || 'cliente'

  return transporter.sendMail({
    to,
    from: `"${fromName}" <${fromEmail}>`,
    subject: 'Código de acceso al portal de pagos IDEASA',
    text: `Hola ${safeName}.\n\nTu código de acceso al portal de pagos IDEASA es ${code}. Este código vence en 10 minutos.\n\nSi no solicitaste este acceso, puedes ignorar este correo.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #172033; line-height: 1.5;">
        <p>Hola ${safeName}.</p>
        <p>Tu código de acceso al portal de pagos IDEASA es:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">${code}</p>
        <p>Este código vence en 10 minutos.</p>
        <p>Si no solicitaste este acceso, puedes ignorar este correo.</p>
      </div>
    `
  })
}
