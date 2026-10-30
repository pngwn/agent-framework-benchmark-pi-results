import { NotFoundPage } from '../components';

export function meta() {
  return [{ title: 'Not found – Pokédex' }];
}

export default function NotFoundRoute() {
  return <NotFoundPage />;
}
