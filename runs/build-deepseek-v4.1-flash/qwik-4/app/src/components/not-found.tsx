import { component$ } from "@builder.io/qwik";

export const NotFound = component$(() => (
  <>
    <h1>Not found</h1>
    <p>
      <a class="not-found-link" href="/">
        Back to the Pokédex
      </a>
    </p>
  </>
));
