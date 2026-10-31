import { html } from 'hono/html';
import {
  artworkUrl,
  dexNumber,
  englishName,
  humanize,
  spriteUrl,
} from './api.js';

const PAGE_SIZE = 48;

// ---- Shared layout ----------------------------------------------------------

export function layout({ title, content }) {
  return html`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <link rel="stylesheet" href="/styles.css">
    <script src="/htmx.min.js" defer></script>
    <script src="/app.js" defer></script>
  </head>
  <body>
    <header class="site-header">
      <div class="wrap header-inner">
        <a class="brand" href="/">Pokédex</a>
        <nav class="site-nav" aria-label="Main">
          <a href="/">Pokémon</a>
          <a href="/types">Types</a>
        </nav>
      </div>
    </header>
    <main class="wrap">
      ${content}
    </main>
    <footer class="site-footer">
      <div class="wrap">
        <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
      </div>
    </footer>
  </body>
</html>`;
}

export function notFoundPage() {
  return layout({
    title: 'Not found – Pokédex',
    content: html`
      <h1>Not found</h1>
      <p><a href="/">Back to the Pokédex</a></p>
    `,
  });
}

// ---- Components -------------------------------------------------------------

const typeBadgeLink = (typeEn) => (name) =>
  html`<a class="badge type-${name}" href="/types/${name}">${typeEn(name)}</a>`;

export function pokemonCard(s, { showTypes = false, hidden = false, typeEn } = {}) {
  return html`<li class="card-item">
    <a class="card" href="/pokemon/${s.name}">
      <img class="sprite" src="${spriteUrl(s.id)}" alt="" width="96" height="96" loading="lazy">
      <span class="dex">${dexNumber(s.id)}</span>
      <span class="card-name">${humanize(s.name)}</span>
      ${showTypes
        ? html`<span class="badges">${s.types.map(
            (t) => html`<span class="badge type-${t.name}">${typeEn(t.name)}</span>`,
          )}</span>`
        : ''}
      ${hidden ? html`<span class="hidden-ability">Hidden ability</span>` : ''}
    </a>
  </li>`;
}

export function cardGrid(items, opts) {
  return html`<ul class="cards">${items.map((s) => pokemonCard(s, opts))}</ul>`;
}

function section(id, heading, content) {
  return html`<section class="panel" aria-labelledby="${id}-heading">
    <h2 id="${id}-heading">${heading}</h2>
    ${content}
  </section>`;
}

// ---- Home page ---------------------------------------------------------------

export function homePage({ index, q, type, generation, page, totalPages, count, items }) {
  return layout({
    title: 'Pokédex',
    content: html`
      <h1>Pokémon</h1>
      <form
        id="filters"
        class="filters"
        hx-get="/"
        hx-trigger="input changed delay:200ms, change"
        hx-target="#results"
        hx-swap="outerHTML"
        hx-push-url="true"
      >
        <div class="field field-search">
          <label for="filter-search">Search</label>
          <input id="filter-search" type="search" name="q" value="${q}">
        </div>
        <div class="field">
          <label for="filter-type">Type</label>
          <select id="filter-type" name="type">
            <option value="">All types</option>
            ${index.types.map(
              (t) =>
                html`<option value="${t.name}" ${t.name === type ? 'selected' : ''}>${t.en}</option>`,
            )}
          </select>
        </div>
        <div class="field">
          <label for="filter-generation">Generation</label>
          <select id="filter-generation" name="generation">
            <option value="">All generations</option>
            ${index.generations.map(
              (g) =>
                html`<option value="${g.name}" ${g.name === generation ? 'selected' : ''}>${g.en}</option>`,
            )}
          </select>
        </div>
      </form>
      ${homeResults({ q, type, generation, page, totalPages, count, items, index })}
    `,
  });
}

// Also rendered standalone as the htmx fragment for live filtering.
export function homeResults({ q, type, generation, page, totalPages, count, items, index }) {
  const base = new URLSearchParams();
  if (q) base.set('q', q);
  if (type) base.set('type', type);
  if (generation) base.set('generation', generation);
  const pageUrl = (p) => {
    const params = new URLSearchParams(base);
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return qs ? `/?${qs}` : '/';
  };
  return html`<div id="results">
    <p class="count">${count} Pokémon</p>
    ${count === 0
      ? html`<p class="empty">No Pokémon found</p>`
      : cardGrid(items, { showTypes: true, typeEn: index.typeEn.get.bind(index.typeEn) })}
    <div class="pagination">
      <span class="page-status">Page ${page} of ${totalPages}</span>
      ${page > 1 ? html`<a href="${pageUrl(page - 1)}">Previous page</a>` : ''}
      ${page < totalPages ? html`<a href="${pageUrl(page + 1)}">Next page</a>` : ''}
    </div>
  </div>`;
}

export { PAGE_SIZE };

// ---- Pokémon page -------------------------------------------------------------

const STAT_LABELS = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

export function pokemonPage({
  species,
  pokemon,
  chain,
  movesData,
  index,
}) {
  const en = englishName(species);
  const genus = species.genera?.find((g) => g.language?.name === 'en')?.genus ?? '';
  const flavor = (() => {
    const entries = (species.flavor_text_entries ?? []).filter((e) => e.language?.name === 'en');
    return entries.length ? entries[entries.length - 1].flavor_text.replace(/\s+/g, ' ').trim() : '';
  })();
  const typeEn = (n) => index.typeEn.get(n) ?? humanize(n);
  const height = (pokemon.height / 10).toFixed(1);
  const weight = (pokemon.weight / 10).toFixed(1);
  const stats = pokemon.stats.map((s) => ({
    label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
    value: s.base_stat,
  }));
  const total = stats.reduce((sum, s) => sum + s.value, 0);
  const artwork = pokemon.sprites?.other?.['official-artwork']?.front_default ?? artworkUrl(pokemon.id);

  return layout({
    title: `${en} – Pokédex`,
    content: html`
      <div class="summary">
        <div class="artwork panel">
          <img src="${artwork}" alt="${en}" width="288" height="288">
        </div>
        <div class="summary-info">
          <p class="dex">${dexNumber(species.id)}</p>
          <h1>${en}</h1>
          <p class="genus">${genus}</p>
          <p class="type-badges">${pokemon.types.map((t) => typeBadgeLink(typeEn)(t.type.name))}</p>
          <dl class="facts">
            <div><dt>Height</dt><dd>${height} m</dd></div>
            <div><dt>Weight</dt><dd>${weight} kg</dd></div>
          </dl>
          <p class="flavor">${flavor}</p>
        </div>
      </div>

      ${section(
        'stats',
        'Base stats',
        html`<table class="stats">
          <tbody>
            ${stats.map(
              (s) => html`<tr>
                <th scope="row">${s.label}</th>
                <td class="num">${s.value}</td>
                <td class="bar" aria-hidden="true">
                  <span class="track"><span class="fill" style="width: ${Math.min(100, (s.value / 255) * 100)}%"></span></span>
                </td>
              </tr>`,
            )}
            <tr class="total">
              <th scope="row">Total</th>
              <td class="num">${total}</td>
              <td class="bar" aria-hidden="true">
                <span class="track"><span class="fill" style="width: ${Math.min(100, (total / (255 * stats.length)) * 100)}%"></span></span>
              </td>
            </tr>
          </tbody>
        </table>`,
      )}

      ${section(
        'abilities',
        'Abilities',
        html`<ul class="plain-list">
          ${pokemon.abilities.map(
            (a) => html`<li>
              <a href="/abilities/${a.ability.name}">${humanize(a.ability.name)}</a>${a.is_hidden ? html` <span class="muted">(hidden)</span>` : ''}
            </li>`,
          )}
        </ul>`,
      )}

      ${section(
        'evolution',
        'Evolution',
        chain ? html`<ul class="evo-tree">${evolutionNode(chain)}</ul>` : html`<p class="muted">—</p>`,
      )}

      <section class="panel moves-panel" id="moves" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>
        ${movesInner(movesData)}
      </section>
    `,
  });
}

function evolutionNode(node) {
  return html`<li>
    <a href="/pokemon/${node.species.name}">${humanize(node.species.name)}</a>
    ${node.evolves_to?.length
      ? html`<ul>${node.evolves_to.map((child) => evolutionNode(child))}</ul>`
      : ''}
  </li>`;
}

// The part of the Moves section that is re-rendered when the game changes.
export function movesInner({ speciesName, games, selectedGame, tables }) {
  return html`<div id="moves-inner">
    <form
      class="game-picker"
      hx-get="/pokemon/${speciesName}"
      hx-trigger="change"
      hx-target="#moves-inner"
      hx-swap="outerHTML"
      hx-push-url="true"
    >
      <label for="game-select">Game</label>
      <select id="game-select" name="game">
        ${games.map(
          (g) =>
            html`<option value="${g.name}" ${g.name === selectedGame ? 'selected' : ''}>${humanize(g.name)}</option>`,
        )}
      </select>
    </form>
    ${tables.map((t) => movesTable(t))}
  </div>`;
}

const MOVE_COLUMNS = [
  { key: 'move', label: 'Move' },
  { key: 'type', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'power', label: 'Power' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'pp', label: 'PP' },
];

// One learn-method table. Also rendered standalone for sort interactions.
export function movesTable({ speciesName, game, method, rows, sort, dir }) {
  const columns = [
    ...(method === 'level-up' ? [{ key: 'level', label: 'Level' }] : []),
    ...MOVE_COLUMNS,
  ];
  const sortUrl = (col) => {
    const nextDir = col === sort && dir !== 'desc' ? 'desc' : 'asc';
    return `/pokemon/${speciesName}/moves-table?game=${game}&method=${method}&sort=${col}&dir=${nextDir}`;
  };
  return html`<table class="moves-table">
    <caption>${humanize(method)}</caption>
    <thead>
      <tr>
        ${columns.map(
          (col) => html`<th scope="col"${col.key === sort ? html` aria-sort="${dir === 'desc' ? 'descending' : 'ascending'}"` : ''}>
            <button type="button" hx-get="${sortUrl(col.key)}" hx-target="closest table" hx-swap="outerHTML">${col.label}</button>
          </th>`,
        )}
      </tr>
    </thead>
    <tbody>
      ${rows.map(
        (r) => html`<tr>
          ${method === 'level-up' ? html`<td class="num">${r.level}</td>` : ''}
          <td><a href="/moves/${r.name}">${r.en}</a></td>
          <td><a class="badge type-${r.type}" href="/types/${r.type}">${r.typeEn}</a></td>
          <td>${r.category}</td>
          <td class="num">${r.power ?? '—'}</td>
          <td class="num">${r.accuracy ?? '—'}</td>
          <td class="num">${r.pp ?? '—'}</td>
        </tr>`,
      )}
    </tbody>
  </table>`;
}

// ---- Move page ----------------------------------------------------------------

export function movePage({ move, effect, species, index }) {
  const en = englishName(move);
  const typeEn = (n) => index.typeEn.get(n) ?? humanize(n);
  const value = (v) => (v ?? '—');
  return layout({
    title: `${en} – Pokédex`,
    content: html`
      <h1>${en}</h1>
      <dl class="facts panel facts-panel">
        <div><dt>Type</dt><dd>${typeBadgeLink(typeEn)(move.type.name)}</dd></div>
        <div><dt>Category</dt><dd>${humanize(move.damage_class.name)}</dd></div>
        <div><dt>Power</dt><dd>${value(move.power)}</dd></div>
        <div><dt>Accuracy</dt><dd>${value(move.accuracy)}</dd></div>
        <div><dt>PP</dt><dd>${value(move.pp)}</dd></div>
      </dl>
      ${section('effect', 'Effect', html`<p>${effect}</p>`)}
      ${section(
        'learned-by',
        'Learned by',
        html`
          <p class="count">${species.length} Pokémon</p>
          ${cardGrid(species, { typeEn })}
        `,
      )}
    `,
  });
}

// ---- Ability page -------------------------------------------------------------

export function abilityPage({ ability, effect, entries, index }) {
  const en = englishName(ability);
  const typeEn = (n) => index.typeEn.get(n) ?? humanize(n);
  return layout({
    title: `${en} – Pokédex`,
    content: html`
      <h1>${en}</h1>
      ${section('effect', 'Effect', html`<p>${effect}</p>`)}
      ${section(
        'pokemon',
        'Pokémon',
        html`
          <p class="count">${entries.length} Pokémon</p>
          <ul class="cards">
            ${entries.map((e) => pokemonCard(e.species, { hidden: e.hidden, typeEn }))}
          </ul>
        `,
      )}
    `,
  });
}

// ---- Type pages ---------------------------------------------------------------

export function typesPage({ index }) {
  return layout({
    title: 'Types – Pokédex',
    content: html`
      <h1>Types</h1>
      <ul class="type-list">
        ${index.types.map(
          (t) => html`<li><a class="type-tile type-${t.name}" href="/types/${t.name}">${t.en}</a></li>`,
        )}
      </ul>
    `,
  });
}

const DAMAGE_RELATIONS = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from'],
];

export function typePage({ type, species, moves, index }) {
  const en = englishName(type);
  const typeEn = (n) => index.typeEn.get(n) ?? humanize(n);
  return layout({
    title: `${en} – Pokédex`,
    content: html`
      <h1>${en}</h1>
      ${section(
        'damage-relations',
        'Damage relations',
        html`<dl class="relations">
          ${DAMAGE_RELATIONS.map(([label, key]) => {
            const related = type.damage_relations?.[key] ?? [];
            return html`<div>
              <dt>${label}</dt>
              <dd>
                ${related.length
                  ? html`<span class="badges">${related.map((r) => typeBadgeLink(typeEn)(r.name))}</span>`
                  : 'None'}
              </dd>
            </div>`;
          })}
        </dl>`,
      )}
      ${section(
        'pokemon',
        'Pokémon',
        html`
          <p class="count">${species.length} Pokémon</p>
          ${cardGrid(species, { typeEn })}
        `,
      )}
      ${section(
        'moves',
        'Moves',
        html`
          <p class="count">${moves.length} moves</p>
          <ul class="move-list">
            ${moves.map((m) => html`<li><a href="/moves/${m.name}">${humanize(m.name)}</a></li>`)}
          </ul>
        `,
      )}
    `,
  });
}
