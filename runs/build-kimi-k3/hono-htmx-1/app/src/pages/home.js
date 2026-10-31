import { html, raw } from 'hono/html';
import {
  getList,
  getRecord,
  getPokemonTypeMap,
  getTypeEnglishNames,
  getGenerations,
  idFromUrl,
  humanize,
  mapPool,
} from '../api.js';
import { layout } from '../views/layout.js';
import { pokemonCardList } from '../views/components.js';

const PAGE_SIZE = 48;

const HX_CONTROLS = {
  'hx-get': '/',
  'hx-target': '#results',
  'hx-select': '#results',
  'hx-swap': 'outerHTML',
  'hx-include': '#controls',
  'hx-push-url': 'true',
};

function attrs(obj) {
  return Object.entries(obj)
    .map(([k, v]) => `${k}="${String(v).replaceAll('"', '&quot;')}"`)
    .join(' ');
}

function homeQuery({ q, type, generation, page }) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (type) params.set('type', type);
  if (generation) params.set('generation', generation);
  if (page > 1) params.set('page', String(page));
  const s = params.toString();
  return s ? `/?${s}` : '/';
}

function resultsView({ pageItems, count, page, totalPages, query }) {
  return html`<div id="results">
    <p class="count">${count} Pokémon</p>
    ${count === 0
      ? html`<p class="empty">No Pokémon found</p>`
      : html`${pokemonCardList(pageItems, (p) => ({ types: p.types }))}
        <p class="pagination">
          ${page > 1 ? html`<a href="${homeQuery({ ...query, page: page - 1 })}">Previous page</a>` : ''}
          <span>Page ${page} of ${totalPages}</span>
          ${page < totalPages ? html`<a href="${homeQuery({ ...query, page: page + 1 })}">Next page</a>` : ''}
        </p>`}
  </div>`;
}

export async function homePage(c) {
  const [speciesRefs, typeMap, typeNames, generations] = await Promise.all([
    getList('pokemon-species'),
    getPokemonTypeMap(),
    getTypeEnglishNames(),
    getGenerations(),
  ]);

  const species = speciesRefs
    .map((ref) => ({ name: ref.name, id: idFromUrl(ref.url) }))
    .filter((s) => s.id != null)
    .sort((a, b) => a.id - b.id);

  const validTypes = new Set(typeNames.keys());
  const validGenerations = new Set(generations.map((g) => g.name));

  const q = (c.req.query('q') ?? '').trim();
  const type = validTypes.has(c.req.query('type')) ? c.req.query('type') : '';
  const generation = validGenerations.has(c.req.query('generation')) ? c.req.query('generation') : '';

  const qLower = q.toLowerCase();
  const generationSpecies = generation ? generations.find((g) => g.name === generation).speciesIds : null;

  const matching = species.filter((s) => {
    if (qLower && !humanize(s.name).toLowerCase().includes(qLower)) return false;
    if (type) {
      const types = typeMap.get(s.id) ?? [];
      if (!types.some((t) => t.name === type)) return false;
    }
    if (generationSpecies && !generationSpecies.has(s.id)) return false;
    return true;
  });

  const count = matching.length;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  let page = parseInt(c.req.query('page') ?? '1', 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (page > totalPages) page = totalPages;

  const pageSpecies = matching.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageItems = await mapPool(pageSpecies, async (s) => {
    const pokemon = await getRecord('pokemon', s.id);
    const types = (typeMap.get(s.id) ?? []).map((t) => ({ name: t.name, englishName: typeNames.get(t.name) ?? humanize(t.name) }));
    return {
      speciesName: s.name,
      speciesId: s.id,
      sprite: pokemon?.sprites?.front_default ?? null,
      types,
    };
  });

  const query = { q, type, generation };

  const controls = html`<div id="controls" class="controls">
    <div class="field">
      <label for="search">Search</label>
      <input id="search" type="search" name="q" value="${q}" ${raw(
        attrs({ ...HX_CONTROLS, 'hx-trigger': 'input changed delay:250ms' }),
      )} />
    </div>
    <div class="field">
      <label for="type">Type</label>
      <select id="type" name="type" ${raw(attrs({ ...HX_CONTROLS, 'hx-trigger': 'change' }))}>
        <option value="">All types</option>
        ${[...validTypes].map(
          (name) =>
            html`<option value="${name}" ${name === type ? raw('selected') : ''}>${typeNames.get(name)}</option>`,
        )}
      </select>
    </div>
    <div class="field">
      <label for="generation">Generation</label>
      <select id="generation" name="generation" ${raw(attrs({ ...HX_CONTROLS, 'hx-trigger': 'change' }))}>
        <option value="">All generations</option>
        ${generations.map(
          (g) =>
            html`<option value="${g.name}" ${g.name === generation ? raw('selected') : ''}>${g.englishName}</option>`,
        )}
      </select>
    </div>
  </div>`;

  return c.html(
    layout({
      title: 'Pokédex',
      main: html`<h1>Pokémon</h1>
        ${controls} ${resultsView({ pageItems, count, page, totalPages, query })}`,
    }),
  );
}
