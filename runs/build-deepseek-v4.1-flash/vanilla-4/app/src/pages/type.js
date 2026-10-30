import { api } from '../api.js';
import { getSpeciesById } from '../data.js';
import {
  englishName,
  escapeHtml,
  humanize,
  idFromUrl,
  setDocumentTitle,
} from '../utils.js';
import { pokemonCard, typeBadge } from '../components.js';

const RELATIONS = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from'],
];

function relationDefinition(entries) {
  if (!entries?.length) return 'None';
  return entries.map((entry) => typeBadge(entry.name, { label: humanize(entry.name), href: `/types/${entry.name}` })).join(' ');
}

export async function renderTypePage(main, name) {
  const [type, speciesById] = await Promise.all([
    api(`type/${encodeURIComponent(name)}`),
    getSpeciesById(),
  ]);

  const heading = englishName(type, humanize(type.name));
  const relations = type.damage_relations ?? {};

  const seen = new Set();
  const pokemon = [];
  for (const entry of type.pokemon ?? []) {
    const pokemonId = idFromUrl(entry.pokemon?.url);
    if (!Number.isInteger(pokemonId) || pokemonId > 10000) continue;
    const species = speciesById.get(pokemonId);
    if (!species || seen.has(species.id)) continue;
    seen.add(species.id);
    pokemon.push(species);
  }
  pokemon.sort((a, b) => a.id - b.id);

  const moves = (type.moves ?? [])
    .map((move) => ({ name: move.name, label: humanize(move.name) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  main.innerHTML = `
    <h1>${escapeHtml(heading)}</h1>

    <section class="panel" aria-labelledby="relations-heading">
      <h2 id="relations-heading">Damage relations</h2>
      <dl class="relations">
        ${RELATIONS.map(([term, key]) => `<div class="relation"><dt>${term}</dt><dd>${relationDefinition(relations[key])}</dd></div>`).join('')}
      </dl>
    </section>

    <section class="panel" aria-labelledby="pokemon-heading">
      <h2 id="pokemon-heading">Pokémon</h2>
      <p class="count">${pokemon.length} Pokémon</p>
      <ul class="card-grid">${pokemon.map((species) => pokemonCard({
        id: species.id,
        name: species.name,
        sprite: `/media/sprites/pokemon/${species.id}.png`,
      })).join('')}</ul>
    </section>

    <section class="panel" aria-labelledby="moves-heading">
      <h2 id="moves-heading">Moves</h2>
      <p class="count">${moves.length} moves</p>
      <ul class="link-grid">
        ${moves.map((move) => `<li><a href="/moves/${escapeHtml(move.name)}">${escapeHtml(move.label)}</a></li>`).join('')}
      </ul>
    </section>
  `;

  setDocumentTitle(heading);
}
