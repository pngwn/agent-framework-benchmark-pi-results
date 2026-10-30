import { LitElement, html, nothing } from 'lit';

import { apiGet, normalizeBase } from '../lib/api.js';
import {
  getGenerations,
  getSpeciesList,
  getTypes,
  getVersionGroups,
  loadPokemonCards,
} from '../lib/data.js';
import {
  decimal,
  dexNumber,
  englishGenus,
  englishName,
  humanize,
  isDefaultPokemonId,
  latestEnglishEffect,
  latestEnglishFlavor,
  resourceId,
  resourcePath,
  statLabel,
  valueOrDash,
} from '../lib/format.js';
import { cardList, typePillLink } from '../lib/render.js';

const PAGE_SIZE = 48;
const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];
const MOVE_COLUMNS = [
  ['level', 'Level'],
  ['move', 'Move'],
  ['type', 'Type'],
  ['category', 'Category'],
  ['power', 'Power'],
  ['accuracy', 'Accuracy'],
  ['pp', 'PP'],
];

function homeQueryFromUrl() {
  const params = new URLSearchParams(location.search);
  const parsedPage = Number.parseInt(params.get('page') || '1', 10);
  return {
    q: params.get('q') || '',
    type: params.get('type') || '',
    generation: params.get('generation') || '',
    page: Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1,
  };
}

function updateHomeUrl(query) {
  const url = new URL(location.href);
  for (const key of ['q', 'type', 'generation', 'page']) url.searchParams.delete(key);
  if (query.q) url.searchParams.set('q', query.q);
  if (query.type) url.searchParams.set('type', query.type);
  if (query.generation) url.searchParams.set('generation', query.generation);
  if (query.page > 1) url.searchParams.set('page', String(query.page));
  history.replaceState(null, '', url);
}

function homeHref(query, page) {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.type) params.set('type', query.type);
  if (query.generation) params.set('generation', query.generation);
  if (page > 1) params.set('page', String(page));
  const search = params.toString();
  return search ? `/?${search}` : '/';
}

function sortMoveRows(rows, method, sort) {
  if (!sort) {
    return rows.slice().sort((a, b) => {
      if (method === 'level-up') {
        return Number(a.level) - Number(b.level) || a.englishName.localeCompare(b.englishName);
      }
      return a.englishName.localeCompare(b.englishName);
    });
  }

  const numeric = new Set(['level', 'power', 'accuracy', 'pp']);
  const decorated = rows.map((row) => {
    const value = row[sort.key];
    return { row, missing: value === null || value === undefined, value };
  });

  decorated.sort((a, b) => {
    if (a.missing && b.missing) return 0;
    if (a.missing) return 1;
    if (b.missing) return -1;
    const comparison = numeric.has(sort.key)
      ? Number(a.value) - Number(b.value)
      : String(a.value).localeCompare(String(b.value));
    return sort.dir === 'descending' ? -comparison : comparison;
  });

  return decorated.map((entry) => entry.row);
}

export class PokedexApp extends LitElement {
  static properties = {
    loading: { state: true },
    view: { state: true },
  };

  constructor() {
    super();
    this.loading = true;
    this.view = null;
    this.base = '';
    this.homeBase = null;
    this.moveSorts = {};
    this._token = 0;
    this._homeBasePromise = null;
    this._searchTimer = null;
    this._focusSearch = false;
    this._onPopState = () => this.loadRoute();
  }

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this.base = normalizeBase(this.getAttribute('data-api') || '');
    window.addEventListener('popstate', this._onPopState);
    this.loadRoute();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('popstate', this._onPopState);
    clearTimeout(this._searchTimer);
  }

  updated() {
    if (this.loading || !this.view) return;

    document.title = this.view.kind === 'home' ? 'Pokédex' : `${this.headingFor(this.view)} – Pokédex`;

    if (this._focusSearch) {
      this._focusSearch = false;
      const input = this.querySelector('input[type="search"]');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }

    if (location.hash === '#moves' && this.view.kind === 'pokemon') {
      requestAnimationFrame(() => document.getElementById('moves')?.scrollIntoView({ block: 'start' }));
    }
  }

  headingFor(view) {
    if (view.kind === 'home') return 'Pokémon';
    if (view.kind === 'pokemon') return view.english;
    if (view.kind === 'move') return view.english;
    if (view.kind === 'ability') return view.english;
    if (view.kind === 'types') return 'Types';
    if (view.kind === 'type') return view.english;
    return 'Not found';
  }

  async loadRoute({ keepView = false } = {}) {
    const token = ++this._token;
    if (!keepView) {
      this.loading = true;
      this.view = null;
      this.requestUpdate();
    }
    try {
      const view = await this.resolveView();
      if (token !== this._token) return;
      this.view = view;
      this.loading = false;
      this.moveSorts = {};
      this.requestUpdate();
    } catch (error) {
      if (token !== this._token) return;
      console.error(error);
      this.view = { kind: 'notfound' };
      this.loading = false;
      this.moveSorts = {};
      this.requestUpdate();
    }
  }

  async resolveView() {
    let pathname = location.pathname;
    try {
      pathname = decodeURI(location.pathname);
    } catch {}
    const path = pathname.replace(/\/+$/, '') || '/';

    if (path === '/') return this.resolveHome();
    if (path === '/types') {
      const types = await getTypes(this.base);
      return { kind: 'types', types };
    }

    let match = path.match(/^\/pokemon\/([^/]+)$/);
    if (match) return this.resolvePokemon(decodeURIComponent(match[1]));

    match = path.match(/^\/moves\/([^/]+)$/);
    if (match) return this.resolveMove(decodeURIComponent(match[1]));

    match = path.match(/^\/abilities\/([^/]+)$/);
    if (match) return this.resolveAbility(decodeURIComponent(match[1]));

    match = path.match(/^\/types\/([^/]+)$/);
    if (match) return this.resolveType(decodeURIComponent(match[1]));

    return { kind: 'notfound' };
  }

  async loadHomeBase() {
    if (this.homeBase) return this.homeBase;
    if (!this._homeBasePromise) {
      this._homeBasePromise = Promise.all([
        getSpeciesList(this.base),
        getTypes(this.base),
        getGenerations(this.base),
      ]).then(([species, types, generations]) => {
        this.homeBase = { species, types, generations };
        return this.homeBase;
      });
    }
    return this._homeBasePromise;
  }

  async buildHomeView() {
    const { species, types, generations } = await this.loadHomeBase();
    const query = homeQueryFromUrl();
    let filtered = species;

    if (query.type) {
      const type = types.find((entry) => entry.name === query.type);
      if (!type) {
        filtered = [];
      } else {
        const ids = new Set(
          (type.pokemon || [])
            .map((entry) => resourceId(entry.pokemon.url))
            .filter((id) => isDefaultPokemonId(id)),
        );
        filtered = filtered.filter((entry) => ids.has(entry.id));
      }
    }

    if (query.generation) {
      const generation = generations.find((entry) => entry.name === query.generation);
      if (!generation) {
        filtered = [];
      } else {
        const ids = new Set(
          (generation.pokemon_species || [])
            .map((entry) => resourceId(entry.url))
            .filter((id) => isDefaultPokemonId(id)),
        );
        filtered = filtered.filter((entry) => ids.has(entry.id));
      }
    }

    if (query.q) {
      const needle = query.q.toLowerCase();
      filtered = filtered.filter((entry) => humanize(entry.name).toLowerCase().includes(needle));
    }

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const page = Math.min(Math.max(1, query.page), totalPages);
    const pageSpecies = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const cards = await loadPokemonCards(this.base, pageSpecies);

    return {
      kind: 'home',
      query,
      count: filtered.length,
      totalPages,
      page,
      cards,
      types,
      generations,
    };
  }

  async resolveHome() {
    await this.loadHomeBase();
    return this.buildHomeView();
  }

  async refreshHome({ focus = false } = {}) {
    const token = ++this._token;
    const view = await this.buildHomeView();
    if (token !== this._token) return;
    this.view = view;
    this._focusSearch = focus;
    this.requestUpdate();
  }

  onSearchInput(event) {
    const query = homeQueryFromUrl();
    query.q = event.currentTarget.value;
    query.page = 1;
    updateHomeUrl(query);
    clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => this.refreshHome({ focus: true }), 250);
  }

  onHomeFilterChange(event) {
    const query = homeQueryFromUrl();
    query[event.currentTarget.dataset.filter] = event.currentTarget.value;
    query.page = 1;
    updateHomeUrl(query);
    this.refreshHome();
  }

  async onGameChange(event) {
    const url = new URL(location.href);
    url.searchParams.set('game', event.currentTarget.value);
    history.replaceState(null, '', url);
    await this.loadRoute({ keepView: true });
  }

  sortMoves(method, key) {
    const current = this.moveSorts[method];
    const next =
      current?.key === key
        ? { key, dir: current.dir === 'ascending' ? 'descending' : 'ascending' }
        : { key, dir: 'ascending' };
    this.moveSorts = { ...this.moveSorts, [method]: next };
    this.requestUpdate();
  }

  async resolvePokemon(name) {
    const species = await apiGet(this.base, `pokemon-species/${name}`);
    const pokemon = await apiGet(this.base, `pokemon/${species.id}`);
    const [types, chain] = await Promise.all([
      getTypes(this.base),
      apiGet(this.base, resourcePath(species.evolution_chain?.url)),
    ]);

    const typeMap = new Map(types.map((entry) => [entry.name, entry]));
    const pokemonTypes = (pokemon.types || [])
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((entry) => ({
        name: entry.type.name,
        label: englishName(typeMap.get(entry.type.name), humanize(entry.type.name)),
      }));

    const moveEntries = [];
    const groupNames = new Set();
    for (const move of pokemon.moves || []) {
      for (const detail of move.version_group_details || []) {
        groupNames.add(detail.version_group.name);
      }
    }
    const games = await getVersionGroups(this.base, [...groupNames]);
    const requestedGame = new URLSearchParams(location.search).get('game');
    const selectedGame = games.find((game) => game.name === requestedGame) || games.at(-1) || null;

    if (selectedGame) {
      for (const move of pokemon.moves || []) {
        for (const detail of move.version_group_details || []) {
          if (detail.version_group.name !== selectedGame.name) continue;
          moveEntries.push({
            moveName: move.move.name,
            method: detail.move_learn_method.name,
            level: detail.level_learned_at ?? 0,
          });
        }
      }
    }

    const uniqueMoveNames = [...new Set(moveEntries.map((entry) => entry.moveName))];
    const moveRecords = await Promise.all(uniqueMoveNames.map((moveName) => apiGet(this.base, `move/${moveName}`)));
    const moveMap = new Map(moveRecords.map((record) => [record.name, record]));

    const byMethod = new Map();
    for (const entry of moveEntries) {
      const move = moveMap.get(entry.moveName);
      if (!move) continue;
      if (!byMethod.has(entry.method)) byMethod.set(entry.method, []);
      const typeName = move.type?.name || '';
      byMethod.get(entry.method).push({
        level: entry.level,
        moveName: move.name,
        englishName: englishName(move, humanize(move.name)),
        typeName,
        typeEnglish: englishName(typeMap.get(typeName), humanize(typeName)),
        category: humanize(move.damage_class?.name || '—'),
        power: move.power ?? null,
        accuracy: move.accuracy ?? null,
        pp: move.pp ?? null,
      });
    }

    const methodOrder = (method) => {
      const index = METHOD_ORDER.indexOf(method);
      return index === -1 ? METHOD_ORDER.length : index;
    };
    const methods = [...byMethod.keys()].sort(
      (a, b) => methodOrder(a) - methodOrder(b) || humanize(a).localeCompare(humanize(b)),
    );
    const tables = methods.map((method) => ({
      method,
      label: humanize(method),
      rows: byMethod.get(method),
    }));

    const stats = (pokemon.stats || []).map((entry) => ({
      label: statLabel(entry.stat.name),
      value: entry.base_stat,
    }));
    const total = stats.reduce((sum, stat) => sum + stat.value, 0);

    return {
      kind: 'pokemon',
      species,
      pokemon,
      english: englishName(species, humanize(species.name)),
      genus: englishGenus(species),
      types: pokemonTypes,
      artwork:
        pokemon.sprites?.other?.['official-artwork']?.front_default ||
        pokemon.sprites?.front_default ||
        null,
      flavor: latestEnglishFlavor(species.flavor_text_entries) || '—',
      stats,
      total,
      abilities: (pokemon.abilities || [])
        .slice()
        .sort((a, b) => a.slot - b.slot)
        .map((entry) => ({
          name: entry.ability.name,
          label: humanize(entry.ability.name),
          hidden: Boolean(entry.is_hidden),
        })),
      evolution: chain.chain,
      games,
      selectedGame: selectedGame?.name || '',
      tables,
    };
  }

  async resolveMove(name) {
    const move = await apiGet(this.base, `move/${name}`);
    const typeRecord = await apiGet(this.base, `type/${move.type.name}`);
    const refs = (move.learned_by_pokemon || []).map((entry) => ({ id: resourceId(entry.url) }));
    const cards = await loadPokemonCards(this.base, refs);

    return {
      kind: 'move',
      move,
      english: englishName(move, humanize(move.name)),
      typeName: move.type.name,
      typeEnglish: englishName(typeRecord, humanize(move.type.name)),
      category: humanize(move.damage_class?.name || '—'),
      power: move.power ?? null,
      accuracy: move.accuracy ?? null,
      pp: move.pp ?? null,
      effect: latestEnglishEffect(move.effect_entries) || latestEnglishFlavor(move.flavor_text_entries) || '—',
      cards,
    };
  }

  async resolveAbility(name) {
    const ability = await apiGet(this.base, `ability/${name}`);
    const refs = (ability.pokemon || []).map((entry) => ({
      id: resourceId(entry.pokemon.url),
      isHidden: entry.is_hidden,
    }));
    const cards = await loadPokemonCards(this.base, refs);

    return {
      kind: 'ability',
      ability,
      english: englishName(ability, humanize(ability.name)),
      effect: latestEnglishEffect(ability.effect_entries) || '—',
      cards,
    };
  }

  async resolveType(name) {
    const type = await apiGet(this.base, `type/${name}`);
    const types = await getTypes(this.base);
    const typeMap = new Map(types.map((entry) => [entry.name, entry]));
    const rel = type.damage_relations || {};
    const relations = [
      ['Super effective against', rel.double_damage_to || []],
      ['Not very effective against', rel.half_damage_to || []],
      ['No effect against', rel.no_damage_to || []],
      ['Weak to', rel.double_damage_from || []],
      ['Resists', rel.half_damage_from || []],
      ['Immune to', rel.no_damage_from || []],
    ].map(([label, entries]) => ({
      label,
      types: entries.map((entry) => ({
        name: entry.name,
        label: englishName(typeMap.get(entry.name), humanize(entry.name)),
      })),
    }));

    const refs = (type.pokemon || []).map((entry) => ({ id: resourceId(entry.pokemon.url) }));
    const cards = await loadPokemonCards(this.base, refs);
    const moves = (type.moves || [])
      .map((entry) => ({ name: entry.name, label: humanize(entry.name) }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      kind: 'type',
      type,
      english: englishName(type, humanize(type.name)),
      relations,
      cards,
      moves,
    };
  }

  render() {
    if (this.loading || !this.view) return html`<p class="loading">Loading…</p>`;
    if (this.view.kind === 'home') return this.renderHome(this.view);
    if (this.view.kind === 'pokemon') return this.renderPokemon(this.view);
    if (this.view.kind === 'move') return this.renderMove(this.view);
    if (this.view.kind === 'ability') return this.renderAbility(this.view);
    if (this.view.kind === 'types') return this.renderTypes(this.view);
    if (this.view.kind === 'type') return this.renderType(this.view);
    return this.renderNotFound();
  }

  renderHome(view) {
    return html`
      <h1>Pokémon</h1>
      <form class="home-controls" @submit=${(event) => event.preventDefault()}>
        <div class="field">
          <label for="search-input">Search</label>
          <input
            id="search-input"
            type="search"
            .value=${view.query.q}
            @input=${(event) => this.onSearchInput(event)}
          />
        </div>
        <div class="field">
          <label for="type-filter">Type</label>
          <select id="type-filter" data-filter="type" @change=${(event) => this.onHomeFilterChange(event)}>
            <option value="" ?selected=${view.query.type === ''}>All types</option>
            ${view.types.map(
              (type) => html`<option value=${type.name} ?selected=${type.name === view.query.type}>
                ${englishName(type, humanize(type.name))}
              </option>`,
            )}
          </select>
        </div>
        <div class="field">
          <label for="generation-filter">Generation</label>
          <select
            id="generation-filter"
            data-filter="generation"
            @change=${(event) => this.onHomeFilterChange(event)}
          >
            <option value="" ?selected=${view.query.generation === ''}>All generations</option>
            ${view.generations.map(
              (generation) => html`<option
                value=${generation.name}
                ?selected=${generation.name === view.query.generation}
              >
                ${englishName(generation, humanize(generation.name))}
              </option>`,
            )}
          </select>
        </div>
      </form>

      <p class="home-count">${view.count} Pokémon</p>
      ${view.count === 0
        ? html`<p class="empty-state">No Pokémon found</p>`
        : html`${cardList(view.cards, true)} ${this.renderPagination(view)}`}
    `;
  }

  renderPagination(view) {
    return html`
      <div class="pagination">
        <span>Page ${view.page} of ${view.totalPages}</span>
        ${view.page > 1
          ? html`<a href=${homeHref(view.query, view.page - 1)} rel="prev">Previous page</a>`
          : nothing}
        ${view.page < view.totalPages
          ? html`<a href=${homeHref(view.query, view.page + 1)} rel="next">Next page</a>`
          : nothing}
      </div>
    `;
  }

  renderPokemon(view) {
    return html`
      <article class="pokemon-summary">
        ${view.artwork
          ? html`<img class="pokemon-artwork" src=${view.artwork} alt=${view.english} />`
          : html`<span class="pokemon-artwork artwork-placeholder" aria-hidden="true"></span>`}
        <div class="summary-main">
          <span class="dex-number">${dexNumber(view.species.id)}</span>
          <h1>${view.english}</h1>
          <p class="genus">${view.genus}</p>
          <div class="type-links">
            ${view.types.map((type) => typePillLink(type.name, type.label))}
          </div>
          <dl class="measurements">
            <div><dt>Height</dt><dd>${decimal(view.pokemon.height, 'm')}</dd></div>
            <div><dt>Weight</dt><dd>${decimal(view.pokemon.weight, 'kg')}</dd></div>
          </dl>
          <p class="flavor-text">${view.flavor}</p>
        </div>
      </article>

      ${this.renderStats(view)} ${this.renderAbilities(view)} ${this.renderEvolution(view)}
      ${this.renderMoves(view)}
    `;
  }

  renderStats(view) {
    return html`
      <section class="panel" aria-labelledby="stats-heading">
        <h2 id="stats-heading">Base stats</h2>
        <table class="stats-table">
          <tbody>
            ${view.stats.map(
              (stat) => html`
                <tr>
                  <th scope="row">${stat.label}</th>
                  <td class="stat-value">${stat.value}</td>
                  <td class="stat-bar-cell">
                    <span class="stat-track">
                      <span
                        class="stat-fill"
                        style=${`width: ${Math.min(100, (stat.value / 255) * 100)}%;`}
                      ></span>
                    </span>
                  </td>
                </tr>
              `,
            )}
            <tr>
              <th scope="row">Total</th>
              <td class="stat-value">${view.total}</td>
              <td class="stat-bar-cell"></td>
            </tr>
          </tbody>
        </table>
      </section>
    `;
  }

  renderAbilities(view) {
    return html`
      <section class="panel" aria-labelledby="abilities-heading">
        <h2 id="abilities-heading">Abilities</h2>
        <ul class="plain-list">
          ${view.abilities.map(
            (ability) => html`<li>
              <a href=${`/abilities/${ability.name}`}>${ability.label}</a>${ability.hidden
                ? html` (hidden)`
                : nothing}
            </li>`,
          )}
        </ul>
      </section>
    `;
  }

  renderEvolution(view) {
    return html`
      <section class="panel" aria-labelledby="evolution-heading">
        <h2 id="evolution-heading">Evolution</h2>
        <ul class="evolution-list">${this.renderEvolutionNode(view.evolution)}</ul>
      </section>
    `;
  }

  renderEvolutionNode(node) {
    return html`
      <li>
        <a href=${`/pokemon/${node.species.name}`}>${humanize(node.species.name)}</a>
        ${node.evolves_to?.length
          ? html`<ul>${node.evolves_to.map((child) => this.renderEvolutionNode(child))}</ul>`
          : nothing}
      </li>
    `;
  }

  renderMoves(view) {
    return html`
      <section id="moves" class="panel moves-panel" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>
        <div class="moves-controls">
          <label for="game-select">Game</label>
          <select id="game-select" @change=${(event) => this.onGameChange(event)}>
            ${view.games.map(
              (game) => html`<option value=${game.name} ?selected=${game.name === view.selectedGame}>
                ${humanize(game.name)}
              </option>`,
            )}
          </select>
        </div>
        ${view.tables.length
          ? view.tables.map((table) => this.renderMoveTable(view, table))
          : html`<p>No moves for this game.</p>`}
      </section>
    `;
  }

  renderMoveTable(view, table) {
    const sort = this.moveSorts[table.method];
    const rows = sortMoveRows(table.rows, table.method, sort);
    const columns = table.method === 'level-up' ? MOVE_COLUMNS : MOVE_COLUMNS.slice(1);

    return html`
      <div class="table-scroll">
        <table class="moves-table">
          <caption>${table.label}</caption>
          <thead>
            <tr>
              ${columns.map(
                ([key, label]) => html`
                  <th
                    scope="col"
                    aria-sort=${sort?.key === key ? sort.dir : nothing}
                    @click=${() => this.sortMoves(table.method, key)}
                  >
                    <button type="button">${label}</button>
                  </th>
                `,
              )}
            </tr>
          </thead>
          <tbody>
            ${rows.map(
              (row) => html`
                <tr>
                  ${table.method === 'level-up' ? html`<td>${row.level}</td>` : nothing}
                  <td><a href=${`/moves/${row.moveName}`}>${row.englishName}</a></td>
                  <td>${typePillLink(row.typeName, row.typeEnglish)}</td>
                  <td>${row.category}</td>
                  <td>${valueOrDash(row.power)}</td>
                  <td>${valueOrDash(row.accuracy)}</td>
                  <td>${valueOrDash(row.pp)}</td>
                </tr>
              `,
            )}
          </tbody>
        </table>
      </div>
    `;
  }

  renderMove(view) {
    return html`
      <h1>${view.english}</h1>
      <div class="panel detail-panel">
        <dl class="detail-list">
          <div><dt>Type</dt><dd><a href=${`/types/${view.typeName}`}>${view.typeEnglish}</a></dd></div>
          <div><dt>Category</dt><dd>${view.category}</dd></div>
          <div><dt>Power</dt><dd>${valueOrDash(view.power)}</dd></div>
          <div><dt>Accuracy</dt><dd>${valueOrDash(view.accuracy)}</dd></div>
          <div><dt>PP</dt><dd>${valueOrDash(view.pp)}</dd></div>
        </dl>
      </div>

      <section class="panel" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>${view.effect}</p>
      </section>

      <section class="panel" aria-labelledby="learned-by-heading">
        <h2 id="learned-by-heading">Learned by</h2>
        <p class="home-count">${view.cards.length} Pokémon</p>
        ${cardList(view.cards)}
      </section>
    `;
  }

  renderAbility(view) {
    return html`
      <h1>${view.english}</h1>
      <section class="panel" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>${view.effect}</p>
      </section>

      <section class="panel" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p class="home-count">${view.cards.length} Pokémon</p>
        <ul class="card-grid">
          ${view.cards.map(
            (card) => html`
              <li class="card-item">
                <a class="pokemon-card" href=${`/pokemon/${card.name}`}>
                  ${card.sprite
                    ? html`<img class="card-sprite" src=${card.sprite} alt=${card.displayName} loading="lazy" />`
                    : html`<span class="card-sprite card-sprite-empty" aria-hidden="true"></span>`}
                  <span class="card-dex">${dexNumber(card.id)}</span>
                  <span class="card-name">${card.displayName}</span>
                  ${card.isHidden ? html`<span class="hidden-ability">Hidden ability</span>` : nothing}
                </a>
              </li>
            `,
          )}
        </ul>
      </section>
    `;
  }

  renderTypes(view) {
    return html`
      <h1>Types</h1>
      <ul class="type-list">
        ${view.types.map(
          (type) => html`<li>
            <a href=${`/types/${type.name}`}>${englishName(type, humanize(type.name))}</a>
          </li>`,
        )}
      </ul>
    `;
  }

  renderType(view) {
    return html`
      <h1>${view.english}</h1>
      <section class="panel" aria-labelledby="damage-relations-heading">
        <h2 id="damage-relations-heading">Damage relations</h2>
        <dl class="relations">
          ${view.relations.map(
            (relation) => html`
              <div class="relation-row">
                <dt>${relation.label}</dt>
                <dd>
                  ${relation.types.length
                    ? relation.types.map(
                        (type) =>
                          html`<a class="relation-type" href=${`/types/${type.name}`}>${type.label}</a>`,
                      )
                    : 'None'}
                </dd>
              </div>
            `,
          )}
        </dl>
      </section>

      <section class="panel" aria-labelledby="type-pokemon-heading">
        <h2 id="type-pokemon-heading">Pokémon</h2>
        <p class="home-count">${view.cards.length} Pokémon</p>
        ${cardList(view.cards)}
      </section>

      <section class="panel" aria-labelledby="type-moves-heading">
        <h2 id="type-moves-heading">Moves</h2>
        <p class="home-count">${view.moves.length} moves</p>
        <ul class="move-links">
          ${view.moves.map(
            (move) => html`<li><a href=${`/moves/${move.name}`}>${move.label}</a></li>`,
          )}
        </ul>
      </section>
    `;
  }

  renderNotFound() {
    return html`
      <h1>Not found</h1>
      <p><a href="/">Back to the Pokédex</a></p>
    `;
  }
}

customElements.define('pokedex-app', PokedexApp);
