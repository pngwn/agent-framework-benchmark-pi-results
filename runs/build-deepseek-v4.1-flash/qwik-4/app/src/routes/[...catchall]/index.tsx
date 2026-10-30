import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { NotFound } from "../../components/not-found";

export default component$(() => <NotFound />);

export const head: DocumentHead = {
  title: "Not found – Pokédex",
};
