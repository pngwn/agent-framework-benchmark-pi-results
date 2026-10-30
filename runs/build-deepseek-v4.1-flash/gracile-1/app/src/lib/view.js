import { html } from 'lit';
import { dexNumber, humanize, valueOrDash } from './text.js';

export function typeBadge(type) {
  const name = typeof type === 'string' ? type : type.name;
  const label = typeof type === 'string' ? humanize(type) : type.english ?? humanize(name);
  return html`<span class="type-badge type-${name}">${label}</span>`;
}

export function typeLink(type, typeByApiName) {
  const info = typeByApiName?.get(type.name) ?? type;
  const label = info?.english ?? humanize(type.name);
  return html`<a class="type-link" href="/types/${type.name}">${label}</a>`;
}

export function pokemonCard(card, { showTypes = false, types = [] } = {}) {
  const speciesName = card.speciesName ?? card.name;
  const speciesId = card.speciesId ?? card.id;
  return html`
    <li class="card-item">
      <a class="pokemon-card" href="/pokemon/${speciesName}">
        <img
          class="card-sprite"
          src=${card.sprite ?? ''}
          alt=""
          width="96"
          height="96"
          loading="lazy"
        />
        <span class="card-dex">${dexNumber(speciesId)}</span>
        <span class="card-name">${card.displayName}</span>
        ${showTypes && types.length
          ? html`<span class="card-types">${types.map((type) => typeBadge(type))}</span>`
          : ''}
        ${card.hidden ? html`<span class="card-hidden">Hidden ability</span>` : ''}
      </a>
    </li>
  `;
}

export function cardGrid(cards, options = {}) {
  return html`
    <ul class="card-grid">
      ${cards.map((card) => pokemonCard(card, { ...options, types: options.types ?? card.types ?? [] }))}
    </ul>
  `;
}

export function section(id, title, content, extraClass = '') {
  return html`
    <section class="panel ${extraClass}" aria-labelledby=${id}>
      <h2 id=${id}>${title}</h2>
      ${content}
    </section>
  `;
}

export function countLine(count, noun = 'Pokémon') {
  return html`<p class="count-line">${count} ${noun}</p>`;
}

export function typePill(type, typeByApiName) {
  const info = typeByApiName?.get(type.name) ?? type;
  return html`<a class="type-pill type-${type.name}" href="/types/${type.name}"
    >${info?.english ?? humanize(type.name)}</a
  >`;
}

export function statLabel(statName) {
  return (
    {
      hp: 'HP',
      attack: 'Attack',
      defense: 'Defense',
      'special-attack': 'Sp. Atk',
      'special-defense': 'Sp. Def',
      speed: 'Speed',
    }[statName] ?? humanize(statName)
  );
}

export function statsTable(stats) {
  const total = stats.reduce((sum, stat) => sum + stat.base_stat, 0);
  const max = Math.max(...stats.map((stat) => stat.base_stat), 1);
  return html`
    <table class="stats-table">
      <tbody>
        ${stats.map(
          (stat) => html`
            <tr>
              <th scope="row">${statLabel(stat.stat.name)}</th>
              <td class="stat-value">${stat.base_stat}</td>
              <td class="stat-bar-cell">
                <span
                  class="stat-bar"
                  style=${`width: ${Math.round((stat.base_stat / max) * 100)}%`}
                  aria-hidden="true"
                ></span>
              </td>
            </tr>
          `,
        )}
        <tr class="stat-total">
          <th scope="row">Total</th>
          <td class="stat-value">${total}</td>
          <td class="stat-bar-cell"></td>
        </tr>
      </tbody>
    </table>
  `;
}

export function evolutionList(node, depth = 0) {
  if (!node) return '';
  return html`
    <ul class="evolution-list">
      <li>
        <a href="/pokemon/${node.species.name}">${humanize(node.species.name)}</a>
        ${node.evolves_to?.length
          ? html`${node.evolves_to.map((child) => evolutionList(child, depth + 1))}`
          : ''}
      </li>
    </ul>
  `;
}

export function damageRelations(type, typeByApiName) {
  const relations = type.damage_relations ?? {};
  const rows = [
    ['Super effective against', relations.double_damage_to],
    ['Not very effective against', relations.half_damage_to],
    ['No effect against', relations.no_damage_to],
    ['Weak to', relations.double_damage_from],
    ['Resists', relations.half_damage_from],
    ['Immune to', relations.no_damage_from],
  ];
  return html`
    <dl class="damage-relations">
      ${rows.map(
        ([term, values]) => html`
          <div class="damage-relation">
            <dt>${term}</dt>
            <dd>
              ${values?.length
                ? values.map((value) => typePill(value, typeByApiName))
                : html`<span class="none-value">None</span>`}
            </dd>
          </div>
        `,
      )}
    </dl>
  `;
}

export function moveCell(value) {
  return html`<td class="numeric">${valueOrDash(value)}</td>`;
}
