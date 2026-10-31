// A section: an element with the region role whose accessible name is its heading.
export default function Section({ id, title, className, children }) {
  const headingId = `${id}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} className={['section', className].filter(Boolean).join(' ')}>
      <h2 id={headingId}>{title}</h2>
      {children}
    </section>
  );
}
