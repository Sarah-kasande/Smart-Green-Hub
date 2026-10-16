// Button look, shared by <Button> and by links that should look like buttons.
// Buttons are at least 48 px tall (large touch targets).
const VARIANTS = {
  primary: 'bg-leaf text-white hover:bg-leaf-dark disabled:bg-leaf/50',
  secondary: 'bg-white text-ink border border-line hover:bg-canvas disabled:text-ink/50',
  dark: 'bg-ink text-white hover:bg-ink/90 disabled:bg-ink/50',
  danger: 'bg-risk-high text-risk-high-text border border-risk-high-text/30 hover:brightness-95',
  ghost: 'bg-transparent text-ink hover:bg-ink/5',
}

export function buttonClasses(variant = 'primary', full = false) {
  return `inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${full ? 'w-full' : ''}`
}
