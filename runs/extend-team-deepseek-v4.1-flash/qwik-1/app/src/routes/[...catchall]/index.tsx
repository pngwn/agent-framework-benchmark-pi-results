import { component$ } from "@builder.io/qwik";
import type { DocumentHead, RequestHandler } from "@builder.io/qwik-city";
import { NotFound } from "~/components/ui";
import { pageTitle } from "~/lib/format";

export const onGet: RequestHandler = ({ status }) => {
  status(404);
};

export default component$(() => <NotFound />);

export const head: DocumentHead = { title: pageTitle("Not found") };
