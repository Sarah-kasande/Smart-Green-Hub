// "Send the code again" with a countdown. The server allows one new code per 60 seconds per account,
// so the button stays disabled and shows the seconds left in the meantime.
import { useEffect, useState } from 'react'
import Button from './Button'
import { useI18n } from '../../i18n/I18nProvider'

export default function ResendButton({ onResend, initialSeconds = 60 }) {
  const { t } = useI18n()
  const [seconds, setSeconds] = useState(initialSeconds)
  const [busy, setBusy] = useState(false)

  // One tick per second while counting down
  useEffect(() => {
    if (seconds <= 0) return undefined
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [seconds])

  async function click() {
    setBusy(true)
    try {
      const next = await onResend()
      setSeconds(Number(next) || 60)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button variant="secondary" icon="mail" full onClick={click} disabled={seconds > 0 || busy} aria-live="polite">
      {seconds > 0 ? t('code.resendIn', { s: seconds }) : t('code.resend')}
    </Button>
  )
}
