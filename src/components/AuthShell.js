import Head from 'next/head'
import Image from 'next/image'

const marketBrands = [
  {
    src: 'https://cdn.shopify.com/s/files/1/0724/9756/1842/files/Pintuco-Logo-nuevo_1.png?v=1732288798',
    alt: 'Pintuco'
  },
  {
    src: 'https://cdn.shopify.com/s/files/1/0724/9756/1842/files/Atlas.png?v=1732290099',
    alt: 'Atlas'
  },
  {
    src: 'https://cdn.shopify.com/s/files/1/0724/9756/1842/files/Wagner_d1fec546-f10b-4f81-a3b3-72175446c7f6.png?v=1732290099',
    alt: 'Wagner'
  },
  {
    src: 'https://cdn.shopify.com/s/files/1/0724/9756/1842/files/graco_logo.svg?v=1732288906',
    alt: 'Graco'
  },
  {
    src: 'https://cdn.shopify.com/s/files/1/0724/9756/1842/files/Profilan.png?v=1732290099',
    alt: 'Profilan'
  },
  {
    src: 'https://cdn.shopify.com/s/files/1/0724/9756/1842/files/LOGO-INTERNACIONAL.png?v=1753707109',
    alt: 'International'
  }
]

export default function AuthShell({
  title,
  eyebrow,
  children,
  layout = 'default',
  visualPosition = 'default',
  visualEyebrow = 'Portal seguro',
  visualTitle = 'Facturas, pagos y solicitudes en un solo lugar.',
  visualDescription = 'Accede con tu documento o correo registrado en la empresa. Tus datos financieros se consultan desde nuestros servicios internos, nunca directamente desde el navegador.'
}) {
  const isVerification = /verific|c[oó]digo/i.test(`${title} ${eyebrow}`)
  const showPublicGuidance = layout === 'balanced' && !isVerification
  const visualMask = isVerification
    ? '/images/template-auth/auth-v2-mask-2-light.png'
    : '/images/template-auth/auth-v2-mask-1-light.png'
  const shellClassName = [
    'auth-shell',
    isVerification ? 'auth-shell-otp' : 'auth-shell-login',
    layout === 'balanced' ? 'auth-shell-balanced' : '',
    visualPosition === 'raised' ? 'auth-shell-visual-raised' : ''
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <Head>
        <title>{`${title} | Portal clientes IDEASA`}</title>
        <link rel="icon" href="/images/favicon.ico" />
      </Head>
      <main className={shellClassName}>
        <section className="auth-visual" aria-label="Portal de pagos IDEASA">
          <div className="auth-visual-inner">
            <Image className="auth-aside-logo" src="/images/logo-blanco.png" width={249} height={110} alt="IDEASA" priority />
            <div className="auth-visual-copy">
              <span className="visual-pill">{visualEyebrow}</span>
              <h1>{visualTitle}</h1>
              <p>{visualDescription}</p>
              <div className="auth-brand-strip" aria-label="Marcas IDEASA">
                <Image
                  src="/images/presupuestos/logo-pinturas-idea.png"
                  width={193}
                  height={60}
                  alt="Pinturas Idea"
                />
                <Image
                  src="/images/presupuestos/logo-pinturas-industriales.png"
                  width={124}
                  height={60}
                  alt="Pinturas Industriales"
                />
              </div>
              {showPublicGuidance ? (
                <div className="auth-action-hint">
                  <span>Continúa en el formulario</span>
                  <span className="auth-action-arrow" aria-hidden="true" />
                </div>
              ) : null}
              {showPublicGuidance ? (
                <div className="auth-market-brands" aria-label="Marcas que comercializa IDEASA">
                  <span>Nuestras marcas</span>
                  <div className="auth-market-brand-grid">
                    {marketBrands.map(brand => (
                      <img key={brand.alt} src={brand.src} alt={brand.alt} loading="lazy" decoding="async" />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <Image
            className="auth-visual-mask"
            src={visualMask}
            width={1920}
            height={582}
            alt=""
            aria-hidden="true"
          />
        </section>
        <section className="auth-panel">
          <Image className="auth-logo" src="/images/logo-ideasa.png" width={150} height={150} alt="IDEASA" priority />
          <p className="eyebrow">{eyebrow}</p>
          {children}
        </section>
      </main>
    </>
  )
}
