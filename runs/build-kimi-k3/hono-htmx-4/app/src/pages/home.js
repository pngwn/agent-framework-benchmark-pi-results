import {
  speciesList, typeList, generationList, type as fetchType, generation as fetchGeneration,
  pokemon as fetchPokemon, idFromUrl, humanize, fetchAll,
} from '../api.js';
import { html, layout, pageDocTitle, pokemonCard, cardList } from '../render.js';

const PAGE_SIZE = 48;

function homeQuery({ q, type, generation }) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (type) params.set('type', type);
  if (generation) params.set('generation', generation);
  const s = params.toString();
  return s ? `/?${s}` : '/';
}

function pageUrl(filters, page) {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.type) params.set('type', filters.type);
  if (filters.generation) params.set('generation', filters.generation);
  if (page > 1) params.set('page', String(page));
  const s = params.toString();
  return s ? `/?${s}` : '/';
}

async function resultsHtml({ q, typeName, genName, page }) {
  const [allSpecies, types] = await Promise.all([speciesList(), typeList()]);
  const typeEnglish = new Map(types.map((t) => [t.name, t.englishName]));

  let filtered = allSpecies;
  if (typeName) {
    const t = await fetchType(typeName);
    if (t) {
      const ids = new Set(
        t.pokemon.map((p) => idFromUrl(p.pokemon.url)).filter((id) => id && id <= 10000),
      );
      filtered = filtered.filter((s) => ids.has(s.id));
    }
  }
  if (genName) {
    const g = await fetchGeneration(genName);
    if (g) {
      const names = new Set(g.pokemon_species.map((s) => s.name));
      filtered = filtered.filter((s) => names.has(s.name));
    }
  }
  if (q) {
    const needle = q.toLowerCase();
    filtered = filtered.filter((s) => humanize(s.name).toLowerCase().includes(needle));
  }

  const count = filtered.length;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const current = Math.min(Math.max(1, page), totalPages);
  const pageSpecies = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const cards = await fetchAll(pageSpecies, async (s) => {
    const p = await fetchPokemon(s.id);
    const pTypes = (p?.types ?? [])
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((t) => ({ name: t.type.name, englishName: typeEnglish.get(t.type.name) ?? humanize(t.type.name) }));
    return pokemonCard({
      speciesName: s.name,
      id: s.id,
      spriteUrl: p?.sprites?.front_default ?? '',
      types: pTypes,
    });
  });

  return html`
    <p class="result-count">${count} Pokémon</p>
    ${count === 0 ? html`<p class="no-results">No Pokémon found</p>` : cardList(cards)}
    <div class="pagination">
      ${current > 1 ? html`<a href="${pageUrl({ q, type: typeName, generation: genName }, current - 1)}">Previous page</a>` : ''}
      <span>Page ${current} of ${totalPages}</span>
      ${current < totalPages ? html`<a href="${pageUrl({ q, type: typeName, generation: genName }, current + 1)}">Next page</a>` : ''}
    </div>
  `;
}

function filtersHtml({ q, typeName, genName, types, generations }) {
  return html`
    <form id="filters" class="filters" action="/" method="get">
      <div class="field">
        <label for="search">Search</label>
        <input type="search" id="search" name="q" value="${q}"
          hx-get="/" hx-target="#results" hx-swap="innerHTML" hx-include="#filters" hx-trigger="input changed delay:250ms" />
      </div>
      <div class="field">
        <label for="type">Type</label>
        <select id="type" name="type" hx-get="/" hx-target="#results" hx-swap="innerHTML" hx-include="#filters" hx-trigger="change">
          <option value="">All types</option>
          ${types.map((t) => html`<option value="${t.name}"${t.name === typeName ? html` selected` : ''}>${t.englishName}</option>`)}
        </select>
      </div>
      <div class="field">
        <label for="generation">Generation</label>
        <select id="generation" name="generation" hx-get="/" hx-target="#results" hx-swap="innerHTML" hx-include="#filters" hx-trigger="change">
          <option value="">All generations</option>
          ${generations.map((g) => html`<option value="${g.name}"${g.name === genName ? html` selected` : ''}>${g.englishName}</option>`)}
        </select>
      </div>
    </form>
  `;
}

export async function homePage(c) {
  const q = (c.req.query('q') ?? '').trim();
  const typeName = (c.req.query('type') ?? '').trim();
  const genName = (c.req.query('generation') ?? '').trim();
  const page = Number.parseInt(c.req.query('page') ?? '1', 10) || 1;

  const isHtmx = c.req.header('hx-request') === 'true' && !c.req.header('hx-history-restore-request');

  const results = await resultsHtml({ q, typeName, genName, page });

  if (isHtmx) {
    // Filter changes go back to page 1 and omit empty/default parameters.
    c.header('HX-Push-Url', homeQuery({ q, type: typeName, generation: genName }));
    return c.html(String(results));
  }

  const [types, generations] = await Promise.all([typeList(), generationList()]);
  return c.html(layout({
    docTitle: pageDocTitle(null),
    content: html`
      <h1>Pokémon</h1>
      ${filtersHtml({ q, typeName, genName, types, generations })}
      <div id="results">${results}</div>
    `,
  }));
}
