import { component$ } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";

export const NotFound = component$(() => {
  return (
    <>
      <h1>Not found</h1>
      <Link className="not-found-link" href="/">
        Back to the Pokédex
      </Link>
    </>
  );
});
