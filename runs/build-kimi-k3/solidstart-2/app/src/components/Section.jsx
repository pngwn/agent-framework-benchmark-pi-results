// A section: an element with the region role whose accessible name is its heading.
export function Section(props) {
  const headingId = `${props.anchor ?? props.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-heading`;
  return (
    <section id={props.anchor} aria-labelledby={headingId} class="panel">
      <h2 id={headingId}>{props.title}</h2>
      {props.children}
    </section>
  );
}
