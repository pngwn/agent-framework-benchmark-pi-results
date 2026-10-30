import { A } from "@solidjs/router";
import type { Named } from "~/lib/types";

const style = (type: string) => ({ "background-color": `var(--type-${type}, var(--color-text-muted))` });

export function TypeLink(props: { type: Named; class?: string }) {
  return (
    <A href={`/types/${props.type.name}`} class={`type-badge ${props.class ?? ""}`} style={style(props.type.name)}>
      {props.type.label}
    </A>
  );
}

export function TypeBadge(props: { type: Named }) {
  return (
    <span class="type-badge" style={style(props.type.name)}>
      {props.type.label}
    </span>
  );
}
