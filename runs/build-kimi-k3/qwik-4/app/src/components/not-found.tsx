import { component$ } from '@builder.io/qwik';

export const NotFoundContent = component$(() => {
  return (
    <>
      <h1>Not found</h1>
      <p>
        <a href="/">Back to the Pokédex</a>
      </p>
    </>
  );
});
