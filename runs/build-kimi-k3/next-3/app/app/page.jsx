import { getHomeData } from '../lib/data.js';
import HomeClient from './HomeClient.jsx';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }) {
  const sp = (await searchParams) ?? {};
  const data = await getHomeData();
  const asString = (v) => (typeof v === 'string' ? v : '');
  const initial = {
    q: asString(sp.q),
    type: asString(sp.type),
    generation: asString(sp.generation),
    page: Math.max(1, Number.parseInt(asString(sp.page), 10) || 1),
  };
  return (
    <>
      <h1>Pokémon</h1>
      <HomeClient
        key={JSON.stringify(initial)}
        pokemon={data.pokemon}
        types={data.types}
        generations={data.generations}
        initial={initial}
      />
    </>
  );
}
