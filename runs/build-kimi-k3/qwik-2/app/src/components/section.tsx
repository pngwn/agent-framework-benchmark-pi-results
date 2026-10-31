import { component$, Slot } from '@builder.io/qwik';

/** A `region` landmark named by its heading. */
export const Section = component$<{ id?: string; headingId: string; title: string; class?: string }>(
  (props) => (
    <section id={props.id} aria-labelledby={props.headingId} class={['section', props.class]}>
      <h2 id={props.headingId}>{props.title}</h2>
      <Slot />
    </section>
  ),
);
