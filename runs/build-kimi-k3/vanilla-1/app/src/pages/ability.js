import { escapeHtml, englishName, idFromUrl } from '../shared/format.js';
import { cardHtml } from '../shared/cards.js';
import { api, globals, MEDIA_BASE } from '../api.js';

export async function abilityPage(name) {
  const ability = await api(`/ability/${encodeURIComponent(name)}`);
  if (!ability) return null;
  const g = await globals();

  const en = englishName(ability, ability.name);
  const effect = ability.effect_entries?.find((e) => e.language?.name === 'en')?.short_effect ?? '—';

  // Unique species (alternate forms excluded), sorted by dex number.
  const byId = new Map();
  for (const entry of ability.pokemon ?? []) {
    const id = idFromUrl(entry.pokemon.url);
    if (!Number.isFinite(id) || id >= 10000) continue;
    const existing = byId.get(id);
    byId.set(id, {
      id,
      name: existing?.name ?? g.speciesNameById.get(id) ?? entry.pokemon.name,
      hidden: Boolean(existing?.hidden) || entry.is_hidden,
    });
  }
  const species = [...byId.values()].sort((a, b) => a.id - b.id);

  const body = `
<h1>${escapeHtml(en)}</h1>
<section class="panel" aria-labelledby="effect-heading">
  <h2 id="effect-heading">Effect</h2>
  <p>${escapeHtml(effect)}</p>
</section>

<section class="panel" aria-labelledby="pokemon-heading">
  <h2 id="pokemon-heading">Pokémon</h2>
  <p class="result-count">${species.length} Pokémon</p>
  <ul class="card-grid">${species
    .map((s) => cardHtml(s, { mediaBase: MEDIA_BASE, note: s.hidden ? 'Hidden ability' : '' }))
    .join('')}</ul>
</section>`;

  return { title: `${en} – Pokédex`, h1: en, body };
}
