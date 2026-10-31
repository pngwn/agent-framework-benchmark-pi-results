// A "section" as defined by the spec: an element with the region role whose
// accessible name is its heading.
export function Section({ id, title, children }) {
  const headingId = `${id}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} className="panel">
      <h2 id={headingId}>{title}</h2>
      {children}
    </section>
  );
}
