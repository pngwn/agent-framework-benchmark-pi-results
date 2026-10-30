import { A } from "@solidjs/router";
import { typeLabel } from "~/lib/format";

export function TypeBadge(props: { name: string; link?: boolean }) {
  const className = () => `type-badge type-${props.name}`;
  const label = () => typeLabel(props.name);
  return props.link ? (
    <A href={`/types/${props.name}`} class={className()}>
      {label()}
    </A>
  ) : (
    <span class={className()}>{label()}</span>
  );
}

export default TypeBadge;
