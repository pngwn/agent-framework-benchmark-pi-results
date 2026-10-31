import { ParentComponent } from "solid-js";

/** A landmark region whose accessible name comes from its heading. */
const Section: ParentComponent<{ title: string; id?: string; class?: string }> = (props) => {
  const headingId = `${props.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-heading`;
  return (
    <section id={props.id} aria-labelledby={headingId} class={`section ${props.class ?? ""}`}>
      <h2 id={headingId}>{props.title}</h2>
      {props.children}
    </section>
  );
};

export default Section;
