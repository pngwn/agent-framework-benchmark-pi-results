import { spriteUrl, speciesNames, type Ref } from './api';
import { h, uniqueId, type Child } from './dom';
import { dexNumber, humanize, idFromUrl } from './format';

export interface CardData {
  id: number;
  /** Species API name. */
  name: string;
  types?: { name: string; label: string }[];
  hidden?: boolean;
}

export function typeBadge(type: string, label: string, asLink = true): HTMLElement {
  const cls = `type-badge type-badge--${type}`;
  return asLink ? h('a', { class: cls, href: `/types/${type}` }, label) : h('span', { class: cls }, label);
}

// Cards beyond this index load their sprite lazily.
const EAGER_CARDS = 120;

export function pokemonCardLink(card: CardData, index = 0): HTMLAnchorElement {
  return h(
    'a',
    { class: 'card', href: `/pokemon/${card.name}` },
    h('img', { class: 'card__sprite', src: spriteUrl(card.id), alt: '', width: 96, height: 96, loading: index < EAGER_CARDS ? 'eager' : 'lazy', decoding: 'async' }),
    h('span', { class: 'card__dex' }, dexNumber(card.id)),
    h('span', { class: 'card__name' }, humanize(card.name)),
    card.types?.length ? h('span', { class: 'card__types' }, card.types.map((t) => typeBadge(t.name, t.label, false))) : null,
    card.hidden ? h('span', { class: 'card__note' }, 'Hidden ability') : null,
  );
}

export function pokemonCard(card: CardData, index = 0): HTMLLIElement {
  return h('li', { class: 'card-item' }, pokemonCardLink(card, index));
}

export const cardList = (cards: CardData[]) => h('ul', { class: 'card-grid' }, cards.map((c, i) => pokemonCard(c, i)));

export const countLine = (n: number, noun = 'Pokémon') => h('p', { class: 'count' }, `${n} ${noun}`);

/** A region named by its heading. */
export function section(title: string, children: Child[], attrs: Record<string, unknown> = {}): HTMLElement {
  const headingId = attrs.id ? `${attrs.id}-heading` : uniqueId('section');
  return h('section', { class: 'panel', 'aria-labelledby': headingId, ...attrs }, h('h2', { id: headingId }, title), children);
}

/**
 * Turns Pokémon references (from types, moves, abilities) into cards for their species,
 * leaving out alternate forms (IDs above 10000). Ordered by dex number.
 */
export async function cardsFromPokemon<T>(items: T[], ref: (item: T) => Ref, extra?: (item: T) => Partial<CardData>): Promise<CardData[]> {
  const names = await speciesNames();
  const byId = new Map<number, CardData>();
  for (const item of items) {
    const r = ref(item);
    const id = idFromUrl(r.url);
    if (!Number.isFinite(id) || id > 10000 || byId.has(id)) continue;
    byId.set(id, { id, name: names.get(id) ?? r.name, ...extra?.(item) });
  }
  return [...byId.values()].sort((a, b) => a.id - b.id);
}
