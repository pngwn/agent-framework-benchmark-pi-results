import type { ReactNode } from "react";

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function Section({
  title,
  id,
  children,
  className = "",
}: {
  title: string;
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const headingId = `${id ?? slug(title)}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} className={`section ${className}`.trim()}>
      <h2 id={headingId} className="section-title">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function SectionBody({ children }: { children: ReactNode }) {
  return <div className="section-body">{children}</div>;
}
