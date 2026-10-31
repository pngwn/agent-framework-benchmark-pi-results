import { data } from 'react-router';
import { abilityCards, apiBase, apiGet } from '../lib/api.server.js';
import { englishName } from '../lib/util.js';
import { CardList, Section } from '../lib/components.jsx';

export async function loader({ params }) {
  const ability = await apiGet(`/ability/${encodeURIComponent(params.name)}`);
  if (!ability) throw data('Not Found', { status: 404 });
  const cards = await abilityCards(ability.pokemon ?? []);
  return {
    apiBase,
    name: englishName(ability.names, ability.name),
    effect:
      ability.effect_entries.find((e) => e.language?.name === 'en')?.short_effect ?? '—',
    cards,
  };
}

export function meta({ loaderData }) {
  return [{ title: `${loaderData.name} – Pokédex` }];
}

export default function AbilityPage({ loaderData }) {
  const d = loaderData;
  return (
    <>
      <h1>{d.name}</h1>
      <Section id="effect" title="Effect">
        <p>{d.effect}</p>
      </Section>
      <Section id="pokemon" title="Pokémon">
        <p className="count">{d.cards.length} Pokémon</p>
        <CardList
          apiBase={d.apiBase}
          items={d.cards.map((c) => ({ ...c, note: c.hidden ? 'Hidden ability' : null }))}
        />
      </Section>
    </>
  );
}
