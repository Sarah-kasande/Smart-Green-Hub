// The narrow white card used by all sign-in / registration screens.
export default function AuthCard({ title, intro, children, wide = false }) {
  return (
    <div className={`mx-auto w-full px-4 py-8 sm:py-12 ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
      <div className="rounded-2xl border border-line bg-surface p-5 sm:p-8">
        <h1 className="text-2xl font-bold">{title}</h1>
        {intro && <p className="mt-2 text-ink-soft">{intro}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}
