import { component$ } from '@builder.io/qwik';
import { Link } from '@builder.io/qwik-city';

export const NotFound = component$(() => {
  return (
    <>
      <h1>Not found</h1>
      <p>
        <Link href="/">Back to the Pokédex</Link>
      </p>
    </>
  );
});
