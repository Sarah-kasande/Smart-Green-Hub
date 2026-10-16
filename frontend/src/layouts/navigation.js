// Menu items for each role (following the sidebar in design/home.png and design/admin*.png).
// `bottom: true` items also appear in the mobile bottom bar (max 4, plus "Menu").
// `short` is an optional shorter label for that narrow bar.
export const NAVIGATION = {
  operator: [
    { to: '/operator', label: 'nav.home', icon: 'home', end: true, bottom: true },
    { to: '/operator/batches', label: 'nav.batches', icon: 'sprout', bottom: true },
    { to: '/operator/sales', label: 'nav.salesExpenses', short: 'nav.salesShort', icon: 'wallet', bottom: true },
    { to: '/operator/alerts', label: 'nav.alerts', icon: 'bell', bottom: true },
    { to: '/operator/planting', label: 'nav.planting', icon: 'calendar' },
    { to: '/operator/surplus', label: 'nav.surplusBoard', icon: 'board' },
    { to: '/operator/requests', label: 'nav.requests', icon: 'inbox' },
    { to: '/operator/impact', label: 'nav.impact', icon: 'chart' },
    { to: '/operator/settings', label: 'nav.settings', icon: 'settings' },
  ],
  institution: [
    { to: '/institution', label: 'nav.home', icon: 'home', end: true, bottom: true },
    { to: '/institution/board', label: 'nav.surplusBoard', icon: 'board', bottom: true },
    { to: '/institution/requests', label: 'nav.requests', icon: 'inbox', bottom: true },
    { to: '/institution/impact', label: 'nav.impact', icon: 'chart', bottom: true },
    { to: '/institution/settings', label: 'nav.settings', icon: 'settings' },
  ],
  admin: [
    { to: '/admin', label: 'nav.verification', icon: 'shield', end: true, bottom: true },
    { to: '/admin/rules', label: 'nav.rules', icon: 'sliders', bottom: true },
    { to: '/admin/audit', label: 'nav.audit', icon: 'list', bottom: true },
    { to: '/admin/settings', label: 'nav.settings', icon: 'settings', bottom: true },
  ],
}
