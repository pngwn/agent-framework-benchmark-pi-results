import { cache } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../../lib/api.js';
import { buildPokemonCards, getTypeLabels } from '../../../lib/data.js';
import {
  MISSING,
  englishName,
  englishShortEffect,
  humanize,
  latestEnglishFlavor,
} from '../../../lib/format.js';
import { NotFound, PokemonCardList, Section } from '../../../lib/components.jsx';

export const dynamic = 'force-dynamic';

const loadMove = cache(async (rawName) => {
  const name = decodeURIComponent(rawName).toLowerCase();
  return apiFetch(`/move/${encodeURIComponent(name)}/`);
});

export async function generateMetadata({ params }) {
  const { name } = await params;
  const move = await loadMove(name);
  return { title: move ? englishName(move) : 'Not found' };
}

export default async function MovePage({ params }) {
  const { name } = await params;
  const move = await loadMove(name);
  if (!move) return <NotFound />;

  const displayName = englishName(move);
  const typeLabels = await getTypeLabels();
  const effect = englishShortEffect(move) ?? latestEnglishFlavor(move) ?? MISSING;
  const cards = await buildPokemonCards(move.learned_by_pokemon ?? []);

  return (
    <>
      <h1>{displayName}</h1>
      <dl className="facts facts-panel">
        <div>
          <dt>Type</dt>
          <dd>
            <Link href={`/types/${move.type?.name}`} className={`type-badge type-${move.type?.name}`}>
              {typeLabels[move.type?.name] ?? humanize(move.type?.name ?? '')}
            </Link>
          </dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{humanize(move.damage_class?.name ?? '') || MISSING}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{move.power ?? MISSING}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{move.accuracy ?? MISSING}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{move.pp ?? MISSING}</dd>
        </div>
      </dl>

      <Section labelledBy="effect-heading" title="Effect">
        <p>{effect}</p>
      </Section>

      <Section labelledBy="learned-by-heading" title="Learned by">
        <p className="count-text">{cards.length} Pokémon</p>
        <PokemonCardList cards={cards} />
      </Section>
    </>
  );
}
