// `/types/:name` — damage relations, Pokémon and moves of one of the 18 types.

import { fetchJson } from '../api.js';
import { loadCatalog, speciesForPokemonRef } from '../catalog.js';
import { badgeHtml, cardListHtml, pokemonCardHtml, sectionHtml } from '../components.js';
import { englishName, esc, humanize } from '../util.js';
import { renderNotFound } from './notfound.js';

const RELATIONS = [
  ['double_damage_to', 'Super effective against'],
  ['half_damage_to', 'Not very effective against'],
  ['no_damage_to', 'No effect against'],
  ['double_damage_from', 'Weak to'],
  ['half_damage_from', 'Resists'],
  ['no_damage_from', 'Immune to'],
];

export async function renderType(main, name, url, ctx) {
  const catalog = await loadCatalog();
  if (ctx.stale()) return;

  // The app covers the 18 types only.
  const known = catalog.types.find((t) => t.name === name);
  if (!known) return renderNotFound(main);

  let type;
  try {
    type = await fetchJson(`/api/v2/type/${encodeURIComponent(name)}/`);
  } catch (err) {
    if (err.status === 404) return renderNotFound(main);
    throw err;
  }
  if (ctx.stale()) return;

  const displayName = englishName(type.names) ?? humanize(type.name);
  document.title = `${displayName} – Pokédex`;

  const relations = RELATIONS.map(([key, term]) => {
    const related = type.damage_relations?.[key] ?? [];
    const content = related.length
      ? related
          .map((r) => badgeHtml(r.name, catalog.typeEn.get(r.name) ?? humanize(r.name), { link: true }))
          .join('')
      : 'None';
    return `<div class="relation"><dt>${esc(term)}</dt><dd>${content}</dd></div>`;
  }).join('');

  // Default-form Pokémon only, mapped to their species, ordered by dex number.
  const seen = new Set();
  const speciesList = [];
  for (const entry of type.pokemon ?? []) {
    const species = speciesForPokemonRef(catalog, entry.pokemon);
    if (!species || seen.has(species.id)) continue;
    seen.add(species.id);
    speciesList.push(species);
  }
  speciesList.sort((a, b) => a.id - b.id);

  const moves = (type.moves ?? [])
    .map((m) => ({ name: m.name, label: humanize(m.name) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const pokemonSection = `<p class="count">${speciesList.length} Pokémon</p>` +
    cardListHtml(speciesList.map((s) => pokemonCardHtml({ id: s.id, speciesName: s.name, label: s.human })));

  const movesSection = `<p class="count">${moves.length} moves</p>
    <ul class="move-list">${moves
      .map((m) => `<li><a href="/moves/${esc(m.name)}">${esc(m.label)}</a></li>`)
      .join('')}</ul>`;

  main.innerHTML =
    `<h1>${esc(displayName)}</h1>` +
    sectionHtml('damage-relations', 'Damage relations', `<dl class="relations">${relations}</dl>`) +
    sectionHtml('pokemon', 'Pokémon', pokemonSection) +
    sectionHtml('moves', 'Moves', movesSection);
}
