import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PokemonCard } from '../../components/PokemonCard';
import { getAbilityPageData, getAbilityRecord, isNotFound } from '../../lib/data';
import { englishName, NameInfo } from '../../lib/models';

export const dynamic = 'force-dynamic';

interface AbilityPageProps {
  params: Promise<{ name: string }>;
}

export async function generateMetadata({ params }: AbilityPageProps): Promise<Metadata> {
  const { name } = await params;
  const record = await getAbilityRecord(name);
  return { title: record ? englishName(record.names as NameInfo[], record.name) : 'Not found' };
}

export default async function AbilityPage({ params }: AbilityPageProps) {
  const { name } = await params;
  const data = await getAbilityPageData(name);

  if (isNotFound(data)) notFound();

  return (
    <main className="shell page">
      <h1>{data.englishName}</h1>

      <section className="panel" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{data.effect}</p>
      </section>

      <section className="panel" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p className="count">{data.pokemon.length} Pokémon</p>
        <ul className="card-grid">
          {data.pokemon.map((entry) => (
            <PokemonCard key={entry.card.id} card={entry.card} hidden={entry.hidden} />
          ))}
        </ul>
      </section>
    </main>
  );
}
