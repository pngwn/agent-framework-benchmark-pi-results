export default function Section(props) {
  const slug = () => String(props.title).toLowerCase().replace(/\s+/g, "-");
  const id = () => props.id ?? slug();
  const headingId = () => `${id()}-heading`;
  return (
    <section class="panel" id={props.id} aria-labelledby={headingId()}>
      <h2 id={headingId()}>{props.title}</h2>
      {props.children}
    </section>
  );
}
