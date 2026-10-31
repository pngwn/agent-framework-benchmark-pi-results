import { A } from "@solidjs/router";
import type { TypeInfo } from "~/lib/api";

export function TypeBadge(props: { type: TypeInfo }) {
  return (
    <span class="type-badge" style={{ "background-color": `var(--type-${props.type.name})` }}>
      {props.type.enName}
    </span>
  );
}

export function TypeBadgeLink(props: { type: TypeInfo }) {
  return (
    <A class="type-badge" style={{ "background-color": `var(--type-${props.type.name})` }} href={`/types/${props.type.name}`}>
      {props.type.enName}
    </A>
  );
}
