import type { ReactNode } from "react";

/**
 * A landmark section: role="region" named by its heading.
 */
export function Section({
  id,
  title,
  className,
  children,
}: {
  id?: string;
  title: string;
  className?: string;
  children: ReactNode;
}) {
  const headingId = `${(id ?? title).replace(/\s+/g, "-").toLowerCase()}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} className={className ?? "panel"}>
      <h2 id={headingId}>{title}</h2>
      {children}
    </section>
  );
}
