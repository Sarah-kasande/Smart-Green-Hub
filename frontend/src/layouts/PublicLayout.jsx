// Layout for pages anyone can see: landing page, sign in, register, password reset.
import { Link, Outlet } from 'react-router-dom'
import Logo from '../components/ui/Logo'
import LanguageSwitch from '../components/ui/LanguageSwitch'
import { buttonClasses } from '../components/ui/buttonStyles'
import { homePathFor, useAuth } from '../auth/AuthContext'
import { useI18n } from '../i18n/I18nProvider'

export default function PublicLayout() {
  const { t } = useI18n()
  const { user } = useAuth()

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3">
        {t('common.skipToContent')}
      </a>
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2">
          <Logo />
          <div className="flex flex-wrap items-center gap-2">
            <LanguageSwitch />
            {user ? (
              <Link to={homePathFor(user.role)} className={buttonClasses('primary')}>
                {t('nav.home')}
              </Link>
            ) : (
              <>
                <Link to="/login" className={buttonClasses('ghost')}>
                  {t('common.signIn')}
                </Link>
                <Link to="/register" className={buttonClasses('primary')}>
                  {t('common.register')}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-ink-soft">
          {t('app.name')} · {t('landing.free')}
        </div>
      </footer>
    </div>
  )
}
