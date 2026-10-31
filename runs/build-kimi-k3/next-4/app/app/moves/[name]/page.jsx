import Link from 'next/link';
import { notFound } from 'next/navigation';
import PokemonCards from '../../../components/PokemonCards.jsx';
import Section from '../../../components/Section.jsx';
import { apiGet } from '../../../lib/api.js';
import { getTypeEnMap, pokemonRefsToSpecies } from '../../../lib/data.js';
import { collapseWhitespace, englishName, humanize, latestEnglishFlavor } from '../../../lib/format.js';

export const dynamic = 'force-dynamic';

async function getMove(name) {
  return apiGet(`move/${encodeURIComponent(name)}`);
}

export async function generateMetadata({ params }) {
  const { name } = await params;
  const move = await getMove(name);
  return { title: move ? englishName(move) : 'Not found' };
}

export default async function MovePage({ params }) {
  const { name } = await params;
  const move = await getMove(name);
  if (!move) notFound();

  const [typeEn, learners] = await Promise.all([
    getTypeEnMap(),
    pokemonRefsToSpecies(move.learned_by_pokemon ?? []),
  ]);

  const title = englishName(move);
  const shortEffect = move.effect_entries?.find((e) => e.language?.name === 'en')?.short_effect;
  const effect = (shortEffect && collapseWhitespace(shortEffect)) || latestEnglishFlavor(move.flavor_text_entries) || '—';
  const typeName = move.type?.name ?? '';

  return (
    <>
      <h1>{title}</h1>
      <dl className="facts">
        <div>
          <dt>Type</dt>
          <dd>{typeName ? <Link href={`/types/${typeName}`}>{typeEn.get(typeName) ?? humanize(typeName)}</Link> : '—'}</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{move.damage_class?.name ? humanize(move.damage_class.name) : '—'}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{move.power ?? '—'}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{move.accuracy ?? '—'}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{move.pp ?? '—'}</dd>
        </div>
      </dl>

      <Section id="effect" title="Effect">
        <p>{effect}</p>
      </Section>

      <Section id="learned-by" title="Learned by">
        <p className="count">{learners.length} Pokémon</p>
        <PokemonCards items={learners} />
      </Section>
    </>
  );
}
