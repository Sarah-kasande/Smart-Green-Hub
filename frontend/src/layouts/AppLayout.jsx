// Layout for signed-in users (UI.md section 5.3).
//  - Top bar (light glass): menu toggle, logo, search (Ctrl+K), sync status, notifications,
//    EN / Kinyarwanda and the user menu (profile and settings, install app, sign out).
//  - Desktop (1024 px and wider): a text-only sidebar with UPPERCASE groups; it can be hidden to give
//    tables more room (remembered on this device).
//  - Phones: a bottom bar with the 4 main pages; "Menu" opens the full menu from the side.
import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Bell, ChevronDown, Download, LogOut, PanelLeft, Search, Settings as SettingsIcon } from 'lucide-react'
import Icon from '../components/ui/Icon'
import Logo from '../components/ui/Logo'
import LanguageSwitch from '../components/ui/LanguageSwitch'
import SyncChip from '../components/ui/SyncChip'
import PageErrorBoundary from '../components/ui/PageErrorBoundary'
import { useAsk } from '../components/ui/AskDialog'
import { Toaster } from '@/components/shadcn/sonner'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/shadcn/sheet'
import { Avatar, AvatarFallback } from '@/components/shadcn/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/shadcn/command'
import { homePathFor, useAuth } from '../auth/AuthContext'
import { useI18n } from '../i18n/I18nProvider'
import { useSync } from '../offline/SyncProvider'
import { clearOfflineData } from '../offline/db'
import { useApi } from '../api/useApi'
import api from '../api/client'
import useInstallPrompt from '../useInstallPrompt'
import { NAVIGATION, QUICK_ACTIONS, bottomItems, isActive } from './navigation'

const SIDEBAR_KEY = 'sgh_sidebar'

// The grouped menu (sidebar and phone menu): text links, the open page highlighted
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
                    className={`flex min-h-12 items-center rounded-xl border-l-4 px-3 transition-colors ${
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
      className="relative grid h-12 w-12 place-items-center rounded-xl hover:bg-canvas"
      aria-label={unread ? t('notifications.unreadLabel', { n: unread }) : t('notifications.title')}
    >
      <Bell className="size-5" aria-hidden="true" />
      {unread > 0 && (
        <span className="absolute right-1.5 top-1.5 min-w-5 rounded-full bg-risk-high-text px-1 text-center text-xs font-bold text-white">{unread > 9 ? '9+' : unread}</span>
      )}
    </Link>
  )
}

// Two letters for the avatar: "Joyce Kasine" -> "JK"
const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')

// The user's name with a menu: profile and settings, language (phones), install app, sign out
function UserMenu({ onSignOut, onInstall }) {
  const { t, lang, setLang } = useI18n()
  const { user, organisation, refresh } = useAuth()
  const navigate = useNavigate()
  const { canInstall } = useInstallPrompt()

  async function chooseLanguage(value) {
    if (value === lang) return
    setLang(value)
    try {
      await api.patch('/me', { preferred_language: value })
      await refresh()
    } catch {
      // The screen already changed language; saving it on the account can be retried later.
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-xl px-1.5 font-semibold hover:bg-canvas sm:px-2"
      >
        <Avatar className="size-9">
          <AvatarFallback aria-hidden="true" className="bg-leaf-light text-sm font-bold text-leaf-text">
            {initials(user.full_name)}
          </AvatarFallback>
        </Avatar>
        {/* The name is always in the button's spoken name; on narrow screens it is only spoken */}
        <span className="sr-only max-w-[11rem] truncate lg:not-sr-only lg:whitespace-nowrap">{user.full_name}</span>
        <span className="sr-only">{t('userMenu.suffix')}</span>
        <ChevronDown className="hidden size-4 sm:block" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 rounded-xl p-2">
        <DropdownMenuLabel className="px-3 py-2">
          <p className="truncate font-semibold">{user.full_name}</p>
          <p className="truncate text-sm font-normal text-ink-soft">{organisation?.name || t(`roles.${user.role}`)}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="min-h-12 gap-3 px-3 text-base" onSelect={() => navigate(`${homePathFor(user.role)}/settings`)}>
          <SettingsIcon className="size-4" aria-hidden="true" />
          {t('userMenu.profile')}
        </DropdownMenuItem>
        {canInstall && (
          <DropdownMenuItem className="min-h-12 gap-3 px-3 text-base" onSelect={onInstall}>
            <Download className="size-4" aria-hidden="true" />
            {t('shell.install')}
          </DropdownMenuItem>
        )}
        {/* Phones: the language switch lives here (the top bar shows it from tablet width) */}
        <div className="md:hidden">
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="px-3 text-xs font-semibold uppercase tracking-wider text-ink-soft">{t('common.language')}</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={lang} onValueChange={chooseLanguage}>
            <DropdownMenuRadioItem value="en" className="min-h-12 text-base">
              English
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="rw" className="min-h-12 text-base">
              Kinyarwanda
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="min-h-12 gap-3 px-3 text-base" onSelect={onSignOut}>
          <LogOut className="size-4" aria-hidden="true" />
          {t('common.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Ctrl+K (or the search button): jump to any page or quick action of this role
function CommandSearch({ open, onOpenChange, groups, role }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const go = (to) => {
    onOpenChange(false)
    navigate(to)
  }
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title={t('shell.search')} description={t('shell.searchPlaceholder')}>
      <CommandInput placeholder={t('shell.searchPlaceholder')} />
      <CommandList>
        <CommandEmpty>{t('shell.searchEmpty')}</CommandEmpty>
        {(QUICK_ACTIONS[role] || []).length > 0 && (
          <CommandGroup heading={t('shell.actions')}>
            {QUICK_ACTIONS[role].map((action) => (
              <CommandItem key={action.to} onSelect={() => go(action.to)} className="min-h-11">
                {t(action.label)}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {groups.map((group) => (
          <CommandGroup key={group.group} heading={t(group.group)}>
            {group.items.map((item) => (
              <CommandItem key={item.to} onSelect={() => go(item.to)} className="min-h-11">
                {t(item.label)}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
        <CommandGroup heading={t('shell.more')}>
          <CommandItem onSelect={() => go(`${homePathFor(role)}/notifications`)} className="min-h-11">
            {t('notifications.title')}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}

function readSidebarChoice() {
  try {
    return localStorage.getItem(SIDEBAR_KEY) !== 'hidden'
  } catch {
    return true
  }
}

export default function AppLayout() {
  const { t } = useI18n()
  const { user, logout } = useAuth()
  const { pending, lastResult } = useSync()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(readSidebarChoice)
  const [askElement, ask] = useAsk()
  const { install, iosHint } = useInstallPrompt()
  const groups = NAVIGATION[user.role] || []

  // A short message when records saved offline have been sent (only when something was sent)
  useEffect(() => {
    if (lastResult && !lastResult.error && lastResult.applied > 0) toast.success(t('sync.toastSent', { n: lastResult.applied }))
  }, [lastResult, t])

  // Ctrl+K / Cmd+K opens the search
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  function toggleSidebar() {
    const next = !sidebarOpen
    setSidebarOpen(next)
    try {
      localStorage.setItem(SIDEBAR_KEY, next ? 'shown' : 'hidden')
    } catch {
      // not saved; fine
    }
  }

  async function signOut() {
    // Changes still waiting on this phone would be lost: ask first
    if (pending > 0) {
      const ok = await ask({ title: t('common.signOut'), text: t('sync.signOutWarning', { n: pending }), confirmLabel: t('common.signOut'), danger: true })
      if (!ok) return
    }
    await clearOfflineData()
    await logout()
    navigate('/login')
  }

  async function installApp() {
    if (iosHint) {
      await ask({ title: t('shell.install'), text: t('shell.installIos'), confirmLabel: t('common.close') })
      return
    }
    await install()
  }

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:p-3">
        {t('common.skipToContent')}
      </a>

      {/* Top bar */}
      <header className="glass-strong sticky top-0 z-30 border-x-0 border-t-0">
        <div className="flex h-16 items-center gap-1 px-3 sm:gap-2 lg:px-5">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-expanded={sidebarOpen}
            aria-label={sidebarOpen ? t('shell.hideMenu') : t('shell.showMenu')}
            className="hidden h-12 w-12 place-items-center rounded-xl hover:bg-canvas lg:grid"
          >
            <PanelLeft className="size-5" aria-hidden="true" />
          </button>
          <Logo to={homePathFor(user.role)} compact />
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="ml-2 hidden min-h-11 w-64 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-left text-ink-soft hover:bg-canvas xl:flex"
          >
            <Search className="size-4" aria-hidden="true" />
            <span className="flex-1">{t('shell.search')}</span>
            <kbd className="rounded-md border border-line px-1.5 text-xs">Ctrl K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-0.5 sm:gap-1.5">
            <button type="button" onClick={() => setSearchOpen(true)} aria-label={t('shell.search')} className="grid h-12 w-12 place-items-center rounded-xl hover:bg-canvas xl:hidden">
              <Search className="size-5" aria-hidden="true" />
            </button>
            <SyncChip />
            <NotificationBell role={user.role} />
            <span className="hidden md:inline-flex">
              <LanguageSwitch />
            </span>
            <UserMenu onSignOut={signOut} onInstall={installApp} />
          </div>
        </div>
      </header>

      <div className="lg:flex">
        {/* Desktop sidebar */}
        {sidebarOpen && (
          <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto border-r border-line bg-surface py-6 lg:block">
            <nav aria-label={t('common.menu')}>
              <MenuGroups groups={groups} />
            </nav>
          </aside>
        )}

        <main id="main" className="min-w-0 flex-1 px-4 pb-28 pt-5 sm:pt-6 lg:px-10 lg:pb-12 lg:pt-8">
          {/* A page that cannot be drawn shows "Try again" instead of a blank screen */}
          <PageErrorBoundary key={location.pathname}>
            <Outlet />
          </PageErrorBoundary>
        </main>
      </div>

      {/* Phone bottom bar: 4 main pages + Menu */}
      <nav aria-label={t('common.quickMenu')} className="glass-strong fixed inset-x-0 bottom-0 z-30 border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)] lg:hidden">
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
                  <span className={`grid h-7 w-12 place-items-center rounded-full ${active ? 'bg-leaf-light' : ''}`}>
                    <Icon name={item.icon} size={20} />
                  </span>
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
              <span className="grid h-7 w-12 place-items-center">
                <Icon name="menu" size={20} />
              </span>
              {t('common.menu')}
            </button>
          </li>
        </ul>
      </nav>

      {/* Phone menu: the same groups as the sidebar, sliding in from the side */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[85%] max-w-xs gap-0 overflow-y-auto bg-surface p-0 lg:hidden">
          <SheetHeader className="h-16 justify-center border-b border-line px-5">
            <SheetTitle className="text-lg">{t('common.menu')}</SheetTitle>
            <SheetDescription className="sr-only">{t('common.menu')}</SheetDescription>
          </SheetHeader>
          <nav aria-label={t('common.menu')} className="mt-5 flex-1">
            <MenuGroups groups={groups} onNavigate={() => setMenuOpen(false)} />
          </nav>
          <div className="mt-6 border-t border-line px-3 py-3">
            <button type="button" onClick={signOut} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left font-medium hover:bg-canvas">
              <LogOut className="size-4" aria-hidden="true" />
              {t('common.signOut')}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Short messages such as "Synced" appear briefly at the top (signed-in pages only) */}
      <Toaster position="top-center" />
      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} groups={groups} role={user.role} />
      {askElement}
    </div>
  )
}
