import { component$ } from '@builder.io/qwik';
import { routeLoader$, type DocumentHead } from '@builder.io/qwik-city';
import { NotFoundContent } from '../../components/not-found';

export const useCatchAll = routeLoader$((ev) => {
  ev.status(404);
  return null;
});

export const head: DocumentHead = {
  title: 'Not found – Pokédex',
};

export default component$(() => {
  return <NotFoundContent />;
});
