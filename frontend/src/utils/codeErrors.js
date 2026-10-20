import { errorCode, fieldErrors } from '../api/client'

// Turns an API error from a code check into the message shown under the code field.
export function codeErrorText(t, err) {
  const code = errorCode(err)
  if (code === 'WRONG_CODE') return t('errors.WRONG_CODE', { n: err.response?.data?.details?.attempts_left ?? '' })
  if (code === 'VALIDATION_FAILED' && fieldErrors(err).code) return t('fieldErrors.invalid_code')
  return t(`errors.${code}`)
}
