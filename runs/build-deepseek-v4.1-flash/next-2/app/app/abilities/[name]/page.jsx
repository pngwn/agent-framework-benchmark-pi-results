import { PokemonCard } from '@/components/PokemonCard';
import NotFound from '@/components/NotFound';
import { Section } from '@/components/Section';
import { getAbility } from '@/lib/api';
import { buildPokemonCards } from '@/lib/cards';
import { englishName } from '@/lib/format';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { name } = await params;
  const ability = await getAbility(name);
  if (!ability) return { title: 'Not found – Pokédex' };
  return { title: `${englishName(ability, ability.name)} – Pokédex` };
}

export default async function AbilityPage({ params }) {
  const { name } = await params;
  const ability = await getAbility(name);
  if (!ability) return <NotFound />;

  const english = englishName(ability, ability.name);
  const englishEffect = ability.effect_entries?.find((entry) => entry.language?.name === 'en');
  const effect = englishEffect?.short_effect?.trim() || '—';

  const refs = ability.pokemon ?? [];
  const hiddenById = new Map();
  for (const entry of ability.pokemon ?? []) {
    const id = entry.pokemon?.url?.match(/\/(\d+)\/?$/)?.[1];
    if (!id) continue;
    const numericId = Number(id);
    hiddenById.set(numericId, Boolean(hiddenById.get(numericId)) || Boolean(entry.is_hidden));
  }
  const cards = await buildPokemonCards(refs, hiddenById);

  return (
    <>
      <h1>{english}</h1>

      <Section id="effect" title="Effect">
        <p className="effect-text">{effect}</p>
      </Section>

      <Section id="pokemon" title="Pokémon">
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
