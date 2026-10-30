import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { NotFoundContent } from "../../components/ui";

export default component$(() => <NotFoundContent />);

export const head: DocumentHead = {
  title: "Not found – Pokédex",
};
