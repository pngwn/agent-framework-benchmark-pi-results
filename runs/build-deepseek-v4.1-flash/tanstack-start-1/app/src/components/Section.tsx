import type { ReactNode } from 'react'

export function Section({
  id,
  title,
  children,
  className = '',
}: {
  id: string
  title: string
  children: ReactNode
  className?: string
}) {
  const headingId = `${id}-heading`
  return (
    <section id={id} aria-labelledby={headingId} className={`section-card ${className}`.trim()}>
      <h2 id={headingId}>{title}</h2>
      {children}
    </section>
  )
}
