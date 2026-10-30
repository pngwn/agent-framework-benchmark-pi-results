import { useId } from "react";

type Props = { title: string; id?: string; className?: string; children: React.ReactNode };

export function Section({ title, id, className, children }: Props) {
  const headingId = useId();
  return (
    <section id={id} aria-labelledby={headingId} className={`panel${className ? ` ${className}` : ""}`}>
      <h2 id={headingId}>{title}</h2>
      {children}
    </section>
  );
}
