import { createUniqueId, type JSX } from "solid-js";

/** A region landmark named by its heading. */
export default function Section(props: { title: string; id?: string; class?: string; children: JSX.Element }) {
  const headingId = `section-${createUniqueId()}`;
  return (
    <section id={props.id} class={`panel ${props.class ?? ""}`} aria-labelledby={headingId}>
      <h2 id={headingId} class="panel__title">
        {props.title}
      </h2>
      {props.children}
    </section>
  );
}
