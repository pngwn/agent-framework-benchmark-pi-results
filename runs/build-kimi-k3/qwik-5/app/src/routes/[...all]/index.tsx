import { component$ } from '@builder.io/qwik';
import { routeLoader$, type DocumentHead } from '@builder.io/qwik-city';
import { NotFound } from '../../components/not-found';

export const useNotFoundStatus = routeLoader$(({ status }) => {
  status(404);
});

export default component$(() => {
  useNotFoundStatus();
  return <NotFound />;
});

export const head: DocumentHead = {
  title: 'Not found – Pokédex',
};
