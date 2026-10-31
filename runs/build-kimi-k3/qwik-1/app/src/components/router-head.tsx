import { component$ } from '@builder.io/qwik';
import { useDocumentHead } from '@builder.io/qwik-city';

export const RouterHead = component$(() => {
  const head = useDocumentHead();
  return (
    <>
      <title>{head.title}</title>
      {head.meta.map((m) => (
        <meta key={m.key} {...m} />
      ))}
      {head.links.map((l) => (
        <link key={l.key} {...l} />
      ))}
    </>
  );
});
