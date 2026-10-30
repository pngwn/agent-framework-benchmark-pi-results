import { allGenerations, allSpecies, allTypes } from '../api';
import { cardList, type CardData } from '../components';
import { fragment, h } from '../dom';
import { englishName, humanize, idFromUrl } from '../format';
import type { PageContext, PageResult } from '../main';

const PAGE_SIZE = 48;

interface Entry extends CardData {
  search: string;
  typeNames: Set<string>;
  generation: string | undefined;
}

interface Filters {
  q: string;
  type: string;
  generation: string;
  page: number;
}

function readFilters(url: URL): Filters {
  const p = url.searchParams;
  const page = Number.parseInt(p.get('page') ?? '1', 10);
  return {
    q: p.get('q') ?? '',
    type: p.get('type') ?? '',
    generation: p.get('generation') ?? '',
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

function filtersToQuery(f: Filters): string {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.type) p.set('type', f.type);
  if (f.generation) p.set('generation', f.generation);
  if (f.page > 1) p.set('page', String(f.page));
  const s = p.toString();
  return s ? `/?${s}` : '/';
}

export async function renderHome({ main, url }: PageContext): Promise<PageResult> {
  const [species, types, generations] = await Promise.all([allSpecies(), allTypes(), allGenerations()]);

  // Types of each default Pokémon (same ID as its species), in slot order.
  const typesById = new Map<number, { slot: number; name: string; label: string }[]>();
  for (const type of types) {
    const label = englishName(type);
    for (const { slot, pokemon } of type.pokemon) {
      const id = idFromUrl(pokemon.url);
      if (id > 10000) continue;
      let list = typesById.get(id);
      if (!list) typesById.set(id, (list = []));
      list.push({ slot, name: type.name, label });
    }
  }
  const generationById = new Map<number, string>();
  for (const gen of generations) for (const s of gen.pokemon_species) generationById.set(idFromUrl(s.url), gen.name);

  const entries: Entry[] = species.map((s) => {
    const t = (typesById.get(s.id) ?? []).sort((a, b) => a.slot - b.slot);
    return {
      id: s.id,
      name: s.name,
      types: t,
      search: humanize(s.name).toLowerCase(),
      typeNames: new Set(t.map((x) => x.name)),
      generation: generationById.get(s.id),
    };
  });

  const filters = readFilters(url);

  const search = h('input', { id: 'filter-q', type: 'search', name: 'q', value: filters.q, autocomplete: 'off', spellcheck: 'false' });
  const typeSelect = h(
    'select',
    { id: 'filter-type', name: 'type' },
    h('option', { value: '' }, 'All types'),
    types.map((t) => h('option', { value: t.name, selected: t.name === filters.type }, englishName(t))),
  );
  const genSelect = h(
    'select',
    { id: 'filter-generation', name: 'generation' },
    h('option', { value: '' }, 'All generations'),
    generations.map((g) => h('option', { value: g.name, selected: g.name === filters.generation }, englishName(g))),
  );
  const results = h('div', { class: 'results' });

  const update = () => {
    const q = filters.q.trim().toLowerCase();
    const matches = entries.filter(
      (e) =>
        (!q || e.search.includes(q)) &&
        (!filters.type || e.typeNames.has(filters.type)) &&
        (!filters.generation || e.generation === filters.generation),
    );
    const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
    const page = Math.min(filters.page, pages);
    const shown = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const pageHref = (n: number) => filtersToQuery({ ...filters, page: n });

    results.replaceChildren(
      fragment(
      h('p', { class: 'count', role: 'status' }, matches.length ? `${matches.length} Pokémon` : 'No Pokémon found'),
      matches.length ? cardList(shown) : null,
      matches.length
        ? h(
            'nav',
            { class: 'pagination', 'aria-label': 'Pagination' },
            page > 1 ? h('a', { href: pageHref(page - 1), rel: 'prev' }, 'Previous page') : null,
            h('span', null, `Page ${page} of ${pages}`),
            page < pages ? h('a', { href: pageHref(page + 1), rel: 'next' }, 'Next page') : null,
          )
        : null,
      ),
    );
  };

  const applyFilters = (replace: boolean) => {
    filters.page = 1;
    const href = filtersToQuery(filters);
    if (replace) history.replaceState(null, '', href);
    else history.pushState(null, '', href);
    update();
  };

  let debounce: number | undefined;
  search.addEventListener('input', () => {
    filters.q = search.value;
    clearTimeout(debounce);
    debounce = window.setTimeout(() => applyFilters(true), 150);
  });
  search.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') e.preventDefault();
  });
  typeSelect.addEventListener('change', () => {
    filters.type = typeSelect.value;
    applyFilters(false);
  });
  genSelect.addEventListener('change', () => {
    filters.generation = genSelect.value;
    applyFilters(false);
  });

  update();

  main.append(
    h('h1', null, 'Pokémon'),
    h(
      'form',
      { class: 'filters', role: 'search', onsubmit: (e: Event) => e.preventDefault() },
      h('div', { class: 'field field--search' }, h('label', { for: 'filter-q' }, 'Search'), search),
      h('div', { class: 'field' }, h('label', { for: 'filter-type' }, 'Type'), typeSelect),
      h('div', { class: 'field' }, h('label', { for: 'filter-generation' }, 'Generation'), genSelect),
    ),
    results,
  );

  return { title: 'Pokédex', nav: 'pokemon' };
}
