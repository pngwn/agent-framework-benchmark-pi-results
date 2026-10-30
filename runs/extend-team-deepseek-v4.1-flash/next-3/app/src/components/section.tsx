import type { ReactNode } from 'react';

/** A titled region: a `<section>` named by its `<h2>`. */
export function Section({ id, title, children, className }: { id: string; title: string; children: ReactNode; className?: string }) {
  const headingId = `${id}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} className={`panel${className ? ` ${className}` : ''}`}>
      <h2 id={headingId}>{title}</h2>
      {children}
    </section>
  );
}
