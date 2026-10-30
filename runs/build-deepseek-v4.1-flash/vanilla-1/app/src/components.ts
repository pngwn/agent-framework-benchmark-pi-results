import { formatDex, humanize, spriteUrl } from './api';

export function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function speciesHref(name: string): string {
  return `/pokemon/${encodeURIComponent(name)}`;
}

export function typeHref(name: string): string {
  return `/types/${encodeURIComponent(name)}`;
}

export function moveHref(name: string): string {
  return `/moves/${encodeURIComponent(name)}`;
}

export function abilityHref(name: string): string {
  return `/abilities/${encodeURIComponent(name)}`;
}

export function typeBadge(name: string, label: string, link = false): string {
  const safeName = escapeHtml(name);
  const text = escapeHtml(label);
  if (link) {
    return `<a class="type-badge type-${safeName}" href="${typeHref(name)}">${text}</a>`;
  }
  return `<span class="type-badge type-${safeName}">${text}</span>`;
}

export function pokemonCard(
  pokemon: { id: number; name: string; types?: { name: string }[]; hidden?: boolean },
  options: { showTypes?: boolean } = {},
): string {
  const types = options.showTypes
    ? `<span class="card-types">${(pokemon.types ?? [])
        .map((type) => typeBadge(type.name, humanize(type.name)))
        .join('')}</span>`
    : '';
  const hidden = pokemon.hidden ? '<span class="hidden-ability">Hidden ability</span>' : '';
  return `<li class="pokemon-card">
    <a class="pokemon-card-link" href="${speciesHref(pokemon.name)}">
      <img class="card-sprite" src="${spriteUrl(pokemon.id)}" alt="" width="96" height="96" loading="lazy" onerror="this.style.visibility='hidden'">
      <span class="dex">${formatDex(pokemon.id)}</span>
      <span class="poke-name">${escapeHtml(humanize(pokemon.name))}</span>
      ${hidden}
      ${types}
    </a>
  </li>`;
}

export function pokemonCardList(
  entries: { id: number; name: string; types?: { name: string }[]; hidden?: boolean }[],
  options: { showTypes?: boolean } = {},
): string {
  return `<ul class="card-grid">${entries
    .map((entry) => pokemonCard(entry, options))
    .join('')}</ul>`;
}
