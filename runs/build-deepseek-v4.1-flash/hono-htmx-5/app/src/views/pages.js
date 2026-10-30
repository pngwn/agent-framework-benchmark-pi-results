import { html } from 'hono/html';
import {
  artworkFor,
  englishName,
  humanize,
  latestEnglishFlavor,
  typeLabel,
} from '../api.js';
import {
  countText,
  dexNumber,
  layout,
  pageTitle,
  panel,
  pokemonCardList,
  textOrDash,
  typeBadge,
  typeLinks,
} from './components.js';

const STAT_LABELS = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

function homeHref(filters, page) {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.type) params.set('type', filters.type);
  if (filters.generation) params.set('generation', filters.generation);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `/?${query}` : '/';
}

function filterForm({ filters, types, generations }) {
  return html`<form class="filters"
      method="get"
      action="/"
      hx-get="/"
      hx-target="#pokemon-results"
      hx-swap="outerHTML"
      hx-push-url="true"
      hx-trigger="change, input delay:250ms from:#search-input, submit">
    <div class="field search-field">
      <label for="search-input">Search</label>
      <input id="search-input" type="search" name="q" value="${filters.q}" autocomplete="off" spellcheck="false">
    </div>
    <div class="field">
      <label for="type-select">Type</label>
      <select id="type-select" name="type">
        <option value="">All types</option>
        ${types.map((type) => html`<option value="${type.name}"${type.name === filters.type ? html` selected` : ''}>${type.label}</option>`)}
      </select>
    </div>
    <div class="field">
      <label for="generation-select">Generation</label>
      <select id="generation-select" name="generation">
        <option value="">All generations</option>
        ${generations.map((generation) => html`<option value="${generation.name}"${generation.name === filters.generation ? html` selected` : ''}>${generation.label}</option>`)}
      </select>
    </div>
  </form>`;
}

export function homeResults({ filters, total, page, totalPages, cards }) {
  const hasResults = total > 0;
  return html`<div id="pokemon-results">
  ${countText(total)}
  ${hasResults
    ? pokemonCardList(cards)
    : html`<p class="no-results">No Pokémon found</p>`}
  ${hasResults
    ? html`<nav class="pagination" aria-label="Pagination">
    ${page > 1 ? html`<a href="${homeHref(filters, page - 1)}">Previous page</a>` : ''}
    <p class="page-info">Page ${page} of ${totalPages}</p>
    ${page < totalPages ? html`<a href="${homeHref(filters, page + 1)}">Next page</a>` : ''}
  </nav>`
    : ''}
</div>`;
}

export function homePage({ filters, types, generations, results }) {
  return layout({
    title: 'Pokédex',
    content: html`<h1 class="home-title">Pokémon</h1>
${filterForm({ filters, types, generations })}
${homeResults(results)}`,
  });
}

function statsTable(stats) {
  const rows = stats.map((entry) => {
    const label = STAT_LABELS[entry.stat.name] ?? humanize(entry.stat.name);
    const value = entry.base_stat;
    const width = Math.max(0, Math.min(100, (value / 255) * 100));
    return html`<tr>
      <th scope="row">${label}</th>
      <td class="stat-number">${value}</td>
      <td class="stat-bar-cell"><span class="stat-track"><span class="stat-fill" style="width:${width}%"></span></span></td>
    </tr>`;
  });
  const total = stats.reduce((sum, entry) => sum + entry.base_stat, 0);
  return html`<table class="stats-table">
    <tbody>
      ${rows}
      <tr>
        <th scope="row">Total</th>
        <td class="stat-number">${total}</td>
        <td class="stat-bar-cell"></td>
      </tr>
    </tbody>
  </table>`;
}

function evolutionNode(node) {
  if (!node) return '';
  return html`<li>
    <a href="/pokemon/${node.species.name}">${humanize(node.species.name)}</a>
    ${node.evolves_to?.length ? html`<ul>${node.evolves_to.map((evolution) => evolutionNode(evolution))}</ul>` : ''}
  </li>`;
}

function evolutionTree(chain) {
  if (!chain?.chain) return html`<p>—</p>`;
  return html`<ul class="evolution-tree">${evolutionNode(chain.chain)}</ul>`;
}

function movesTable(table) {
  const columns = [
    ...(table.method === 'level-up' ? [{ key: 'level', label: 'Level', type: 'number' }] : []),
    { key: 'move', label: 'Move', type: 'text' },
    { key: 'type', label: 'Type', type: 'text' },
    { key: 'category', label: 'Category', type: 'text' },
    { key: 'power', label: 'Power', type: 'number' },
    { key: 'accuracy', label: 'Accuracy', type: 'number' },
    { key: 'pp', label: 'PP', type: 'number' },
  ];
  const defaultKey = table.method === 'level-up' ? 'level' : 'move';
  return html`<div class="table-scroll">
    <table class="moves-table">
      <caption>${table.label}</caption>
      <thead>
        <tr>
          ${columns.map((column) => html`<th scope="col" data-sort="${column.key}" aria-sort="${column.key === defaultKey ? 'ascending' : 'none'}"><button type="button" class="sort-button" data-sort="${column.key}">${column.label}</button></th>`)}
        </tr>
      </thead>
      <tbody>
        ${table.rows.map((row) => html`<tr>
          ${columns.map((column) => {
            const cell = row.cells[column.key];
            return html`<td data-sort-type="${column.type}" data-sort-value="${cell.value}"${cell.missing ? html` data-missing="true"` : ''}>${cell.content}</td>`;
          })}
        </tr>`)}
      </tbody>
    </table>
  </div>`;
}

export function movesPanel({ speciesName, games, selectedGame, tables }) {
  return panel({
    id: 'moves',
    title: 'Moves',
    body: html`<div class="game-field">
      <label for="game-select">Game</label>
      <select id="game-select" name="game"
          hx-get="/pokemon/${speciesName}"
          hx-target="#moves"
          hx-swap="outerHTML"
          hx-push-url="true"
          hx-trigger="change">
        ${games.map((game) => html`<option value="${game.name}"${game.name === selectedGame ? html` selected` : ''}>${game.label}</option>`)}
      </select>
    </div>
    ${tables.map((table) => movesTable(table))}`,
  });
}

export function pokemonPage({ species, pokemon, evolution, games, selectedGame, movesTables, abilities }) {
  const name = englishName(species);
  const genus = species.genera?.find((entry) => entry.language?.name === 'en')?.genus ?? '—';
  const flavor = latestEnglishFlavor(species.flavor_text_entries) ?? '—';
  const types = [...(pokemon.types ?? [])]
    .sort((a, b) => a.slot - b.slot)
    .map((entry) => entry.type.name);
  const artworkUrl = artworkFor(pokemon);
  const abilitiesSorted = [...abilities].sort((a, b) => a.slot - b.slot);

  const content = html`<div class="pokemon-summary">
    <div class="pokemon-artwork">
      ${artworkUrl ? html`<img src="${artworkUrl}" alt="${name}" width="288" height="288">` : ''}
    </div>
    <div class="pokemon-info">
      <p class="dex-number">${dexNumber(species.id)}</p>
      <h1>${name}</h1>
      <p class="genus">${genus}</p>
      <p class="type-list">${types.map((type) => typeBadge(type))}</p>
      <dl class="facts">
        <div><dt>Height</dt><dd>${(pokemon.height / 10).toFixed(1)} m</dd></div>
        <div><dt>Weight</dt><dd>${(pokemon.weight / 10).toFixed(1)} kg</dd></div>
      </dl>
      <p class="flavor">${flavor}</p>
    </div>
  </div>
  ${panel({ id: 'base-stats', title: 'Base stats', body: statsTable(pokemon.stats ?? []) })}
  ${panel({
    id: 'abilities',
    title: 'Abilities',
    body: html`<ul class="link-list ability-list">
      ${abilitiesSorted.map((entry) => html`<li><a href="/abilities/${entry.ability.name}">${humanize(entry.ability.name)}</a>${entry.is_hidden ? ' (hidden)' : ''}</li>`)}
    </ul>`,
  })}
  ${panel({ id: 'evolution', title: 'Evolution', body: evolutionTree(evolution) })}
  ${movesPanel({ speciesName: species.name, games, selectedGame, tables: movesTables })}`;

  return layout({ title: pageTitle(name), content });
}

function moveFacts(move) {
  return html`<dl class="facts facts-inline">
    <div><dt>Type</dt><dd>${typeBadge(move.type.name)}</dd></div>
    <div><dt>Category</dt><dd>${humanize(move.damage_class.name)}</dd></div>
    <div><dt>Power</dt><dd>${textOrDash(move.power)}</dd></div>
    <div><dt>Accuracy</dt><dd>${textOrDash(move.accuracy)}</dd></div>
    <div><dt>PP</dt><dd>${textOrDash(move.pp)}</dd></div>
  </dl>`;
}

export function movePage({ move, cards }) {
  const name = englishName(move);
  const effectEntry = move.effect_entries?.find((entry) => entry.language?.name === 'en');
  const effect = effectEntry?.short_effect
    ? effectEntry.short_effect.replace(/\s+/g, ' ').trim()
    : latestEnglishFlavor(move.flavor_text_entries) ?? '—';

  const content = html`<h1 class="move-title">${name}</h1>
  ${moveFacts(move)}
  ${panel({ id: 'effect', title: 'Effect', body: html`<p>${effect}</p>` })}
  ${panel({
    id: 'learned-by',
    title: 'Learned by',
    body: html`${countText(cards.length)}${pokemonCardList(cards)}`,
  })}`;

  return layout({ title: pageTitle(name), content });
}

export function abilityPage({ ability, cards }) {
  const name = englishName(ability);
  const effectEntry = ability.effect_entries?.find((entry) => entry.language?.name === 'en');
  const effect = effectEntry?.short_effect
    ? effectEntry.short_effect.replace(/\s+/g, ' ').trim()
    : latestEnglishFlavor(ability.flavor_text_entries) ?? '—';

  const content = html`<h1>${name}</h1>
  ${panel({ id: 'effect', title: 'Effect', body: html`<p>${effect}</p>` })}
  ${panel({
    id: 'pokemon',
    title: 'Pokémon',
    body: html`${countText(cards.length)}${pokemonCardList(cards)}`,
  })}`;

  return layout({ title: pageTitle(name), content });
}

export function typesPage({ types }) {
  const content = html`<h1 class="types-title">Types</h1>
  <ul class="type-grid">
    ${types.map((type) => html`<li>${typeBadge(type.name)}</li>`)}
  </ul>`;
  return layout({ title: pageTitle('Types'), content });
}

export function typePage({ type, cards, moveLinks }) {
  const name = englishName(type);
  const relationTerms = [
    ['Super effective against', 'double_damage_to'],
    ['Not very effective against', 'half_damage_to'],
    ['No effect against', 'no_damage_to'],
    ['Weak to', 'double_damage_from'],
    ['Resists', 'half_damage_from'],
    ['Immune to', 'no_damage_from'],
  ];

  const content = html`<h1>${name}</h1>
  ${panel({
    id: 'damage-relations',
    title: 'Damage relations',
    body: html`<dl class="damage-relations">
      ${relationTerms.map(([label, key]) => html`<div class="relation">
        <dt>${label}</dt>
        <dd>${typeLinks((type.damage_relations?.[key] ?? []).map((entry) => entry.name))}</dd>
      </div>`)}
    </dl>`,
  })}
  ${panel({
    id: 'pokemon',
    title: 'Pokémon',
    body: html`${countText(cards.length)}${pokemonCardList(cards)}`,
  })}
  ${panel({
    id: 'moves',
    title: 'Moves',
    body: html`${countText(moveLinks.length, 'moves')}
      <ul class="move-links">${moveLinks.map((move) => html`<li><a href="/moves/${move.name}">${move.label}</a></li>`)}</ul>`,
  })}`;

  return layout({ title: pageTitle(name), content });
}

export function notFoundPage() {
  return layout({
    title: pageTitle('Not found'),
    content: html`<h1>Not found</h1>
    <p><a href="/">Back to the Pokédex</a></p>`,
  });
}
