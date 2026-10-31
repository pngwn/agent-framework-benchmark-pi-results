import { getAbility, pokemonCardsFromRefs } from '../../../lib/api.js';
import { collapseWhitespace, englishName } from '../../../lib/format.js';
import { NotFound } from '../../components/NotFound.jsx';
import { Section } from '../../components/Section.jsx';
import { PokemonCardList } from '../../components/PokemonCard.jsx';

export const dynamic = 'force-dynamic';

async function loadAbility(name) {
  return getAbility(String(name).toLowerCase());
}

export async function generateMetadata({ params }) {
  const { name } = await params;
  const ability = await loadAbility(name);
  return { title: ability ? englishName(ability) : 'Not found' };
}

export default async function AbilityPage({ params }) {
  const { name } = await params;
  const ability = await loadAbility(name);
  if (!ability) return <NotFound />;

  const shortEffect = ability.effect_entries?.find((e) => e.language?.name === 'en')?.short_effect;
  const effect = shortEffect ? collapseWhitespace(shortEffect) : '—';

  const cards = await pokemonCardsFromRefs(
    (ability.pokemon ?? []).map((entry) => ({ ref: entry.pokemon, hidden: entry.is_hidden })),
  );

  return (
    <>
      <h1>{englishName(ability)}</h1>

      <Section heading="Effect">
        <p>{effect}</p>
      </Section>

      <Section heading="Pokémon">
        <p className="result-count">{cards.length} Pokémon</p>
        <PokemonCardList cards={cards} />
      </Section>
    </>
  );
}
