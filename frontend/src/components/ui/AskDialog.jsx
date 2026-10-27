// Replaces the browser's window.prompt / window.confirm with an accessible dialog in the app style.
//   const [askElement, ask] = useAsk()
//   const reason = await ask({ title, label, required })   // the text, or null when cancelled
//   const ok = await ask({ title, text, confirmLabel })     // without `label`: true, or null
//   ...and render {askElement} once in the page.
import { useRef, useState } from 'react'
import Button from './Button'
import ResponsiveDialog from './ResponsiveDialog'
import { TextArea } from './Fields'
import { useI18n } from '../../i18n/I18nProvider'

export function useAsk() {
  const { t } = useI18n()
  const [question, setQuestion] = useState(null)
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState(null)
  const resolver = useRef(null)

  function ask(options) {
    setQuestion(options)
    setAnswer('')
    setError(null)
    return new Promise((resolve) => {
      resolver.current = resolve
    })
  }

  function finish(value) {
    resolver.current?.(value)
    resolver.current = null
    setQuestion(null)
  }

  function submit(event) {
    event.preventDefault()
    if (!question.label) return finish(true)
    if (question.required && !answer.trim()) return setError('required')
    return finish(answer.trim())
  }

  const element = (
    <ResponsiveDialog open={Boolean(question)} onOpenChange={(open) => !open && finish(null)} title={question?.title || ''} description={question?.text}>
      {question && (
        <form onSubmit={submit} className="space-y-4" noValidate>
          {question.label && (
            <TextArea label={question.label} value={answer} onChange={(e) => setAnswer(e.target.value)} error={error} maxLength={500} optional={!question.required} />
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => finish(null)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant={question.danger ? 'danger' : 'primary'}>
              {question.confirmLabel || t('common.confirm')}
            </Button>
          </div>
        </form>
      )}
    </ResponsiveDialog>
  )

  return [element, ask]
}
