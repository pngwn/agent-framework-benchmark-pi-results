import { useId, type ReactNode } from 'react'

export function Section({ title, id, children, className }: { title: string; id?: string; children: ReactNode; className?: string }) {
  const headingId = useId()
  return (
    <section id={id} aria-labelledby={headingId} className={`panel${className ? ` ${className}` : ''}`}>
      <h2 id={headingId}>{title}</h2>
      {children}
    </section>
  )
}
