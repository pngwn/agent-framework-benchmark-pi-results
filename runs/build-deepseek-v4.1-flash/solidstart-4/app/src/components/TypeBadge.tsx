import { A } from "@solidjs/router";
import type { JSX } from "solid-js";

export default function TypeBadge(props: {
  name: string;
  label: string;
  link?: boolean;
}): JSX.Element {
  const style = {
    "background-color": `var(--type-${props.name}, var(--color-text-muted))`,
  };

  return props.link ? (
    <A href={`/types/${props.name}`} class="type-badge" style={style}>
      {props.label}
    </A>
  ) : (
    <span class="type-badge" style={style}>
      {props.label}
    </span>
  );
}
