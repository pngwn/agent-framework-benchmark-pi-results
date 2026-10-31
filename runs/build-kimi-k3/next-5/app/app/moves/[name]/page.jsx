import Link from 'next/link';
import { notFound } from 'next/navigation';

import PokemonCard from '@/components/PokemonCard.jsx';
import Section from '@/components/Section.jsx';
import TypeBadge from '@/components/TypeBadge.jsx';
import { apiJson } from '@/lib/api.js';
import { getTypeLabels, pokemonRefsToSpecies } from '@/lib/data.js';
import {
  englishName,
  englishShortEffect,
  humanize,
  latestEnglishFlavorText,
} from '@/lib/format.js';

export const dynamic = 'force-dynamic';

async function getMove(name) {
  return apiJson(`/api/v2/move/${encodeURIComponent(name)}/`);
}

export async function generateMetadata({ params }) {
  const { name } = await params;
  const move = await getMove(name);
  return { title: move ? (englishName(move.names) ?? humanize(move.name)) : 'Not found' };
}

export default async function MovePage({ params }) {
  const { name } = await params;
  const move = await getMove(name);
  if (!move) notFound();

  const typeLabels = await getTypeLabels();
  const displayName = englishName(move.names) ?? humanize(move.name);
  const typeName = move.type?.name;
  const effect =
    englishShortEffect(move.effect_entries) ?? latestEnglishFlavorText(move.flavor_text_entries) ?? '—';
  const learners = await pokemonRefsToSpecies(move.learned_by_pokemon);

  return (
    <>
      <h1>{displayName}</h1>
      <div className="surface">
        <dl className="facts">
          <div>
            <dt>Type</dt>
            <dd>
              <TypeBadge
                name={typeName}
                label={typeLabels.get(typeName) ?? humanize(typeName)}
                href={`/types/${typeName}`}
              />
            </dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{humanize(move.damage_class?.name ?? '')}</dd>
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
      </div>

      <Section id="effect" title="Effect">
        <p>{effect}</p>
      </Section>

      <Section id="learned-by" title="Learned by">
        <p className="count">{learners.length} Pokémon</p>
        <ul className="cards">
          {learners.map((s) => (
            <PokemonCard key={s.id} id={s.id} speciesName={s.name} />
          ))}
        </ul>
      </Section>
    </>
  );
}
