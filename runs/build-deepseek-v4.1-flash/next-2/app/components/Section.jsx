export function Section({ id, title, children, className = '' }) {
  return (
    <section
      id={id}
      className={`panel section ${className}`.trim()}
      aria-labelledby={`${id}-heading`}
    >
      <h2 id={`${id}-heading`}>{title}</h2>
      {children}
    </section>
  );
}
