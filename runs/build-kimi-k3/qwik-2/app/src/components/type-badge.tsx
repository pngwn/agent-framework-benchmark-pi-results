import { component$ } from '@builder.io/qwik';

export const TypeBadge = component$<{ name: string; english: string; link?: boolean }>((props) => {
  const className = `type-badge type-${props.name}`;
  return props.link ? (
    <a class={className} href={`/types/${props.name}`}>
      {props.english}
    </a>
  ) : (
    <span class={className}>{props.english}</span>
  );
});
