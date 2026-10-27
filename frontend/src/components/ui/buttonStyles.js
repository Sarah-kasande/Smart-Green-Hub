// Button look, shared by <Button> and by links that should look like buttons.
// Buttons are at least 48 px tall (large touch targets).
const VARIANTS = {
  primary: 'bg-leaf text-white shadow-xs hover:bg-leaf-dark disabled:bg-leaf/50',
  secondary: 'bg-surface text-ink border border-line shadow-xs hover:bg-canvas disabled:text-ink/50',
  dark: 'bg-navy text-white hover:bg-navy/90 disabled:bg-navy/50',
  danger: 'bg-risk-high text-risk-high-text border border-risk-high-text/30 hover:brightness-95',
  ghost: 'bg-transparent text-ink hover:bg-line/60',
}

export function buttonClasses(variant = 'primary', full = false) {
  return `inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold transition-[color,background-color,transform] active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 ${VARIANTS[variant]} ${full ? 'w-full' : ''}`
}
