// Coloured pill showing a type's English name. Renders as a span by default;
// pass href to render it as a link to the type page.
export default function TypeBadge({ name, label, href }) {
  const style = { background: `var(--type-${name}, var(--type-normal))` };
  if (href) {
    return (
      <a className="type-badge" style={style} href={href}>
        {label}
      </a>
    );
  }
  return (
    <span className="type-badge" style={style}>
      {label}
    </span>
  );
}
