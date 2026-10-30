import { notFound } from 'next/navigation';

import PokeCard from '@/components/PokeCard';
import { getAbility, getSpeciesByIdMap, idFromUrl, spriteUrl } from '@/lib/data';
import { englishName, englishShortEffect, humanize } from '@/lib/display';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }) {
  const { name } = await params;
  const ability = await getAbility(name);
  if (!ability) return { title: 'Not found' };
  return { title: englishName(ability, humanize(ability.name)) };
}

export default async function AbilityPage({ params }) {
  const { name } = await params;
  const ability = await getAbility(name);
  if (!ability) notFound();

  const speciesById = await getSpeciesByIdMap();
  const ids = new Set();
  const hiddenIds = new Set();
  for (const entry of ability.pokemon ?? []) {
    const id = idFromUrl(entry?.pokemon?.url);
    if (id === null || id > 10000 || !speciesById.has(id)) continue;
    ids.add(id);
    if (entry.is_hidden) hiddenIds.add(id);
  }
  return (
    <>
      <h1>{englishName(ability, humanize(ability.name))}</h1>

      <section className="section" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{englishShortEffect(ability.effect_entries) || '—'}</p>
      </section>

      <section className="section" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p className="count">{ids.size} Pokémon</p>
        <ul className="cardGrid">
          {[...ids]
            .sort((a, b) => a - b)
            .map((id) => speciesById.get(id))
            .map((species) => (
              <PokeCard
                key={species.id}
                species={species}
                sprite={spriteUrl(species.id)}
                hidden={hiddenIds.has(species.id)}
              />
            ))}
        </ul>
      </section>
    </>
  );
}
