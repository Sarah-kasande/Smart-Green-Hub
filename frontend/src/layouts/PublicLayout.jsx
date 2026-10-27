// Layout for pages anyone can see: landing page, sign in, register, password reset (UI.md 5.1).
//  - A floating "pill" menu bar in light glass (logo, page links, EN | Kinyarwanda, Sign in, Register)
//  - A footer with links, the language switch and the photo credits (free licences, Wikimedia Commons)
import { Link, Outlet, useLocation } from 'react-router-dom'
import Logo from '../components/ui/Logo'
import LanguageSwitch from '../components/ui/LanguageSwitch'
import { buttonClasses } from '../components/ui/buttonStyles'
import { homePathFor, useAuth } from '../auth/AuthContext'
import { useI18n } from '../i18n/I18nProvider'
import { PHOTO_CREDITS } from '../content/photos'

function GlassNav() {
  const { t } = useI18n()
  const { user } = useAuth()
  const onLanding = useLocation().pathname === '/'
  // On the landing page the links scroll to its sections; elsewhere they go back to the landing page
  const anchor = (id) => (onLanding ? `#${id}` : `/#${id}`)
  return (
    <div className="sticky top-0 z-30 px-3 pt-3 sm:px-4">
      <nav aria-label={t('common.menu')} className="glass mx-auto flex max-w-6xl items-center gap-2 rounded-full py-1.5 pl-2 pr-1.5 shadow-sm sm:pl-4">
        <Logo compact />
        <ul className="ml-4 hidden items-center gap-1 lg:flex">
          {[
            ['how', 'landing.navHow'],
            ['directory', 'landing.navDirectory'],
            ['impact', 'landing.navImpact'],
          ].map(([id, label]) => (
            <li key={id}>
              <a href={anchor(id)} className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-ink hover:bg-surface">
                {t(label)}
              </a>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-1.5">
          <LanguageSwitch className="rounded-full" />
          {user ? (
            <Link to={homePathFor(user.role)} className={`${buttonClasses('primary')} rounded-full`}>
              {t('nav.dashboard')}
            </Link>
          ) : (
            <>
              {/* Phones: "Sign in" is in the page itself (the bar keeps the language switch visible) */}
              <span className="hidden items-center gap-1.5 sm:flex">
                <Link to="/login" className={`${buttonClasses('ghost')} rounded-full px-3`}>
                  {t('common.signIn')}
                </Link>
                <Link to="/register" className={`${buttonClasses('primary')} rounded-full`}>
                  {t('common.register')}
                </Link>
              </span>
            </>
          )}
        </div>
      </nav>
    </div>
  )
}

function Footer() {
  const { t } = useI18n()
  return (
    <footer className="mt-12 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-ink-soft">{t('landing.free')}</p>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{t('landing.footerPlatform')}</h2>
          <ul className="mt-3 space-y-1 text-sm">
            <li>
              <a href="/#how" className="inline-flex min-h-10 items-center hover:text-teal-text">
                {t('landing.navHow')}
              </a>
            </li>
            <li>
              <a href="/#directory" className="inline-flex min-h-10 items-center hover:text-teal-text">
                {t('landing.navDirectory')}
              </a>
            </li>
            <li>
              <a href="/#impact" className="inline-flex min-h-10 items-center hover:text-teal-text">
                {t('landing.navImpact')}
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{t('landing.footerAccount')}</h2>
          <ul className="mt-3 space-y-1 text-sm">
            <li>
              <Link to="/login" className="inline-flex min-h-10 items-center hover:text-teal-text">
                {t('common.signIn')}
              </Link>
            </li>
            <li>
              <Link to="/register?role=operator" className="inline-flex min-h-10 items-center hover:text-teal-text">
                {t('landing.ctaNursery')}
              </Link>
            </li>
            <li>
              <Link to="/register?role=institution" className="inline-flex min-h-10 items-center hover:text-teal-text">
                {t('landing.ctaInstitution')}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{t('landing.footerDistricts')}</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {['Gasabo', 'Kicukiro', 'Nyarugenge'].map((d) => (
              <li key={d} className="flex min-h-10 items-center">
                {t(`districts.${d}`)}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <details className="mx-auto max-w-6xl px-4 pb-8 text-xs text-ink-soft">
        <summary className="inline-flex min-h-10 cursor-pointer items-center font-semibold">{t('landing.footerCredits')}</summary>
        <p className="mt-2">{t('landing.footerCreditsText')}</p>
        <ul className="mt-2 space-y-1">
          {PHOTO_CREDITS.map((c) => (
            <li key={c.url}>
              <a href={c.url} target="_blank" rel="noreferrer" className="underline hover:text-teal-text">
                {c.title}
              </a>{' '}
              · {c.author} · {c.license}
            </li>
          ))}
        </ul>
      </details>
    </footer>
  )
}

export default function PublicLayout() {
  const { t } = useI18n()
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:p-3">
        {t('common.skipToContent')}
      </a>
      <GlassNav />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
