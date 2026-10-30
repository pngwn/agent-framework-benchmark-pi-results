import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { routeLoader$ } from "@builder.io/qwik-city";
import { NotFound } from "../../components/NotFound";

export const useNotFoundStatus = routeLoader$(({ status }) => {
  status(404);
  return true;
});

export const head: DocumentHead = {
  title: "Not found – Pokédex",
};

export default component$(() => {
  useNotFoundStatus();
  return <NotFound />;
});
