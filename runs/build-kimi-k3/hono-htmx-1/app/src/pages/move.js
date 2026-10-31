import { html } from 'hono/html';
import { getRecord, getTypeEnglishNames, englishName, latestEnglishFlavorText, humanize, orMissing } from '../api.js';
import { layout } from '../views/layout.js';
import { section, pokemonCardList, typeBadgeLink } from '../views/components.js';
import { cardsFromPokemonRefs } from '../cards.js';

export async function movePage(c) {
  const name = c.req.param('name');
  const move = await getRecord('move', name);
  if (!move) return null;

  const displayName = englishName(move) ?? humanize(move.name);
  const typeNames = await getTypeEnglishNames();
  const effect =
    move.effect_entries?.find((e) => e.language?.name === 'en')?.short_effect ??
    latestEnglishFlavorText(move) ??
    orMissing(null);

  const cards = await cardsFromPokemonRefs(move.learned_by_pokemon ?? []);

  const facts = html`<div class="panel">
    <dl class="facts move-facts">
      <div><dt>Type</dt><dd>${typeBadgeLink(move.type.name, typeNames.get(move.type.name) ?? humanize(move.type.name))}</dd></div>
      <div><dt>Category</dt><dd>${humanize(move.damage_class.name)}</dd></div>
      <div><dt>Power</dt><dd>${orMissing(move.power)}</dd></div>
      <div><dt>Accuracy</dt><dd>${orMissing(move.accuracy)}</dd></div>
      <div><dt>PP</dt><dd>${orMissing(move.pp)}</dd></div>
    </dl>
  </div>`;

  const effectSection = section('effect', 'Effect', html`<p>${effect}</p>`);
  const learnedBySection = section(
    'learned-by',
    'Learned by',
    html`<p class="count">${cards.length} Pokémon</p>
      ${pokemonCardList(cards)}`,
  );

  return c.html(
    layout({
      title: `${displayName} – Pokédex`,
      main: html`<h1>${displayName}</h1>
        ${facts} ${effectSection} ${learnedBySection}`,
    }),
  );
}
