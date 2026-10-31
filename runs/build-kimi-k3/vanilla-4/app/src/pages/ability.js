// `/abilities/:name` — ability effect and the Pokémon that have it.

import { fetchJson } from '../api.js';
import { loadCatalog, speciesForPokemonRef } from '../catalog.js';
import { cardListHtml, pokemonCardHtml, sectionHtml } from '../components.js';
import { englishName, esc, humanize, MISSING } from '../util.js';
import { renderNotFound } from './notfound.js';

export async function renderAbility(main, name, url, ctx) {
  let ability;
  try {
    ability = await fetchJson(`/api/v2/ability/${encodeURIComponent(name)}/`);
  } catch (err) {
    if (err.status === 404) return renderNotFound(main);
    throw err;
  }
  const catalog = await loadCatalog();
  if (ctx.stale()) return;

  const displayName = englishName(ability.names) ?? humanize(ability.name);
  document.title = `${displayName} – Pokédex`;

  const effect =
    ability.effect_entries?.find((e) => e.language?.name === 'en')?.short_effect ?? MISSING;

  // Default-form Pokémon only, mapped to their species, ordered by dex number.
  const bySpecies = new Map();
  for (const entry of ability.pokemon ?? []) {
    const species = speciesForPokemonRef(catalog, entry.pokemon);
    if (!species) continue;
    const existing = bySpecies.get(species.id);
    bySpecies.set(species.id, { species, hidden: (existing?.hidden ?? false) || entry.is_hidden });
  }
  const holders = [...bySpecies.values()].sort((a, b) => a.species.id - b.species.id);

  const list = `<p class="count">${holders.length} Pokémon</p>` +
    cardListHtml(
      holders.map(({ species, hidden }) =>
        pokemonCardHtml({
          id: species.id,
          speciesName: species.name,
          label: species.human,
          extra: hidden ? 'Hidden ability' : null,
        }),
      ),
    );

  main.innerHTML =
    `<h1>${esc(displayName)}</h1>` +
    sectionHtml('effect', 'Effect', `<p>${esc(effect)}</p>`) +
    sectionHtml('pokemon', 'Pokémon', list);
}
