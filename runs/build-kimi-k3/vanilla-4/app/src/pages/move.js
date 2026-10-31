// `/moves/:name` — move details and the Pokémon that learn it.

import { fetchJson } from '../api.js';
import { loadCatalog, speciesForPokemonRef } from '../catalog.js';
import { badgeHtml, cardListHtml, pokemonCardHtml, sectionHtml } from '../components.js';
import { englishName, esc, humanize, latestEnglishFlavor, MISSING, showValue } from '../util.js';
import { renderNotFound } from './notfound.js';

export async function renderMove(main, name, url, ctx) {
  let move;
  try {
    move = await fetchJson(`/api/v2/move/${encodeURIComponent(name)}/`);
  } catch (err) {
    if (err.status === 404) return renderNotFound(main);
    throw err;
  }
  const catalog = await loadCatalog();
  if (ctx.stale()) return;

  const displayName = englishName(move.names) ?? humanize(move.name);
  document.title = `${displayName} – Pokédex`;

  const typeName = move.type?.name ?? '';
  const typeLabel = catalog.typeEn.get(typeName) ?? humanize(typeName);
  const category = move.damage_class ? humanize(move.damage_class.name) : MISSING;

  const facts = `<dl class="facts panel facts-panel">
    <div class="fact"><dt>Type</dt><dd>${typeName ? badgeHtml(typeName, typeLabel, { link: true }) : MISSING}</dd></div>
    <div class="fact"><dt>Category</dt><dd>${esc(category)}</dd></div>
    <div class="fact"><dt>Power</dt><dd>${showValue(move.power)}</dd></div>
    <div class="fact"><dt>Accuracy</dt><dd>${showValue(move.accuracy)}</dd></div>
    <div class="fact"><dt>PP</dt><dd>${showValue(move.pp)}</dd></div>
  </dl>`;

  const effect =
    move.effect_entries?.find((e) => e.language?.name === 'en')?.short_effect ??
    latestEnglishFlavor(move.flavor_text_entries) ??
    MISSING;

  // Default-form Pokémon only, mapped to their species, ordered by dex number.
  const seen = new Set();
  const learners = [];
  for (const ref of move.learned_by_pokemon ?? []) {
    const species = speciesForPokemonRef(catalog, ref);
    if (!species || seen.has(species.id)) continue;
    seen.add(species.id);
    learners.push(species);
  }
  learners.sort((a, b) => a.id - b.id);

  const learnedBy = `<p class="count">${learners.length} Pokémon</p>` +
    cardListHtml(
      learners.map((s) => pokemonCardHtml({ id: s.id, speciesName: s.name, label: s.human })),
    );

  main.innerHTML =
    `<h1>${esc(displayName)}</h1>` +
    facts +
    sectionHtml('effect', 'Effect', `<p>${esc(effect)}</p>`) +
    sectionHtml('learned-by', 'Learned by', learnedBy);
}
