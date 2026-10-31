import { escapeHtml } from '../shared/format.js';
import { homeResultsHtml, normalizeFilters } from '../shared/home.js';
import { globals, MEDIA_BASE } from '../api.js';

export async function homePage(searchParams) {
  const g = await globals();

  const species = g.species.map((s) => ({
    id: s.id,
    name: s.name,
    types: (g.typesByPokemonId.get(s.id) ?? []).map((t) => t.name),
    generation: g.generationBySpecies.get(s.name) ?? '',
  }));

  const filters = normalizeFilters({
    q: searchParams.get('q') ?? '',
    type: searchParams.get('type') ?? '',
    generation: searchParams.get('generation') ?? '',
    page: searchParams.get('page') ?? '1',
  });

  const data = { species, mediaBase: MEDIA_BASE, typeEn: g.typeEn };

  const option = (value, label, current) =>
    `<option value="${escapeHtml(value)}"${value === current ? ' selected' : ''}>${escapeHtml(label)}</option>`;

  const body = `
<h1>Pokémon</h1>
<form class="controls" id="filters" action="/" method="get">
  <div class="control control-search">
    <label for="filter-q">Search</label>
    <input type="search" id="filter-q" name="q" value="${escapeHtml(filters.q)}" autocomplete="off">
  </div>
  <div class="control">
    <label for="filter-type">Type</label>
    <select id="filter-type" name="type">
      ${option('', 'All types', filters.type)}
      ${g.types.map((t) => option(t.name, t.en, filters.type)).join('')}
    </select>
  </div>
  <div class="control">
    <label for="filter-gen">Generation</label>
    <select id="filter-gen" name="generation">
      ${option('', 'All generations', filters.generation)}
      ${g.generations.map((gen) => option(gen.name, gen.en, filters.generation)).join('')}
    </select>
  </div>
</form>
<div id="results">
${homeResultsHtml(data, filters)}
</div>
<script type="application/json" id="home-data">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

  return { title: 'Pokédex', h1: 'Pokémon', body };
}
