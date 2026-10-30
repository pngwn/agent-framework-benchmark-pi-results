import Link from 'next/link';
import { notFound } from 'next/navigation';

import PokeCard from '@/components/PokeCard';
import { getMove, getTypeLabelMap, speciesFromPokemonRefs, spriteUrl } from '@/lib/data';
import {
  englishName,
  englishShortEffect,
  formatValue,
  humanize,
  latestEnglishFlavorText,
} from '@/lib/display';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }) {
  const { name } = await params;
  const move = await getMove(name);
  if (!move) return { title: 'Not found' };
  return { title: englishName(move, humanize(move.name)) };
}

export default async function MovePage({ params }) {
  const { name } = await params;
  const move = await getMove(name);
  if (!move) notFound();

  const [typeLabels, learnedBy] = await Promise.all([
    getTypeLabelMap(),
    speciesFromPokemonRefs(move.learned_by_pokemon),
  ]);

  const typeName = move.type?.name ?? '';
  const typeLabel = typeLabels.get(typeName) ?? humanize(typeName);
  const effect =
    englishShortEffect(move.effect_entries) || latestEnglishFlavorText(move.flavor_text_entries) || '—';

  return (
    <>
      <h1>{englishName(move, humanize(move.name))}</h1>

      <dl className="summaryCard inlineFacts">
        <div>
          <dt>Type</dt>
          <dd>
            <Link className="typeBadge" data-type={typeName} href={`/types/${typeName}`}>
              {typeLabel}
            </Link>
          </dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{move.damage_class?.name ? humanize(move.damage_class.name) : '—'}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{formatValue(move.power)}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{formatValue(move.accuracy)}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{formatValue(move.pp)}</dd>
        </div>
      </dl>

      <section className="section" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{effect}</p>
      </section>

      <section className="section" aria-labelledby="learned-by-heading">
        <h2 id="learned-by-heading">Learned by</h2>
        <p className="count">{learnedBy.length} Pokémon</p>
        <ul className="cardGrid">
          {learnedBy.map((species) => (
            <PokeCard key={species.id} species={species} sprite={spriteUrl(species.id)} />
          ))}
        </ul>
      </section>
    </>
  );
}
