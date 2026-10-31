// A section: a region whose accessible name is its heading.
export default function Section({ id, title, className = '', children }) {
  const headingId = `${id}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} className={`surface ${className}`.trim()}>
      <h2 id={headingId}>{title}</h2>
      {children}
    </section>
  );
}
