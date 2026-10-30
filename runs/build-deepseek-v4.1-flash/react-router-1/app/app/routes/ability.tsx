import { NotFoundPage, PokemonGrid, Section } from '../components';
import { getAbilityPage } from '../lib/api.server';

export async function loader({ params }: any) {
  const data = await getAbilityPage(params.name);
  return data ?? { notFound: true as const };
}

export function meta({ loaderData }: any) {
  return [
    {
      title: loaderData?.notFound
        ? 'Not found – Pokédex'
        : `${loaderData.displayName} – Pokédex`,
    },
  ];
}

export default function AbilityPage({ loaderData }: any) {
  const data = loaderData;
  if (data.notFound) return <NotFoundPage />;

  return (
    <>
      <h1>{data.displayName}</h1>
      <Section id="effect" title="Effect">
        <p>{data.effect}</p>
      </Section>
      <Section id="pokemon" title="Pokémon">
        <p className="result-count">{data.cards.length} Pokémon</p>
        <PokemonGrid cards={data.cards} />
      </Section>
    </>
  );
}
