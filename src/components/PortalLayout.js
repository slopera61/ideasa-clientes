import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'

const navItems = [
  { href: '/clientes/facturas', label: 'Mis facturas', helper: 'Cartera y pagos' },
  { href: '/clientes/perfil', label: 'Mi perfil', helper: 'Datos del cliente' },
  { href: '/clientes/pagos', label: 'Mis pagos', helper: 'Órdenes e historial' },
  { href: '/clientes/solicitudes', label: 'Solicitudes', helper: 'Cambios y reclamos' }
]

export default function PortalLayout({ title, session, children }) {
  const router = useRouter()
  const sessionName = session?.nombre || session?.empresaNombre || session?.documento || 'Cliente'

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/clientes')
  }

  return (
    <>
      <Head>
        <title>{`${title} | Portal clientes IDEASA`}</title>
        <link rel="icon" href="/images/favicon.ico" />
      </Head>
      <div className="portal-shell">
        <aside className="portal-sidebar" aria-label="Menú principal">
          <Link href="/clientes/facturas" className="sidebar-brand" aria-label="Inicio portal IDEASA">
            <Image src="/images/logo-ideasa.png" width={74} height={74} alt="IDEASA" priority />
            <span>
              Portal
              <small>clientes</small>
            </span>
          </Link>
          <div className="sidebar-client">
            <span className="avatar-initial">{(session?.nombre || 'Cliente').slice(0, 1)}</span>
            <div>
              <strong>{session?.nombre || 'Cliente'}</strong>
              <small>{session?.empresaNombre || 'IDEASA'}</small>
            </div>
          </div>
          <p className="portal-section-label">Menu</p>
          <nav className="portal-nav">
            {navItems.map(item => (
              <Link key={item.href} href={item.href} className={router.pathname === item.href ? 'active' : ''}>
                <span className="nav-marker" aria-hidden="true" />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.helper}</small>
                </span>
              </Link>
            ))}
          </nav>
        </aside>
        <div className="portal-content-shell">
          <header className="portal-header">
            <div>
              <span className="eyebrow">IDEASA</span>
              <strong>{title}</strong>
            </div>
            <div className="portal-header-actions">
              <div className="session-box">
                <span className="avatar-initial mini">{sessionName.slice(0, 1)}</span>
                <span className="session-name">{sessionName}</span>
              </div>
              <button type="button" className="ghost-button" onClick={logout}>
                Salir
              </button>
            </div>
          </header>
          <main className="portal-main">{children}</main>
        </div>
      </div>
    </>
  )
}
