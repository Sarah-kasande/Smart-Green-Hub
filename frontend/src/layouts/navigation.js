// Menu for each role, in groups with a short UPPERCASE label (REVIEW, MANAGE, ...).
// The sidebar shows text only. `bottom` (1-4) puts an item in the phone's bottom bar, in that order;
// only there a small icon is shown (`icon`) so the touch targets are easy to tell apart.
// `tabs`: the Sales & Expenses page is one page with tabs, shown as two menu items.
export const NAVIGATION = {
  operator: [
    {
      group: 'navGroups.work',
      items: [
        { to: '/operator', label: 'nav.dashboard', end: true, bottom: 1, icon: 'home' },
        { to: '/operator/batches', label: 'nav.batches', bottom: 2, icon: 'sprout' },
        { to: '/operator/sales?tab=sale', label: 'nav.sales', tabs: ['sale', 'history', 'profit'], bottom: 3, icon: 'wallet' },
        { to: '/operator/sales?tab=expense', label: 'nav.expenses', tabs: ['expense'] },
      ],
    },
    {
      group: 'navGroups.insight',
      items: [
        { to: '/operator/alerts', label: 'nav.alerts', bottom: 4, icon: 'bell' },
        { to: '/operator/planting', label: 'nav.planting' },
        { to: '/operator/impact', label: 'nav.impact' },
      ],
    },
    {
      group: 'navGroups.share',
      items: [
        { to: '/operator/surplus', label: 'nav.surplusBoard' },
        { to: '/operator/requests', label: 'nav.requests' },
      ],
    },
    {
      group: 'navGroups.settings',
      items: [
        { to: '/operator/sync', label: 'nav.sync' },
        { to: '/operator/settings', label: 'nav.settings' },
      ],
    },
  ],
  institution: [
    {
      group: 'navGroups.find',
      items: [
        { to: '/institution', label: 'nav.dashboard', end: true, bottom: 1, icon: 'home' },
        { to: '/institution/board', label: 'nav.surplusBoard', short: 'nav.boardShort', bottom: 2, icon: 'board' },
        { to: '/institution/requests', label: 'nav.myRequests', short: 'nav.requests', bottom: 3, icon: 'inbox' },
      ],
    },
    {
      group: 'navGroups.insight',
      items: [{ to: '/institution/impact', label: 'nav.impact', bottom: 4, icon: 'chart' }],
    },
    {
      group: 'navGroups.settings',
      items: [{ to: '/institution/settings', label: 'nav.settings' }],
    },
  ],
  admin: [
    {
      group: 'navGroups.review',
      items: [
        { to: '/admin/verification', label: 'nav.verification', short: 'nav.verificationShort', bottom: 2, icon: 'shield' },
        { to: '/admin/listings', label: 'nav.listings', bottom: 3, icon: 'board' },
      ],
    },
    {
      group: 'navGroups.manage',
      items: [
        { to: '/admin', label: 'nav.dashboard', end: true, bottom: 1, icon: 'home' },
        { to: '/admin/rules', label: 'nav.rules' },
        { to: '/admin/impact', label: 'nav.impact' },
        { to: '/admin/audit', label: 'nav.audit', bottom: 4, icon: 'list' },
        { to: '/admin/notifications-failed', label: 'nav.emailProblems' },
      ],
    },
    {
      group: 'navGroups.settings',
      items: [{ to: '/admin/settings', label: 'nav.settings' }],
    },
  ],
}

// The items of the phone's bottom bar, in order
export function bottomItems(groups) {
  return groups
    .flatMap((g) => g.items)
    .filter((item) => item.bottom)
    .sort((a, b) => a.bottom - b.bottom)
}

// Is this menu item the page that is open now? (location from React Router's useLocation)
export function isActive(item, location) {
  const [path] = item.to.split('?')
  const onPath = item.end ? location.pathname === path : location.pathname === path || location.pathname.startsWith(`${path}/`)
  if (!onPath) return false
  if (!item.tabs) return true
  // Sales & Expenses: without ?tab= the page opens on its first tab ("sale")
  const tab = new URLSearchParams(location.search).get('tab') || 'sale'
  return item.tabs.includes(tab)
}
