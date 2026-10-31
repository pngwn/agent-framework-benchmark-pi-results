import { html } from 'hono/html';
import { humanize, orMissing } from '../format.js';
import { section, typeBadge, cardList } from './components.js';

export const movePage = ({ move, name, typeLabel, effect, cards }) => html`
  <h1>${name}</h1>
  <div class="card-box">
    <dl class="facts">
      <div>
        <dt>Type</dt>
        <dd>${typeBadge({ name: move.type.name, label: typeLabel }, true)}</dd>
      </div>
      <div>
        <dt>Category</dt>
        <dd>${humanize(move.damage_class.name)}</dd>
      </div>
      <div>
        <dt>Power</dt>
        <dd>${orMissing(move.power)}</dd>
      </div>
      <div>
        <dt>Accuracy</dt>
        <dd>${orMissing(move.accuracy)}</dd>
      </div>
      <div>
        <dt>PP</dt>
        <dd>${orMissing(move.pp)}</dd>
      </div>
    </dl>
  </div>
  ${section('effect', 'Effect', html`<p>${effect}</p>`)}
  ${section('learned-by', 'Learned by', html`<p class="count">${cards.length} Pokémon</p>${cardList(cards)}`)}
`;

export const abilityPage = ({ name, effect, cards }) => html`
  <h1>${name}</h1>
  ${section('effect', 'Effect', html`<p>${effect}</p>`)}
  ${section('pokemon', 'Pokémon', html`<p class="count">${cards.length} Pokémon</p>${cardList(cards)}`)}
`;

export const typeListPage = (types) => html`
  <h1>Types</h1>
  <ul class="type-list" role="list">
    ${types.map(
      (t) => html`<li role="listitem"><a class="type-block type-${t.name}" href="/types/${t.name}">${t.label}</a></li>`,
    )}
  </ul>
`;

const RELATION_TERMS = [
  ['double_damage_to', 'Super effective against'],
  ['half_damage_to', 'Not very effective against'],
  ['no_damage_to', 'No effect against'],
  ['double_damage_from', 'Weak to'],
  ['half_damage_from', 'Resists'],
  ['no_damage_from', 'Immune to'],
];

export const typePage = ({ type, name, typeLabels, cards, moves }) => {
  const relations = html`
    <dl class="relations">
      ${RELATION_TERMS.map(([field, term]) => {
        const related = type.damage_relations[field] ?? [];
        return html`<div>
          <dt>${term}</dt>
          <dd>
            ${related.length
              ? related.map((r) => typeBadge({ name: r.name, label: typeLabels[r.name] ?? humanize(r.name) }, true))
              : html`<span class="none">None</span>`}
          </dd>
        </div>`;
      })}
    </dl>`;
  return html`
    <h1>${name}</h1>
    ${section('damage-relations', 'Damage relations', relations)}
    ${section('pokemon', 'Pokémon', html`<p class="count">${cards.length} Pokémon</p>${cardList(cards)}`)}
    ${section(
      'moves',
      'Moves',
      html`<p class="count">${moves.length} moves</p>
        <ul class="move-list" role="list">
          ${moves.map((m) => html`<li role="listitem"><a href="/moves/${m}">${humanize(m)}</a></li>`)}
        </ul>`,
    )}
  `;
};
