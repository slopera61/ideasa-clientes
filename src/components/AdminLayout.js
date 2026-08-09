import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'

const adminNav = [
  { href: '/admin-clientes', label: 'Resumen', helper: 'Vista general' },
  { href: '/admin-clientes/cartera', label: 'Cartera', helper: 'Facturas y saldos' },
  { href: '/admin-clientes/solicitudes', label: 'Solicitudes', helper: 'Casos de clientes' }
]

export default function AdminLayout({ title, session, children }) {
  const router = useRouter()

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/admin-clientes/login')
  }

  return (
    <>
      <Head>
        <title>{`${title} | Admin clientes IDEASA`}</title>
        <link rel="icon" href="/images/favicon.ico" />
      </Head>
      <div className="portal-shell admin-portal-shell">
        <aside className="portal-sidebar admin-sidebar" aria-label="Menú interno">
          <Link href="/admin-clientes" className="sidebar-brand" aria-label="Inicio admin IDEASA">
            <Image src="/images/logo-ideasa.png" width={74} height={74} alt="IDEASA" priority />
            <span>
              Admin
              <small>clientes</small>
            </span>
          </Link>
          <div className="sidebar-client">
            <span className="avatar-initial">{(session?.nombre || session?.email || 'A').slice(0, 1)}</span>
            <div>
              <strong>{session?.nombre || 'Usuario interno'}</strong>
              <small>{session?.email || 'IDEASA'}</small>
            </div>
          </div>
          <p className="portal-section-label">Interno</p>
          <nav className="portal-nav">
            {adminNav.map(item => (
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
              <span className="eyebrow">Vista interna</span>
              <strong>{title}</strong>
            </div>
            <div className="portal-header-actions">
              <div className="session-box">
                <span className="avatar-initial mini">{(session?.nombre || session?.email || 'A').slice(0, 1)}</span>
                <span>{session?.nombre || session?.email}</span>
              </div>
              <button type="button" className="ghost-button" onClick={logout}>
                Salir
              </button>
            </div>
          </header>
          <main className="portal-main admin-main">
            <section className="page-header">
              <div>
                <p className="eyebrow">IDEASA</p>
                <h1>{title}</h1>
                <p>Consulta cartera global y gestiona solicitudes de clientes.</p>
              </div>
            </section>
            {children}
          </main>
        </div>
      </div>
    </>
  )
}
