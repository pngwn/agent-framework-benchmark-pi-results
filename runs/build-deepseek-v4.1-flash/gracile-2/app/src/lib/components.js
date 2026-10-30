import { html } from 'lit';

import { dexNumber, spriteUrl, typeClassName } from './api.js';

export function typeBadge(type) {
  const name = typeof type === 'string' ? type : type.name;
  const label = typeof type === 'string' ? type : type.englishName;
  return html`<span class="type-badge ${typeClassName(name)}">${label}</span>`;
}

export function typeBadgeLink(type) {
  return html`<a class="type-badge ${typeClassName(type.name)}" href="/types/${type.name}">${type.englishName}</a>`;
}

export function pokemonCard(species, options = {}) {
  const { showTypes = false, hidden = false } = options;

  return html`
    <li class="pokemon-card">
      <a class="pokemon-card-link" href="/pokemon/${species.name}">
        <img
          class="pokemon-sprite"
          src=${spriteUrl(species.id)}
          alt=""
          width="96"
          height="96"
        />
        <span class="pokemon-dex">${dexNumber(species.id)}</span>
        <span class="pokemon-name">${species.humanizedName}</span>
        ${showTypes && species.types?.length
          ? html`<span class="pokemon-card-types">
              ${species.types.map((type) => typeBadge(type))}
            </span>`
          : ''}
      </a>
      ${hidden ? html`<span class="hidden-ability">Hidden ability</span>` : ''}
    </li>
  `;
}

export function pokemonCardList(items, options = {}) {
  return html`
    <ul class="pokemon-grid card-list">
      ${items.map((item) => pokemonCard(item, {
        showTypes: options.showTypes,
        hidden: options.hidden?.(item) ?? false,
      }))}
    </ul>
  `;
}
