// Layout for signed-in users.
//  - Desktop (1024 px and wider): sidebar on the left, as in design/home.png
//  - Mobile: top bar + bottom navigation bar; "Menu" opens the full list
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import Icon from '../components/ui/Icon'
import Logo from '../components/ui/Logo'
import LanguageSwitch from '../components/ui/LanguageSwitch'
import ConnectionChip from '../components/ui/ConnectionChip'
import { homePathFor, useAuth } from '../auth/AuthContext'
import { useI18n } from '../i18n/I18nProvider'
import { NAVIGATION } from './navigation'

function SideLink({ item, onClick }) {
  const { t } = useI18n()
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex min-h-12 items-center gap-3 rounded-xl px-3 font-medium ${
          isActive ? 'bg-leaf-light text-leaf-dark' : 'text-ink hover:bg-canvas'
        }`
      }
    >
      <Icon name={item.icon} />
      {t(item.label)}
    </NavLink>
  )
}

export default function AppLayout() {
  const { t } = useI18n()
  const { user, organisation, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const items = NAVIGATION[user.role] || []

  async function signOut() {
    await logout()
    navigate('/login')
  }

  const userBox = (
    <div className="flex items-center gap-3 rounded-xl bg-canvas p-3">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-ink text-white">
        <Icon name="user" />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate font-semibold">{user.full_name}</span>
        <span className="block truncate text-sm text-ink-soft">{organisation?.name || t(`roles.${user.role}`)}</span>
      </span>
    </div>
  )

  return (
    <div className="min-h-screen lg:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3">
        {t('common.skipToContent')}
      </a>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-white p-4 lg:flex">
        <Logo to={homePathFor(user.role)} />
        <nav aria-label={t('common.menu')} className="mt-6 flex-1 space-y-1 overflow-y-auto">
          {items.map((item) => (
            <SideLink key={item.to} item={item} />
          ))}
        </nav>
        <div className="space-y-3">
          {userBox}
          <button type="button" onClick={signOut} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 font-medium text-ink hover:bg-canvas">
            <Icon name="logout" />
            {t('common.signOut')}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
          <div className="flex items-center justify-between gap-2 px-4 py-2">
            <div className="lg:hidden">
              <Logo to={homePathFor(user.role)} />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden sm:inline-flex">
                <ConnectionChip />
              </span>
              <LanguageSwitch />
            </div>
          </div>
        </header>

        <main id="main" className="flex-1 px-4 pb-28 pt-4 lg:px-8 lg:pb-10 lg:pt-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav aria-label={t('common.menu')} className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white lg:hidden">
        <ul className="grid grid-cols-5">
          {items
            .filter((item) => item.bottom)
            .map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-xs font-medium ${isActive ? 'text-leaf' : 'text-ink-soft'}`
                  }
                >
                  <Icon name={item.icon} size={22} />
                  <span className="max-w-full truncate">{t(item.short || item.label)}</span>
                </NavLink>
              </li>
            ))}
          <li>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-expanded={menuOpen}
              className="flex min-h-16 w-full flex-col items-center justify-center gap-1 text-xs font-medium text-ink-soft"
            >
              <Icon name="menu" size={22} />
              {t('common.menu')}
            </button>
          </li>
        </ul>
      </nav>

      {/* Mobile full menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label={t('common.menu')}>
          <button type="button" className="absolute inset-0 bg-ink/40" aria-label={t('common.close')} onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-lg font-bold">{t('common.menu')}</span>
              <button type="button" onClick={() => setMenuOpen(false)} className="grid h-12 w-12 place-items-center rounded-xl hover:bg-canvas" aria-label={t('common.close')}>
                <Icon name="close" />
              </button>
            </div>
            {userBox}
            <div className="my-3">
              <ConnectionChip />
            </div>
            <nav className="space-y-1">
              {items.map((item) => (
                <SideLink key={item.to} item={item} onClick={() => setMenuOpen(false)} />
              ))}
            </nav>
            <button type="button" onClick={signOut} className="mt-2 flex min-h-12 w-full items-center gap-3 rounded-xl px-3 font-medium text-ink hover:bg-canvas">
              <Icon name="logout" />
              {t('common.signOut')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
