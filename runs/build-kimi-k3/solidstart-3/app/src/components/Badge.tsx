import { A } from "@solidjs/router";

export function TypeBadge(props: { name: string; label: string }) {
  return <span class={`badge type-${props.name}`}>{props.label}</span>;
}

export function TypeBadgeLink(props: { name: string; label: string }) {
  return (
    <A class={`badge type-${props.name}`} href={`/types/${props.name}`}>
      {props.label}
    </A>
  );
}
