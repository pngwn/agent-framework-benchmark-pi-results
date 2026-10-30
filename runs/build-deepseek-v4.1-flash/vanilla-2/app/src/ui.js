import {
  escapeAttr,
  escapeHtml,
  formatDex,
  humanize,
  spriteUrl,
} from './api.js';

export function typeBadge(type) {
  const apiName = type.apiName || type.name;
  const label = type.label || type.englishName || humanize(apiName);
  return `<span class="type-badge type-${escapeAttr(apiName)}">${escapeHtml(label)}</span>`;
}

export function pokemonCardHtml(species, options = {}) {
  const types = options.types || [];
  const extraHtml = options.extraHtml || '';
  const name = humanize(species.name);
  return `<li class="pokemon-card">
    <a class="pokemon-card-link" href="/pokemon/${escapeAttr(encodeURIComponent(species.name))}">
      <img class="pokemon-card-sprite" src="${escapeAttr(spriteUrl(species.id))}" alt="" width="96" height="96" />
      <span class="pokemon-card-dex">${formatDex(species.id)}</span>
      <span class="pokemon-card-name">${escapeHtml(name)}</span>
      ${types.length ? `<span class="pokemon-card-types">${types.map(typeBadge).join('')}</span>` : ''}
      ${extraHtml}
    </a>
  </li>`;
}

export function pokemonCardListHtml(speciesRefs, optionsForSpecies = () => ({})) {
  return `<ul class="card-grid">${speciesRefs
    .map((species) => pokemonCardHtml(species, optionsForSpecies(species)))
    .join('')}</ul>`;
}

export function panelHtml(id, title, body, extraAttributes = '') {
  return `<section class="panel" aria-labelledby="${escapeAttr(id)}-heading"${extraAttributes}>
    <h2 id="${escapeAttr(id)}-heading">${escapeHtml(title)}</h2>
    ${body}
  </section>`;
}
