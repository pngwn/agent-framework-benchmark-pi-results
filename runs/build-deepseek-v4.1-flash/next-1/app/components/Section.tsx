export default function Section({
  id,
  title,
  children,
  className = '',
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const headingId = `${id}-heading`;
  return (
    <section id={id} className={`panel ${className}`.trim()} aria-labelledby={headingId}>
      <h2 id={headingId}>{title}</h2>
      {children}
    </section>
  );
}
