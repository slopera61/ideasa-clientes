import { allowMethods } from '../../../lib/server/api'
import { clearClientSessionCookie } from '../../../lib/server/session'

export default function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return

  res.setHeader('Set-Cookie', clearClientSessionCookie())
  res.status(200).json({ ok: true })
}
