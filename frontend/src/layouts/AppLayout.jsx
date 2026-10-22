// Layout for signed-in users.
//  - Top bar: logo and name on the left; sync status, notifications, language and the user menu
//    (profile and settings, sign out) on the right.
//  - Desktop (1024 px and wider): a sidebar with short UPPERCASE group labels and text links.
//  - Phones: a bottom bar with the 4 main pages; "Menu" opens the full menu as a drawer.
import { useEffect, useId, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import Icon from '../components/ui/Icon'
import Logo from '../components/ui/Logo'
import LanguageSwitch from '../components/ui/LanguageSwitch'
import SyncChip from '../components/ui/SyncChip'
import PageErrorBoundary from '../components/ui/PageErrorBoundary'
import { homePathFor, useAuth } from '../auth/AuthContext'
import { useI18n } from '../i18n/I18nProvider'
import { useSync } from '../offline/SyncProvider'
import { clearOfflineData } from '../offline/db'
import { useApi } from '../api/useApi'
import { NAVIGATION, bottomItems, isActive } from './navigation'

// The grouped menu (sidebar and phone drawer): text links, the open page highlighted
function MenuGroups({ groups, onNavigate }) {
  const { t } = useI18n()
  const location = useLocation()
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.group}>
          <p className="px-5 text-xs font-semibold uppercase tracking-wider text-ink-soft">{t(group.group)}</p>
          <ul className="mt-2 space-y-0.5 px-3">
            {group.items.map((item) => {
              const active = isActive(item, location)
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={`flex min-h-12 items-center rounded-lg border-l-4 px-3 ${
                      active ? 'border-leaf bg-leaf-light font-semibold text-leaf-text' : 'border-transparent text-ink hover:bg-canvas'
                    }`}
                  >
                    {t(item.label)}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

// Bell with the number of unread in-app notifications (FR14)
function NotificationBell({ role }) {
  const { t } = useI18n()
  const { data } = useApi('/notifications')
  const unread = data?.unread || 0
  return (
    <Link
      to={`${homePathFor(role)}/notifications`}
      className="relative grid h-12 w-12 place-items-center rounded-lg hover:bg-canvas"
      aria-label={unread ? t('notifications.unreadLabel', { n: unread }) : t('notifications.title')}
    >
      <Icon name="bell" />
      {unread > 0 && (
        <span className="absolute right-1.5 top-1.5 min-w-5 rounded-full bg-risk-high-text px-1 text-center text-xs font-bold text-white">{unread > 9 ? '9+' : unread}</span>
      )}
    </Link>
  )
}

// The user's name with a small menu: profile and settings, language (phones), sign out
function UserMenu({ onSignOut }) {
  const { t } = useI18n()
  const { user, organisation } = useAuth()
  const [open, setOpen] = useState(false)
  const box = useRef(null)
  const menuId = useId()

  // Close when clicking outside the menu or pressing Escape
  useEffect(() => {
    if (!open) return undefined
    const onPointer = (e) => !box.current?.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={t('userMenu.label', { name: user.full_name })}
        onClick={() => setOpen(!open)}
        className="flex min-h-12 min-w-12 items-center justify-center gap-1.5 rounded-lg px-2 font-semibold hover:bg-canvas sm:px-3"
      >
        {/* Phones: a person mark instead of the name, so the button stays visible */}
        <Icon name="user" className="sm:hidden" />
        <span className="hidden max-w-[12rem] truncate sm:inline">{user.full_name}</span>
        <Icon name="chevronDown" size={18} />
      </button>
      {open && (
        <div id={menuId} className="absolute right-0 top-full z-40 mt-2 w-72 rounded-xl border border-line bg-surface p-2">
          <div className="border-b border-line px-3 pb-3 pt-2">
            <p className="truncate font-semibold">{user.full_name}</p>
            <p className="truncate text-sm text-ink-soft">{organisation?.name || t(`roles.${user.role}`)}</p>
          </div>
          <Link
            to={`${homePathFor(user.role)}/settings`}
            onClick={() => setOpen(false)}
            className="mt-1 flex min-h-12 items-center rounded-lg px-3 hover:bg-canvas"
          >
            {t('userMenu.profile')}
          </Link>
          <div className="px-3 py-2 md:hidden">
            <p className="mb-2 text-sm text-ink-soft">{t('common.language')}</p>
            <LanguageSwitch />
          </div>
          <button type="button" onClick={onSignOut} className="flex min-h-12 w-full items-center rounded-lg px-3 text-left hover:bg-canvas">
            {t('common.signOut')}
          </button>
        </div>
      )}
    </div>
  )
}

export default function AppLayout() {
  const { t } = useI18n()
  const { user, logout } = useAuth()
  const { pending } = useSync()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const groups = NAVIGATION[user.role] || []

  // The phone drawer closes with Escape
  useEffect(() => {
    if (!menuOpen) return undefined
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  async function signOut() {
    // Changes still waiting on this phone would be lost: ask first
    if (pending > 0 && !window.confirm(t('sync.signOutWarning', { n: pending }))) return
    await clearOfflineData()
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:p-3">
        {t('common.skipToContent')}
      </a>

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-line bg-surface">
        <div className="flex h-16 items-center gap-2 px-4 lg:px-6">
          <Logo to={homePathFor(user.role)} compact />
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <SyncChip />
            <NotificationBell role={user.role} />
            <span className="hidden md:inline-flex">
              <LanguageSwitch />
            </span>
            <UserMenu onSignOut={signOut} />
          </div>
        </div>
      </header>

      <div className="lg:flex">
        {/* Desktop sidebar */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto border-r border-line bg-surface py-6 lg:block">
          <nav aria-label={t('common.menu')}>
            <MenuGroups groups={groups} />
          </nav>
        </aside>

        <main id="main" className="min-w-0 flex-1 px-4 pb-28 pt-5 sm:pt-6 lg:px-10 lg:pb-12 lg:pt-8">
          {/* A page that cannot be drawn shows "Try again" instead of a blank screen */}
          <PageErrorBoundary key={location.pathname}>
            <Outlet />
          </PageErrorBoundary>
        </main>
      </div>

      {/* Phone bottom bar: 4 main pages + Menu */}
      <nav aria-label={t('common.quickMenu')} className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface lg:hidden">
        <ul className="grid grid-cols-5">
          {bottomItems(groups).map((item) => {
            const active = isActive(item, location)
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-xs ${active ? 'font-semibold text-leaf-text' : 'font-medium text-ink-soft'}`}
                >
                  <Icon name={item.icon} size={20} />
                  <span className="max-w-full truncate">{t(item.short || item.label)}</span>
                </Link>
              </li>
            )
          })}
          <li>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-expanded={menuOpen}
              className="flex min-h-16 w-full flex-col items-center justify-center gap-1 text-xs font-medium text-ink-soft"
            >
              <Icon name="menu" size={20} />
              {t('common.menu')}
            </button>
          </li>
        </ul>
      </nav>

      {/* Phone menu drawer: the same groups as the sidebar */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label={t('common.menu')}>
          <button type="button" className="absolute inset-0 bg-black/50" aria-label={t('common.close')} onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[85%] max-w-xs flex-col overflow-y-auto bg-surface pb-6">
            <div className="flex h-16 items-center justify-between border-b border-line pl-5 pr-2">
              <span className="text-lg font-semibold">{t('common.menu')}</span>
              {/* Autofocus: keyboard and screen-reader users start inside the drawer */}
              <button
                type="button"
                autoFocus
                onClick={() => setMenuOpen(false)}
                className="grid h-12 w-12 place-items-center rounded-lg hover:bg-canvas"
                aria-label={t('common.close')}
              >
                <Icon name="close" />
              </button>
            </div>
            <nav aria-label={t('common.menu')} className="mt-5 flex-1">
              <MenuGroups groups={groups} onNavigate={() => setMenuOpen(false)} />
            </nav>
            <div className="mt-6 border-t border-line px-3 pt-3">
              <button type="button" onClick={signOut} className="flex min-h-12 w-full items-center rounded-lg px-3 text-left font-medium hover:bg-canvas">
                {t('common.signOut')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
