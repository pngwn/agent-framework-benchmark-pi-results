import { spriteUrl } from './api';
import type { SpeciesRef, TypeInfo } from './data';
import { dexNumber, esc, humanize } from './util';

/** Colored pill for a type. */
export function typeBadge(t: TypeInfo, link: boolean): string {
  const label = esc(t.en);
  const cls = `type-badge type-${t.name}`;
  return link
    ? `<a class="${cls}" href="/types/${esc(t.name)}">${label}</a>`
    : `<span class="${cls}">${label}</span>`;
}

export interface CardOptions {
  /** Show the Pokémon's types (home page). */
  types?: TypeInfo[];
  /** Extra muted line, e.g. `Hidden ability`. */
  note?: string;
}

/** A Pokémon card: link, sprite, dex number and humanized name. */
export function pokemonCard(sp: SpeciesRef, opts: CardOptions = {}): string {
  const badges = opts.types?.length
    ? `<span class="card-types">${opts.types.map((t) => typeBadge(t, false)).join('')}</span>`
    : '';
  const note = opts.note ? `<span class="card-note">${esc(opts.note)}</span>` : '';
  return `<li><a class="card" href="/pokemon/${esc(sp.name)}">
    <img src="${spriteUrl(sp.id)}" alt="" width="96" height="96" loading="lazy" />
    <span class="card-dex">${dexNumber(sp.id)}</span>
    <span class="card-name">${esc(humanize(sp.name))}</span>
    ${badges}${note}
  </a></li>`;
}

export function cardList(cards: string[]): string {
  return `<ul class="card-grid">${cards.join('')}</ul>`;
}

let sectionCounter = 0;

/** A section: element with the region role named by its heading. */
export function section(title: string, inner: string, attrs = ''): string {
  const id = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-heading-${++sectionCounter}`;
  return `<section class="panel card-section" aria-labelledby="${id}"${attrs}>
    <h2 id="${id}">${esc(title)}</h2>
    ${inner}
  </section>`;
}
