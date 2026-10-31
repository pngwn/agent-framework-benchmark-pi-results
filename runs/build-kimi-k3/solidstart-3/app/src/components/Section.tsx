import type { JSX } from "solid-js";

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export default function Section(props: {
  id?: string;
  title: string;
  children: JSX.Element;
}) {
  const headingId = `${props.id ?? slug(props.title)}-heading`;
  return (
    <section id={props.id} aria-labelledby={headingId} class="panel">
      <h2 id={headingId}>{props.title}</h2>
      {props.children}
    </section>
  );
}
