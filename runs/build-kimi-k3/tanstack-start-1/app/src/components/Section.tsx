import type { ReactNode } from 'react'
import { useId } from 'react'

export function Section({ name, children }: { name: string; children: ReactNode }) {
  const id = useId()
  return (
    <section className="section" aria-labelledby={id}>
      <h2 id={id} className="section-heading">
        {name}
      </h2>
      {children}
    </section>
  )
}
