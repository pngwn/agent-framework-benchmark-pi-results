import type { JSX } from "solid-js";

// A section = element with the region role whose accessible name is its heading.
export function Section(props: { title: string; headingId: string; id?: string; children: JSX.Element }) {
  return (
    <section id={props.id} aria-labelledby={props.headingId} class="section">
      <h2 id={props.headingId}>{props.title}</h2>
      {props.children}
    </section>
  );
}
