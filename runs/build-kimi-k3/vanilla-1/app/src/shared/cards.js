import { escapeHtml, humanize, dexNumber } from './format.js';

// A Pokémon card: link to the species page with sprite, dex number and name.
// `pokemon`: { id, name } where name is the *species* API name.
// Options:
//   mediaBase  - origin of the media server (front sprite URLs)
//   types      - [{ name, en }] in slot order, shown as badges (home page)
//   typeEn     - map type api name -> English name (used when types are bare names)
//   note       - extra text shown under the name (e.g. "Hidden ability")
export function cardHtml(pokemon, { mediaBase, types, typeEn = {}, note } = {}) {
  const typeList = types ?? pokemon.types ?? [];
  const noteText = note ?? pokemon.note ?? '';
  const badges = typeList
    .map((t) => {
      const name = typeof t === 'string' ? t : t.name;
      const en = (typeof t === 'object' && t.en) || typeEn[name] || humanize(name);
      return `<span class="type-badge type-${escapeHtml(name)}">${escapeHtml(en)}</span>`;
    })
    .join('');
  return (
    `<li class="card">` +
    `<a href="/pokemon/${escapeHtml(pokemon.name)}">` +
    `<img class="card-sprite" src="${escapeHtml(mediaBase)}/media/sprites/pokemon/${pokemon.id}.png" alt="" width="96" height="96" loading="lazy">` +
    `<span class="card-dex">${dexNumber(pokemon.id)}</span>` +
    `<span class="card-name">${escapeHtml(humanize(pokemon.name))}</span>` +
    (badges ? `<span class="card-types">${badges}</span>` : '') +
    (noteText ? `<span class="card-note">${escapeHtml(noteText)}</span>` : '') +
    `</a>` +
    `</li>`
  );
}

export function cardListHtml(pokemons, options) {
  return `<ul class="card-grid">${pokemons.map((p) => cardHtml(p, options)).join('')}</ul>`;
}
