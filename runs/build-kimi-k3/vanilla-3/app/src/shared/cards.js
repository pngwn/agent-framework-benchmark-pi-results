import { humanize, dexNumber, escapeHtml } from './format.js';

// A Pokémon card: a link to the species page with sprite, dex number and humanized
// species name. Optionally shows type badges (home page) and extra text below the
// link (e.g. "Hidden ability").
export function cardHtml({ speciesName, speciesId, sprite, types = null, typeNames = {}, extra = '' }) {
  const img = sprite
    ? `<img src="${escapeHtml(sprite)}" alt="" width="96" height="96" loading="lazy">`
    : '<span class="card-noimg" aria-hidden="true"></span>';
  const badges =
    types && types.length
      ? `<span class="card-types">${types
          .map(
            (t) =>
              `<span class="type-badge" style="--type-color: var(--type-${escapeHtml(t)})">${escapeHtml(
                typeNames[t] ?? humanize(t),
              )}</span>`,
          )
          .join('')}</span>`
      : '';
  return (
    `<li class="card"><a class="card-link" href="/pokemon/${escapeHtml(speciesName)}">` +
    img +
    `<span class="card-dex">${dexNumber(speciesId)}</span>` +
    `<span class="card-name">${escapeHtml(humanize(speciesName))}</span>` +
    badges +
    `</a>${extra}</li>`
  );
}

export function cardGridHtml(cards, { showTypes = false, typeNames = {} } = {}) {
  const items = cards
    .map((c) =>
      cardHtml({
        speciesName: c.speciesName,
        speciesId: c.speciesId,
        sprite: c.sprite,
        types: showTypes ? c.types ?? [] : null,
        typeNames,
        extra: c.extra ?? '',
      }),
    )
    .join('');
  return `<ul class="card-grid">${items}</ul>`;
}
