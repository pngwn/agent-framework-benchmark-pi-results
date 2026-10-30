import { PokemonCard, TypeBadge } from '@/components/PokemonCard';
import NotFound from '@/components/NotFound';
import { Section } from '@/components/Section';
import { getMove, getTypes } from '@/lib/api';
import { buildPokemonCards } from '@/lib/cards';
import {
  displayValue,
  englishName,
  humanize,
  latestEnglishFlavor,
} from '@/lib/format';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { name } = await params;
  const move = await getMove(name);
  if (!move) return { title: 'Not found – Pokédex' };
  return { title: `${englishName(move, move.name)} – Pokédex` };
}

export default async function MovePage({ params }) {
  const { name } = await params;
  const [move, typeData] = await Promise.all([getMove(name), getTypes()]);
  if (!move) return <NotFound />;

  const english = englishName(move, move.name);
  const typeName = move.type?.name;
  const typeEnglish = typeData.byName.get(typeName)?.english ?? humanize(typeName ?? '');
  const englishEffect = move.effect_entries?.find((entry) => entry.language?.name === 'en');
  const effect =
    englishEffect?.short_effect?.trim() ||
    latestEnglishFlavor(move.flavor_text_entries) ||
    '—';

  const cards = await buildPokemonCards(move.learned_by_pokemon ?? []);

  return (
    <>
      <h1>{english}</h1>

      <div className="panel section">
        <dl className="inline-details">
          <div>
            <dt>Type</dt>
            <dd>
              {typeName ? (
                <TypeBadge asLink name={typeName}>
                  {typeEnglish}
                </TypeBadge>
              ) : (
                '—'
              )}
            </dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{humanize(move.damage_class?.name ?? '—')}</dd>
          </div>
          <div>
            <dt>Power</dt>
            <dd>{displayValue(move.power)}</dd>
          </div>
          <div>
            <dt>Accuracy</dt>
            <dd>{displayValue(move.accuracy)}</dd>
          </div>
          <div>
            <dt>PP</dt>
            <dd>{displayValue(move.pp)}</dd>
          </div>
        </dl>
      </div>

      <Section id="effect" title="Effect">
        <p className="effect-text">{effect}</p>
      </Section>

      <Section id="learned-by" title="Learned by">
        <p className="result-count">{cards.length} Pokémon</p>
        {cards.length > 0 ? (
          <ul className="card-grid">
            {cards.map((card) => (
              <PokemonCard key={card.id} {...card} />
            ))}
          </ul>
        ) : (
          <p className="empty-message">No Pokémon found</p>
        )}
      </Section>
    </>
  );
}
