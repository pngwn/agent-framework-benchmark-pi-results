import { html } from 'hono/html';
import { getRecord, englishName, humanize, orMissing } from '../api.js';
import { layout } from '../views/layout.js';
import { section, pokemonCardList } from '../views/components.js';
import { cardsFromPokemonRefs } from '../cards.js';

export async function abilityPage(c) {
  const name = c.req.param('name');
  const ability = await getRecord('ability', name);
  if (!ability) return null;

  const displayName = englishName(ability) ?? humanize(ability.name);
  const effect = ability.effect_entries?.find((e) => e.language?.name === 'en')?.short_effect ?? orMissing(null);

  const cards = await cardsFromPokemonRefs(ability.pokemon ?? []);

  const effectSection = section('effect', 'Effect', html`<p>${effect}</p>`);
  const pokemonSection = section(
    'pokemon',
    'Pokémon',
    html`<p class="count">${cards.length} Pokémon</p>
      ${pokemonCardList(cards, (card) => ({ hidden: card.hidden }))}`,
  );

  return c.html(
    layout({
      title: `${displayName} – Pokédex`,
      main: html`<h1>${displayName}</h1>
        ${effectSection} ${pokemonSection}`,
    }),
  );
}
