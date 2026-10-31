// A section with the region role, named by its heading.
export function Section({ id, heading, className = '', children }) {
  const headingId = `${heading.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} className={`section ${className}`.trim()}>
      <h2 id={headingId}>{heading}</h2>
      {children}
    </section>
  );
}
