import { h } from './dom';
import {
  dexNumber,
  humanize,
  spriteUrl,
  typeClassName,
} from './format';

export interface CardSpecies {
  id: number;
  name: string;
}

export interface CardOptions {
  types?: string[];
  hiddenAbility?: boolean;
}

export function pokemonCard(species: CardSpecies, options: CardOptions = {}): HTMLLIElement {
  const name = humanize(species.name);
  const typeBadges = options.types?.length
    ? h(
        'span',
        { class: 'card-types' },
        ...options.types.map((typeName) =>
          h('span', { class: `type-badge ${typeClassName(typeName)}` }, humanize(typeName)),
        ),
      )
    : null;

  const card = h(
    'li',
    { class: 'pokemon-card' },
    h(
      'a',
      { class: 'pokemon-card-link', href: `/pokemon/${encodeURIComponent(species.name)}` },
      h('img', {
        class: 'card-sprite',
        src: spriteUrl(species.id),
        alt: '',
        width: 96,
        height: 96,
        loading: 'lazy',
      }),
      h('span', { class: 'card-dex' }, dexNumber(species.id)),
      h('span', { class: 'card-name' }, name),
      typeBadges,
    ),
  );
  if (options.hiddenAbility) {
    card.appendChild(h('span', { class: 'card-note' }, 'Hidden ability'));
  }
  return card;
}

export function cardList(species: CardSpecies[], options: (species: CardSpecies) => CardOptions = () => ({})): HTMLUListElement {
  return h(
    'ul',
    { class: 'cards' },
    ...species.map((entry) => pokemonCard(entry, options(entry))),
  );
}

export function typeBadge(typeName: string): HTMLSpanElement {
  return h('span', { class: `type-badge ${typeClassName(typeName)}` }, humanize(typeName));
}

export function typeBadgeLink(typeName: string): HTMLAnchorElement {
  return h(
    'a',
    { class: `type-badge type-badge-link ${typeClassName(typeName)}`, href: `/types/${encodeURIComponent(typeName)}` },
    humanize(typeName),
  );
}
