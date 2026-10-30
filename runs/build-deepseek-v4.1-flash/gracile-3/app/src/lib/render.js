import { html, nothing } from 'lit';
import { dexNumber, humanize } from './format.js';

export function typeBadge(name, label = humanize(name)) {
  return html`<span class="type-badge" style=${`--badge: var(--type-${name});`}>${label}</span>`;
}

export function typePillLink(name, label = humanize(name)) {
  return html`<a class="type-badge type-badge-link" href=${`/types/${name}`} style=${`--badge: var(--type-${name});`}>${label}</a>`;
}

export function pokemonCard(card, showTypes = false) {
  return html`
    <li class="card-item">
      <a class="pokemon-card" href=${`/pokemon/${card.name}`}>
        ${card.sprite
          ? html`<img class="card-sprite" src=${card.sprite} alt=${card.displayName} loading="lazy" />`
          : html`<span class="card-sprite card-sprite-empty" aria-hidden="true"></span>`}
        <span class="card-dex">${dexNumber(card.id)}</span>
        <span class="card-name">${card.displayName}</span>
        ${showTypes && card.types?.length
          ? html`<span class="card-types">${card.types.map((type) => typeBadge(type))}</span>`
          : nothing}
      </a>
    </li>
  `;
}

export function cardList(cards, showTypes = false) {
  return html`<ul class="card-grid">${cards.map((card) => pokemonCard(card, showTypes))}</ul>`;
}
