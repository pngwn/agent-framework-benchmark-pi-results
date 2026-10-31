import { component$ } from '@builder.io/qwik';
import type { DocumentHead, RequestHandler } from '@builder.io/qwik-city';
import { NotFound } from '../../components/not-found';

export const onGet: RequestHandler = ({ status }) => {
  status(404);
};

export default component$(() => {
  return <NotFound />;
});

export const head: DocumentHead = {
  title: 'Not found – Pokédex',
};
