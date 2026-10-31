import { component$ } from '@builder.io/qwik';
import { useDocumentHead } from '@builder.io/qwik-city';

/** Renders the document head managed by Qwik City (title, meta, links...). */
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
      {head.styles.map((s) => (
        <style key={s.key} {...s.props} dangerouslySetInnerHTML={s.style} />
      ))}
      {head.scripts.map((s) => (
        <script key={s.key} {...s.props} dangerouslySetInnerHTML={s.script} />
      ))}
    </>
  );
});
