import Link from 'next/link';
import { getMove, pokemonCardsFromRefs } from '../../../lib/api.js';
import {
  collapseWhitespace,
  englishName,
  humanize,
  latestEnglishFlavorText,
  missing,
} from '../../../lib/format.js';
import { NotFound } from '../../components/NotFound.jsx';
import { Section } from '../../components/Section.jsx';
import { PokemonCardList } from '../../components/PokemonCard.jsx';

export const dynamic = 'force-dynamic';

async function loadMove(name) {
  return getMove(String(name).toLowerCase());
}

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
  const shortEffect = move.effect_entries?.find((e) => e.language?.name === 'en')?.short_effect;
  const effect = shortEffect ? collapseWhitespace(shortEffect) : (latestEnglishFlavorText(move) ?? '—');

  const cards = await pokemonCardsFromRefs(move.learned_by_pokemon ?? []);

  return (
    <>
      <h1>{displayName}</h1>
      <div className="surface">
        <dl className="dl-row">
        <div>
          <dt>Type</dt>
          <dd>
            <Link className={`type-badge type-${move.type?.name}`} href={`/types/${move.type?.name}`}>
              {humanize(move.type?.name ?? '')}
            </Link>
          </dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{humanize(move.damage_class?.name ?? '')}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{missing(move.power)}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{missing(move.accuracy)}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{missing(move.pp)}</dd>
        </div>
        </dl>
      </div>

      <Section heading="Effect">
        <p>{effect}</p>
      </Section>

      <Section heading="Learned by">
        <p className="result-count">{cards.length} Pokémon</p>
        <PokemonCardList cards={cards} />
      </Section>
    </>
  );
}
