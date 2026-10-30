import type { Metadata } from 'next';
import NotFoundContent from '@/components/NotFoundContent';
import PokemonCard from '@/components/PokemonCard';
import Section from '@/components/Section';
import {
  frontSpriteUrl,
  getAllSpecies,
  getAbility,
  type SpeciesIndexEntry,
} from '@/lib/api';
import { englishName, idFromUrl } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: Promise<{ name: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { name } = await params;
  const ability = await getAbility(name);
  return { title: ability ? englishName(ability.names, ability.name) : 'Not found' };
}

export default async function AbilityPage({ params }: PageProps) {
  const { name } = await params;
  const ability = await getAbility(name);
  if (!ability) return <NotFoundContent />;

  const species = await getAllSpecies();
  const speciesById = new Map<number, SpeciesIndexEntry>(species.map((entry) => [entry.id, entry]));

  const found = new Map<number, { entry: SpeciesIndexEntry; hidden: boolean }>();
  for (const item of ability.pokemon) {
    const id = idFromUrl(item.pokemon.url);
    if (id === null) continue;
    const entry = speciesById.get(id);
    if (!entry) continue;
    const existing = found.get(id);
    if (existing) {
      existing.hidden = existing.hidden || item.is_hidden;
    } else {
      found.set(id, { entry, hidden: item.is_hidden });
    }
  }

  const pokemon = Array.from(found.values()).sort((a, b) => a.entry.id - b.entry.id);
  const effect =
    ability.effect_entries?.find((entry) => entry.language?.name === 'en')?.short_effect ?? '—';

  return (
    <>
      <h1>{englishName(ability.names, ability.name)}</h1>

      <Section id="effect" title="Effect">
        <p>{effect}</p>
      </Section>

      <Section id="pokemon" title="Pokémon">
        <p className="result-count">{pokemon.length} Pokémon</p>
        <ul className="card-grid">
          {pokemon.map((entry) => (
            <PokemonCard
              key={entry.entry.id}
              id={entry.entry.id}
              slug={entry.entry.name}
              name={entry.entry.displayName}
              spriteUrl={frontSpriteUrl(entry.entry.id)}
              hidden={entry.hidden}
            />
          ))}
        </ul>
      </Section>
    </>
  );
}
