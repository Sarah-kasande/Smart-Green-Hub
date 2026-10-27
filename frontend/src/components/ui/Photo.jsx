// A responsive photo from public/photos (src/content/photos.js): a phone downloads the small file,
// a big screen the large one. `priority` for the first big photo of a page (faster first paint).
import { src, srcSet } from '../../content/photos'
import { useI18n } from '../../i18n/I18nProvider'

export default function Photo({ photo, sizes = '100vw', priority = false, className = '', decorative = false }) {
  const { t } = useI18n()
  return (
    <img
      src={src(photo)}
      srcSet={srcSet(photo)}
      sizes={sizes}
      alt={decorative ? '' : t(photo.alt)}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      className={`object-cover ${className}`}
    />
  )
}
