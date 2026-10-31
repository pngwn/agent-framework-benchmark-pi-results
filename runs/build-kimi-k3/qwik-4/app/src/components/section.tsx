import { component$, Slot } from '@builder.io/qwik';

/** A region whose accessible name is its heading. */
export const Section = component$<{ title: string; headingId: string; id?: string }>(({ title, headingId, id }) => {
  return (
    <section class="section" id={id} aria-labelledby={headingId}>
      <h2 id={headingId}>{title}</h2>
      <Slot />
    </section>
  );
});
