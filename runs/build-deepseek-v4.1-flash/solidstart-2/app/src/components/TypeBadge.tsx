import { A } from "@solidjs/router";

export default function TypeBadge(props: {
  name: string;
  label: string;
  link?: boolean;
}) {
  const className = () => `type-badge type-${props.name}`;
  return props.link ? (
    <A class={className()} href={`/types/${props.name}`}>
      {props.label}
    </A>
  ) : (
    <span class={className()}>{props.label}</span>
  );
}
