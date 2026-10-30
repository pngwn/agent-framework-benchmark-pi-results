import { api } from '../api.js';
import { getSpeciesById } from '../data.js';
import {
  englishName,
  escapeHtml,
  humanize,
  idFromUrl,
  setDocumentTitle,
} from '../utils.js';
import { pokemonCard } from '../components.js';

export async function renderAbilityPage(main, name) {
  const [ability, speciesById] = await Promise.all([
    api(`ability/${encodeURIComponent(name)}`),
    getSpeciesById(),
  ]);

  const heading = englishName(ability, humanize(ability.name));
  const effect = ability.effect_entries?.find((entry) => entry.language?.name === 'en')?.short_effect || '—';

  const bySpecies = new Map();
  for (const entry of ability.pokemon ?? []) {
    const pokemonId = idFromUrl(entry.pokemon?.url);
    if (!Number.isInteger(pokemonId) || pokemonId > 10000) continue;
    const species = speciesById.get(pokemonId);
    if (!species) continue;
    const current = bySpecies.get(species.id) ?? { species, hidden: false };
    current.hidden ||= Boolean(entry.is_hidden);
    bySpecies.set(species.id, current);
  }

  const entries = [...bySpecies.values()].sort((a, b) => a.species.id - b.species.id);

  main.innerHTML = `
    <h1>${escapeHtml(heading)}</h1>

    <section class="panel" aria-labelledby="effect-heading">
      <h2 id="effect-heading">Effect</h2>
      <p>${escapeHtml(effect)}</p>
    </section>

    <section class="panel" aria-labelledby="pokemon-heading">
      <h2 id="pokemon-heading">Pokémon</h2>
      <p class="count">${entries.length} Pokémon</p>
      <ul class="card-grid">${entries.map(({ species, hidden }) => pokemonCard({
        id: species.id,
        name: species.name,
        sprite: `/media/sprites/pokemon/${species.id}.png`,
        hidden,
      })).join('')}</ul>
    </section>
  `;

  setDocumentTitle(heading);
}
