import { component$ } from '@builder.io/qwik';
import type { DocumentHead, RequestHandler } from '@builder.io/qwik-city';
import { NotFound } from '~/components/not-found';

export const onGet: RequestHandler = (ev) => {
  ev.status(404);
};

export const head: DocumentHead = {
  title: 'Not found – Pokédex',
};

export default component$(() => <NotFound />);
