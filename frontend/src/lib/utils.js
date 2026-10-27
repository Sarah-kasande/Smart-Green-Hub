// cn(): joins class names and lets later Tailwind classes win over earlier ones
// (used by every shadcn/ui component).
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
