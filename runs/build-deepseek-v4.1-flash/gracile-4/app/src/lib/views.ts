import { html, type TemplateResult } from 'lit';
import { dexNumber, humanize, mediaSprite } from './api.js';

export type TypeInfo = { name: string; label: string };

export type CardItem = {
  id: number;
  name: string;
  sprite?: string | null;
  types?: TypeInfo[];
  hidden?: boolean;
};

export function typeBadge(type: TypeInfo): TemplateResult {
  return html`<span class=${`type-badge type-${type.name}`}>${type.label}</span>`;
}

export function typeLink(type: TypeInfo): TemplateResult {
  return html`<a class=${`type-badge type-${type.name}`} href=${`/types/${type.name}`}>${type.label}</a>`;
}

export function pokemonCard(item: CardItem): TemplateResult {
  const label = humanize(item.name);
  const sprite = item.sprite || mediaSprite(item.id);
  return html`
    <li class="pokemon-card">
      <a class="pokemon-card-link" href=${`/pokemon/${item.name}`}>
        <img class="card-sprite" src=${sprite} alt=${label} width="96" height="96" loading="lazy" />
        <span class="card-dex">${dexNumber(item.id)}</span>
        <span class="card-name">${label}</span>
        ${item.types?.length
          ? html`<span class="card-types">${item.types.map((type) => typeBadge(type))}</span>`
          : html``}
      </a>
      ${item.hidden ? html`<span class="hidden-ability">Hidden ability</span>` : html``}
    </li>
  `;
}

export function cardGrid(items: CardItem[]): TemplateResult {
  return html`<ul class="card-grid">${items.map((item) => pokemonCard(item))}</ul>`;
}

export function notFoundPage(): TemplateResult {
  return html`
    <main class="page">
      <h1>Not found</h1>
      <p><a href="/">Back to the Pokédex</a></p>
    </main>
  `;
}
