import type { JSX } from "solid-js";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function Section(props: {
  title: string;
  id?: string;
  children: JSX.Element;
}) {
  const headingId = `${props.id ?? slugify(props.title)}-heading`;
  return (
    <section id={props.id} aria-labelledby={headingId} class="panel section-panel">
      <h2 id={headingId}>{props.title}</h2>
      {props.children}
    </section>
  );
}
