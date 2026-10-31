// `/pokemon/:name` — species summary, stats, abilities, evolution chain, moves.

import { fetchJson, mediaUrl } from '../api.js';
import { loadCatalog } from '../catalog.js';
import { badgeHtml, sectionHtml } from '../components.js';
import {
  dexNumber,
  englishName,
  esc,
  humanize,
  latestEnglishFlavor,
  MISSING,
  showValue,
} from '../util.js';
import { renderNotFound } from './notfound.js';

const STAT_LABELS = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};
const STAT_BAR_MAX = 255;

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

const MOVE_COLUMNS = [
  { key: 'move', label: 'Move' },
  { key: 'type', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'power', label: 'Power' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'pp', label: 'PP' },
];

export async function renderPokemon(main, name, url, ctx) {
  let species;
  try {
    species = await fetchJson(`/api/v2/pokemon-species/${encodeURIComponent(name)}/`);
  } catch (err) {
    if (err.status === 404) return renderNotFound(main);
    throw err;
  }

  const defaultVariety = species.varieties.find((v) => v.is_default) ?? species.varieties[0];
  const [pokemon, chain, catalog] = await Promise.all([
    fetchJson(defaultVariety.pokemon.url),
    fetchJson(species.evolution_chain.url),
    loadCatalog(),
  ]);
  if (ctx.stale()) return;

  const displayName = englishName(species.names) ?? humanize(species.name);
  document.title = `${displayName} – Pokédex`;

  const genus = species.genera.find((g) => g.language?.name === 'en')?.genus ?? '';
  const flavor = latestEnglishFlavor(species.flavor_text_entries) ?? '';
  const artwork =
    pokemon.sprites?.other?.['official-artwork']?.front_default ??
    pokemon.sprites?.front_default ??
    mediaUrl(`sprites/pokemon/other/official-artwork/${pokemon.id}.png`);

  const typeBadges = (pokemon.types ?? [])
    .slice()
    .sort((a, b) => a.slot - b.slot)
    .map((t) => badgeHtml(t.type.name, catalog.typeEn.get(t.type.name) ?? humanize(t.type.name), { link: true }))
    .join('');

  const summaryHtml = `
    <div class="summary">
      <div class="artwork panel"><img src="${artwork}" alt="${esc(displayName)}" width="288" height="288" /></div>
      <div class="summary-info">
        <p class="dex dex-lg">${dexNumber(species.id)}</p>
        <h1>${esc(displayName)}</h1>
        ${genus ? `<p class="genus">${esc(genus)}</p>` : ''}
        <p class="badges badges-lg">${typeBadges}</p>
        <dl class="facts">
          <div class="fact"><dt>Height</dt><dd>${(pokemon.height / 10).toFixed(1)} m</dd></div>
          <div class="fact"><dt>Weight</dt><dd>${(pokemon.weight / 10).toFixed(1)} kg</dd></div>
        </dl>
        ${flavor ? `<p class="flavor">${esc(flavor)}</p>` : ''}
      </div>
    </div>`;

  main.innerHTML =
    summaryHtml +
    statsSection(pokemon) +
    abilitiesSection(pokemon) +
    evolutionSection(chain) +
    `<section class="panel" id="moves" aria-labelledby="moves-heading">
      <h2 id="moves-heading">Moves</h2>
      <div class="moves-body"><p class="status-text">Loading…</p></div>
    </section>`;

  await renderMoves(main, pokemon, catalog, url.searchParams.get('game'), ctx);
}

function statsSection(pokemon) {
  const stats = pokemon.stats ?? [];
  const total = stats.reduce((sum, s) => sum + s.base_stat, 0);
  const rows = stats
    .map((s) => statRow(STAT_LABELS[s.stat.name] ?? humanize(s.stat.name), s.base_stat))
    .join('');
  const body = `<table class="stats-table"><tbody>${rows}${statRow('Total', total)}</tbody></table>`;
  return sectionHtml('stats', 'Base stats', body);
}

function statRow(label, value) {
  const width = Math.min(100, (value / STAT_BAR_MAX) * 100);
  return `<tr>
    <th scope="row">${esc(label)}</th>
    <td class="stat-value">${value}</td>
    <td class="stat-bar"><span class="track"><span class="fill" style="width:${width}%"></span></span></td>
  </tr>`;
}

function abilitiesSection(pokemon) {
  const items = (pokemon.abilities ?? [])
    .slice()
    .sort((a, b) => a.slot - b.slot)
    .map(
      (a) =>
        `<li><a href="/abilities/${esc(a.ability.name)}">${esc(humanize(a.ability.name))}</a>${
          a.is_hidden ? ' (hidden)' : ''
        }</li>`,
    )
    .join('');
  return sectionHtml('abilities', 'Abilities', `<ul class="plain-list">${items}</ul>`);
}

function evolutionSection(chain) {
  const node = (n) => {
    const kids = (n.evolves_to ?? []).map(node).join('');
    return `<li><a href="/pokemon/${esc(n.species.name)}">${esc(humanize(n.species.name))}</a>${
      kids ? `<ul>${kids}</ul>` : ''
    }</li>`;
  };
  return sectionHtml('evolution', 'Evolution', `<ul class="evo-tree">${node(chain.chain)}</ul>`);
}

// --- Moves -----------------------------------------------------------------

async function renderMoves(main, pokemon, catalog, requestedGame, ctx) {
  const body = main.querySelector('.moves-body');

  // Version groups in which this Pokémon learns moves, ordered by their `order`.
  const groupsByName = new Map();
  for (const move of pokemon.moves ?? []) {
    for (const detail of move.version_group_details ?? []) {
      if (!groupsByName.has(detail.version_group.name)) {
        groupsByName.set(detail.version_group.name, detail.version_group.url);
      }
    }
  }

  if (groupsByName.size === 0) {
    body.innerHTML = '<p class="status-text">No moves</p>';
    return;
  }

  const records = await Promise.all([...groupsByName.values()].map((u) => fetchJson(u)));
  if (ctx.stale()) return;
  const order = new Map(records.map((r) => [r.name, r.order]));
  const games = [...groupsByName.keys()].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));

  let selected = games.includes(requestedGame) ? requestedGame : games[games.length - 1];

  body.innerHTML = `
    <div class="field field-game">
      <label for="game-select">Game</label>
      <select id="game-select">
        ${games.map((g) => `<option value="${esc(g)}">${esc(humanize(g))}</option>`).join('')}
      </select>
    </div>
    <div class="moves-tables"><p class="status-text">Loading…</p></div>`;

  const select = body.querySelector('#game-select');
  const tablesContainer = body.querySelector('.moves-tables');
  select.value = selected;

  // sortState: per learn method, { key, dir } or null (default order).
  const sortState = new Map();
  let currentTables = [];

  async function loadGame(game) {
    // Rows grouped by learn method for the selected version group.
    const byMethod = new Map();
    const moveUrls = new Set();
    for (const move of pokemon.moves ?? []) {
      for (const detail of move.version_group_details ?? []) {
        if (detail.version_group.name !== game) continue;
        const method = detail.move_learn_method.name;
        if (!byMethod.has(method)) byMethod.set(method, []);
        byMethod.get(method).push({
          level: detail.level_learned_at,
          moveName: move.move.name,
          moveUrl: move.move.url,
        });
        moveUrls.add(move.move.url);
      }
    }

    const moveRecords = new Map();
    await Promise.all(
      [...moveUrls].map(async (u) => {
        moveRecords.set(u, await fetchJson(u));
      }),
    );
    if (ctx.stale()) return null;

    const methods = [...byMethod.keys()].sort((a, b) => {
      const ia = METHOD_ORDER.indexOf(a);
      const ib = METHOD_ORDER.indexOf(b);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? METHOD_ORDER.length : ia) - (ib === -1 ? METHOD_ORDER.length : ib);
      return humanize(a).localeCompare(humanize(b));
    });

    return methods.map((method) => ({
      method,
      rows: byMethod.get(method).map((row) => {
        const record = moveRecords.get(row.moveUrl);
        const typeName = record.type?.name ?? '';
        return {
          level: row.level,
          moveName: row.moveName,
          moveLabel: englishName(record.names) ?? humanize(row.moveName),
          typeName,
          typeLabel: catalog.typeEn.get(typeName) ?? humanize(typeName),
          category: record.damage_class ? humanize(record.damage_class.name) : MISSING,
          power: record.power,
          accuracy: record.accuracy,
          pp: record.pp,
        };
      }),
    }));
  }

  function sortRows(rows, method, hasLevel) {
    const sort = sortState.get(method);
    const copy = rows.slice();
    if (!sort) {
      // Default: Level Up by level then move name; everything else by move name.
      copy.sort((a, b) => {
        if (hasLevel && a.level !== b.level) return (a.level ?? 0) - (b.level ?? 0);
        return a.moveLabel.localeCompare(b.moveLabel);
      });
      return copy;
    }
    const value = (row) =>
      ({ level: row.level, move: row.moveLabel, type: row.typeLabel, category: row.category }[sort.key] ?? row[sort.key]);
    const dir = sort.dir === 'ascending' ? 1 : -1;
    copy.sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      const aMissing = va === null || va === undefined;
      const bMissing = vb === null || vb === undefined;
      if (aMissing && bMissing) return 0;
      if (aMissing) return 1; // missing values sort last in both directions
      if (bMissing) return -1;
      const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return cmp * dir;
    });
    return copy;
  }

  function cellValues(row, hasLevel) {
    const cells = [];
    if (hasLevel) cells.push(`<td>${row.level === null || row.level === undefined ? MISSING : row.level}</td>`);
    cells.push(`<td><a href="/moves/${esc(row.moveName)}">${esc(row.moveLabel)}</a></td>`);
    cells.push(`<td>${row.typeName ? badgeHtml(row.typeName, row.typeLabel, { link: true }) : MISSING}</td>`);
    cells.push(`<td>${esc(row.category)}</td>`);
    cells.push(`<td>${showValue(row.power)}</td>`);
    cells.push(`<td>${showValue(row.accuracy)}</td>`);
    cells.push(`<td>${showValue(row.pp)}</td>`);
    return cells.join('');
  }

  function renderTables() {
    tablesContainer.innerHTML = currentTables
      .map(({ method, rows }) => {
        const hasLevel = method === 'level-up';
        const columns = hasLevel ? [{ key: 'level', label: 'Level' }, ...MOVE_COLUMNS] : MOVE_COLUMNS;
        const sort = sortState.get(method);
        const head = columns
          .map((col) => {
            const ariaSort = sort?.key === col.key ? ` aria-sort="${sort.dir}"` : '';
            return `<th scope="col"${ariaSort} data-method="${esc(method)}" data-key="${col.key}"><button type="button">${col.label}</button></th>`;
          })
          .join('');
        const bodyRows = sortRows(rows, method, hasLevel)
          .map((row) => `<tr>${cellValues(row, hasLevel)}</tr>`)
          .join('');
        return `<div class="table-scroll"><table class="moves-table">
          <caption>${esc(humanize(method))}</caption>
          <thead><tr>${head}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table></div>`;
      })
      .join('');
  }

  async function selectGame(game, { pushUrl = true } = {}) {
    tablesContainer.innerHTML = '<p class="status-text">Loading…</p>';
    const tables = await loadGame(game);
    if (tables === null || ctx.stale()) return;
    currentTables = tables;
    sortState.clear();
    renderTables();
    if (pushUrl) {
      const params = new URLSearchParams(location.search);
      params.set('game', game);
      history.pushState(null, '', `${location.pathname}?${params}${location.hash}`);
    }
  }

  select.addEventListener('change', () => {
    selected = select.value;
    selectGame(selected);
  });

  tablesContainer.addEventListener('click', (event) => {
    const header = event.target.closest('th[data-key]');
    if (!header) return;
    const { method, key } = header.dataset;
    const current = sortState.get(method);
    if (current?.key === key) {
      sortState.set(method, { key, dir: current.dir === 'ascending' ? 'descending' : 'ascending' });
    } else {
      sortState.set(method, { key, dir: 'ascending' });
    }
    renderTables();
  });

  await selectGame(selected, { pushUrl: false });
}
