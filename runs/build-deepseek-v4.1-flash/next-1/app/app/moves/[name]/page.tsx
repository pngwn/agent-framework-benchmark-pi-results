import type { Metadata } from 'next';
import Link from 'next/link';
import NotFoundContent from '@/components/NotFoundContent';
import PokemonCard from '@/components/PokemonCard';
import Section from '@/components/Section';
import {
  frontSpriteUrl,
  getAllSpecies,
  getMove,
  type SpeciesIndexEntry,
} from '@/lib/api';
import {
  displayValue,
  englishName,
  humanize,
  idFromUrl,
  latestEnglishFlavor,
} from '@/lib/format';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: Promise<{ name: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { name } = await params;
  const move = await getMove(name);
  return { title: move ? englishName(move.names, move.name) : 'Not found' };
}

export default async function MovePage({ params }: PageProps) {
  const { name } = await params;
  const move = await getMove(name);
  if (!move) return <NotFoundContent />;

  const species = await getAllSpecies();
  const speciesById = new Map<number, SpeciesIndexEntry>(species.map((entry) => [entry.id, entry]));

  const seen = new Set<number>();
  const learnedBy: SpeciesIndexEntry[] = [];
  for (const entry of move.learned_by_pokemon) {
    const id = idFromUrl(entry.url);
    if (id === null || seen.has(id)) continue;
    const found = speciesById.get(id);
    if (!found) continue;
    seen.add(id);
    learnedBy.push(found);
  }
  learnedBy.sort((a, b) => a.id - b.id);

  const english = englishName(move.names, move.name);
  const effect =
    move.effect_entries?.find((entry) => entry.language?.name === 'en')?.short_effect ||
    latestEnglishFlavor(move.flavor_text_entries) ||
    '—';
  const typeName = move.type?.name ?? 'unknown';

  return (
    <>
      <h1>{english}</h1>

      <div className="panel summary-panel">
        <dl className="inline-facts">
          <div className="summary-pair">
            <dt>Type</dt>
            <dd>
              <Link className={`type-badge type-${typeName}`} href={`/types/${typeName}`}>
                {humanize(typeName)}
              </Link>
            </dd>
          </div>
          <div className="summary-pair">
            <dt>Category</dt>
            <dd>{move.damage_class ? humanize(move.damage_class.name) : '—'}</dd>
          </div>
          <div className="summary-pair">
            <dt>Power</dt>
            <dd>{displayValue(move.power)}</dd>
          </div>
          <div className="summary-pair">
            <dt>Accuracy</dt>
            <dd>{displayValue(move.accuracy)}</dd>
          </div>
          <div className="summary-pair">
            <dt>PP</dt>
            <dd>{displayValue(move.pp)}</dd>
          </div>
        </dl>
      </div>

      <Section id="effect" title="Effect">
        <p>{effect}</p>
      </Section>

      <Section id="learned-by" title="Learned by">
        <p className="result-count">{learnedBy.length} Pokémon</p>
        <ul className="card-grid">
          {learnedBy.map((entry) => (
            <PokemonCard
              key={entry.id}
              id={entry.id}
              slug={entry.name}
              name={entry.displayName}
              spriteUrl={frontSpriteUrl(entry.id)}
            />
          ))}
        </ul>
      </Section>
    </>
  );
}
