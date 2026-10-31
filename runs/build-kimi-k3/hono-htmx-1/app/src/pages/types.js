import { html } from 'hono/html';
import { getRecord, getTypeRecords, getTypeEnglishNames, englishName, humanize } from '../api.js';
import { layout } from '../views/layout.js';
import { section, pokemonCardList, typeBadgeLink } from '../views/components.js';
import { cardsFromPokemonRefs } from '../cards.js';

const RELATIONS = [
  ['double_damage_to', 'Super effective against'],
  ['half_damage_to', 'Not very effective against'],
  ['no_damage_to', 'No effect against'],
  ['double_damage_from', 'Weak to'],
  ['half_damage_from', 'Resists'],
  ['no_damage_from', 'Immune to'],
];

export async function typeListPage(c) {
  const records = await getTypeRecords();
  const list = html`<ul class="type-grid">
    ${records.map(
      (record) => html`<li>
        <a class="type-${record.name}" href="/types/${record.name}">${englishName(record) ?? humanize(record.name)}</a>
      </li>`,
    )}
  </ul>`;
  return c.html(
    layout({
      title: 'Types – Pokédex',
      main: html`<h1>Types</h1>
        ${list}`,
    }),
  );
}

export async function typePage(c) {
  const name = c.req.param('name');
  const type = await getRecord('type', name);
  if (!type) return null;

  const displayName = englishName(type) ?? humanize(type.name);
  const typeNames = await getTypeEnglishNames();
  const cards = await cardsFromPokemonRefs(type.pokemon ?? []);

  const moves = (type.moves ?? [])
    .map((m) => ({ name: m.name, label: humanize(m.name) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const relations = section(
    'damage-relations',
    'Damage relations',
    html`<dl class="relations">
      ${RELATIONS.map(([key, term]) => {
        const refs = type.damage_relations?.[key] ?? [];
        return html`<div>
          <dt>${term}</dt>
          <dd>
            ${refs.length
              ? refs.map((ref) => typeBadgeLink(ref.name, typeNames.get(ref.name) ?? humanize(ref.name)))
              : 'None'}
          </dd>
        </div>`;
      })}
    </dl>`,
  );

  const pokemonSection = section(
    'pokemon',
    'Pokémon',
    html`<p class="count">${cards.length} Pokémon</p>
      ${pokemonCardList(cards)}`,
  );

  const movesSection = section(
    'moves',
    'Moves',
    html`<p class="count">${moves.length} moves</p>
      <ul class="move-list">
        ${moves.map((m) => html`<li><a href="/moves/${m.name}">${m.label}</a></li>`)}
      </ul>`,
  );

  return c.html(
    layout({
      title: `${displayName} – Pokédex`,
      main: html`<h1>${displayName}</h1>
        ${relations} ${pokemonSection} ${movesSection}`,
    }),
  );
}
