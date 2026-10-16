export default function Card({ as: Tag = 'section', className = '', children, ...props }) {
  return (
    <Tag className={`rounded-2xl border border-line bg-white p-4 sm:p-5 ${className}`} {...props}>
      {children}
    </Tag>
  )
}
