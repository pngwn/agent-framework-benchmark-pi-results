import { notFound } from 'next/navigation';
import { getMove, getTypeLabels, mapToSpecies } from 'lib/api';
import { MISSING, enEffect, enName, humanize, latestEnFlavor } from 'lib/format';
import { Section } from 'components/Section';
import { TypeBadgeLink } from 'components/TypeBadge';
import { CardGrid, PokemonCard } from 'components/PokemonCard';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { name } = await params;
  const move = await getMove(name);
  return { title: move ? enName(move.names, move.name) : 'Not found' };
}

export default async function MovePage({ params }) {
  const { name } = await params;
  const move = await getMove(name);
  if (!move) notFound();

  const typeLabels = await getTypeLabels();
  const displayName = enName(move.names, move.name);
  const typeName = move.type?.name ?? null;
  const effect = enEffect(move.effect_entries) ?? latestEnFlavor(move.flavor_text_entries) ?? MISSING;

  const learners = await mapToSpecies(
    (move.learned_by_pokemon ?? []).map((p) => ({ url: p.url })),
  );

  return (
    <>
      <h1 className="page-title">{displayName}</h1>
      <div className="panel facts-panel">
        <dl className="facts">
          <div>
            <dt>Type</dt>
            <dd>
              {typeName ? (
                <TypeBadgeLink name={typeName} label={typeLabels.get(typeName) ?? humanize(typeName)} />
              ) : (
                MISSING
              )}
            </dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{move.damage_class?.name ? humanize(move.damage_class.name) : MISSING}</dd>
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
      </div>

      <Section id="effect" title="Effect">
        <p>{effect}</p>
      </Section>

      <Section id="learned-by" title="Learned by">
        <p className="count">{learners.length} Pokémon</p>
        <CardGrid>
          {learners.map((s) => (
            <PokemonCard key={s.id} id={s.id} name={s.name} />
          ))}
        </CardGrid>
      </Section>
    </>
  );
}
