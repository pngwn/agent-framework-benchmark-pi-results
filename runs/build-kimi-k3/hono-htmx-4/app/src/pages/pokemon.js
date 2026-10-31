import {
  species as fetchSpecies, pokemon as fetchPokemon, move as fetchMove,
  versionGroup as fetchVersionGroup, evolutionChain as fetchEvolutionChain,
  typeList, idFromUrl, humanize, englishName, englishGenus, latestEnglishFlavorText,
  dexNumber, fetchAll,
} from '../api.js';
import { html, layout, pageDocTitle, section, typeBadge } from '../render.js';

const STAT_LABELS = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

const COLUMNS = {
  level: { label: 'Level', get: (r) => r.level, numeric: true },
  move: { label: 'Move', get: (r) => r.moveEnglish, numeric: false },
  type: { label: 'Type', get: (r) => r.typeEnglish, numeric: false },
  category: { label: 'Category', get: (r) => r.category, numeric: false },
  power: { label: 'Power', get: (r) => r.power, numeric: true },
  accuracy: { label: 'Accuracy', get: (r) => r.accuracy, numeric: true },
  pp: { label: 'PP', get: (r) => r.pp, numeric: true },
};

function methodSortKey(name) {
  const i = METHOD_ORDER.indexOf(name);
  return i === -1 ? METHOD_ORDER.length : i;
}

function sortRows(rows, sort, dir) {
  if (!sort || !COLUMNS[sort]) return rows;
  const col = COLUMNS[sort];
  const sign = dir === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const va = col.get(a);
    const vb = col.get(b);
    if (va == null && vb == null) return 0;
    if (va == null) return 1; // missing values sort last in both directions
    if (vb == null) return -1;
    const cmp = col.numeric ? va - vb : String(va).localeCompare(String(vb));
    return cmp * sign;
  });
}

function movesTableUrl(speciesName, { game, method, sort, dir }) {
  const params = new URLSearchParams({ game, method });
  if (sort) params.set('sort', sort);
  if (dir) params.set('dir', dir);
  return `/pokemon/${speciesName}/moves-table?${params}`;
}

function movesTable(speciesName, game, method, rows, { sort = null, dir = null } = {}) {
  const isLevelUp = method === 'level-up';
  const cols = isLevelUp
    ? ['level', 'move', 'type', 'category', 'power', 'accuracy', 'pp']
    : ['move', 'type', 'category', 'power', 'accuracy', 'pp'];
  const sorted = sortRows(rows, sort, dir);
  const num = (v) => (v == null ? '—' : String(v));

  return html`
    <table class="moves-table" id="moves-${method}">
      <caption>${humanize(method)}</caption>
      <thead>
        <tr>
          ${cols.map((col) => {
            const active = sort === col;
            const nextDir = active && dir !== 'desc' ? 'desc' : 'asc';
            return html`
            <th scope="col"${active ? html` aria-sort="${dir === 'desc' ? 'descending' : 'ascending'}"` : ''}>
              <button type="button"
                hx-get="${movesTableUrl(speciesName, { game, method, sort: col, dir: nextDir })}"
                hx-target="closest table" hx-swap="outerHTML">${COLUMNS[col].label}</button>
            </th>`;
          })}
        </tr>
      </thead>
      <tbody>
        ${sorted.map((r) => html`
        <tr>
          ${isLevelUp ? html`<td>${num(r.level)}</td>` : ''}
          <td><a href="/moves/${r.moveName}">${r.moveEnglish}</a></td>
          <td>${typeBadge(r.typeName, r.typeEnglish)}</td>
          <td>${r.category}</td>
          <td>${num(r.power)}</td>
          <td>${num(r.accuracy)}</td>
          <td>${num(r.pp)}</td>
        </tr>`)}
      </tbody>
    </table>
  `;
}

// Gather everything the moves section needs for one Pokémon.
async function movesData(p) {
  const gameNames = new Set();
  for (const m of p.moves) {
    for (const d of m.version_group_details) gameNames.add(d.version_group.name);
  }
  const groups = await fetchAll([...gameNames], (name) => fetchVersionGroup(name));
  const games = groups
    .filter(Boolean)
    .sort((a, b) => a.order - b.order)
    .map((g) => ({ name: g.name, label: humanize(g.name) }));
  return games;
}

async function methodRows(p, game, typeEnglish) {
  const byMethod = new Map(); // method -> rows
  const moveNames = new Set();
  for (const m of p.moves) {
    for (const d of m.version_group_details) {
      if (d.version_group.name !== game) continue;
      moveNames.add(m.move.name);
      const method = d.move_learn_method.name;
      if (!byMethod.has(method)) byMethod.set(method, []);
      byMethod.get(method).push({ moveName: m.move.name, level: d.level_learned_at });
    }
  }
  const records = new Map();
  await fetchAll([...moveNames], async (name) => {
    records.set(name, await fetchMove(name));
  });
  for (const [method, rows] of byMethod) {
    byMethod.set(method, rows.map((r) => {
      const rec = records.get(r.moveName);
      return {
        level: r.level,
        moveName: r.moveName,
        moveEnglish: (rec && englishName(rec)) ?? humanize(r.moveName),
        typeName: rec?.type?.name ?? '',
        typeEnglish: typeEnglish.get(rec?.type?.name) ?? humanize(rec?.type?.name ?? ''),
        category: rec?.damage_class?.name ? humanize(rec.damage_class.name) : '—',
        power: rec?.power ?? null,
        accuracy: rec?.accuracy ?? null,
        pp: rec?.pp ?? null,
      };
    }));
  }
  return byMethod;
}

function defaultSorted(byMethod) {
  const methods = [...byMethod.keys()].sort(
    (a, b) => methodSortKey(a) - methodSortKey(b) || humanize(a).localeCompare(humanize(b)),
  );
  return methods.map((method) => {
    const rows = byMethod.get(method);
    const sorted = method === 'level-up'
      ? sortRows(sortRows(rows, 'move', 'asc'), 'level', 'asc')
      : sortRows(rows, 'move', 'asc');
    return { method, rows: sorted };
  });
}

async function movesSectionHtml(speciesName, p, selectedGame, games, typeEnglish) {
  const byMethod = await methodRows(p, selectedGame, typeEnglish);
  const tables = defaultSorted(byMethod).map(({ method, rows }) =>
    movesTable(speciesName, selectedGame, method, rows));

  return html`
    <section id="moves" aria-labelledby="moves-heading" class="section">
      <h2 id="moves-heading">Moves</h2>
      <div class="field game-field">
        <label for="game">Game</label>
        <select id="game" name="game" hx-get="/pokemon/${speciesName}" hx-target="#moves" hx-swap="outerHTML" hx-trigger="change">
          ${games.map((g) => html`<option value="${g.name}"${g.name === selectedGame ? html` selected` : ''}>${g.label}</option>`)}
        </select>
      </div>
      ${tables}
    </section>
  `;
}

function statsSection(p) {
  const stats = p.stats;
  const total = stats.reduce((sum, s) => sum + s.base_stat, 0);
  const row = (label, value, max) => html`
    <tr>
      <th scope="row">${label}</th>
      <td class="stat-value">${value}</td>
      <td class="stat-bar-cell">
        <div class="stat-bar"><div class="stat-fill" style="width: ${Math.min(100, (value / max) * 100)}%"></div></div>
      </td>
    </tr>`;
  return section('Base stats', html`
    <table class="stats-table">
      <tbody>
        ${stats.map((s) => row(STAT_LABELS[s.stat.name] ?? humanize(s.stat.name), s.base_stat, 245))}
        ${row('Total', total, 6 * 245)}
      </tbody>
    </table>
  `);
}

function abilitiesSection(p) {
  const abilities = p.abilities.slice().sort((a, b) => a.slot - b.slot);
  return section('Abilities', html`
    <ul class="plain-list">
      ${abilities.map((a) => html`
        <li><a href="/abilities/${a.ability.name}">${humanize(a.ability.name)}</a>${a.is_hidden ? html` <span class="muted">(hidden)</span>` : ''}</li>
      `)}
    </ul>
  `);
}

function evolutionSection(chain) {
  const node = (n) => html`
    <li>
      <a href="/pokemon/${n.species.name}">${humanize(n.species.name)}</a>
      ${n.evolves_to?.length ? html`<ul>${n.evolves_to.map(node)}</ul>` : ''}
    </li>`;
  return section('Evolution', html`<ul class="plain-list evolution">${node(chain.chain)}</ul>`);
}

async function loadPokemon(name) {
  const sp = await fetchSpecies(name);
  if (!sp) return null;
  const variety = sp.varieties?.find((v) => v.is_default) ?? sp.varieties?.[0];
  if (!variety) return null;
  const p = await fetchPokemon(idFromUrl(variety.pokemon.url));
  if (!p) return null;
  return { sp, p };
}

export async function pokemonPage(c) {
  const name = c.req.param('name');
  const loaded = await loadPokemon(name);
  if (!loaded) return null;
  const { sp, p } = loaded;

  const isHtmx = c.req.header('hx-request') === 'true' && !c.req.header('hx-history-restore-request');
  const hxTarget = c.req.header('hx-target');

  const types = await typeList();
  const typeEnglish = new Map(types.map((t) => [t.name, t.englishName]));

  const games = await movesData(p);
  const defaultGame = games.length ? games[games.length - 1].name : null;
  const requested = c.req.query('game');
  const selectedGame = games.some((g) => g.name === requested) ? requested : defaultGame;

  if (isHtmx && hxTarget === 'moves') {
    const sectionHtml = await movesSectionHtml(name, p, selectedGame, games, typeEnglish);
    const url = selectedGame && selectedGame !== defaultGame ? `/pokemon/${name}?game=${selectedGame}` : `/pokemon/${name}`;
    c.header('HX-Push-Url', url);
    return c.html(String(sectionHtml));
  }

  const chain = await fetchEvolutionChain(sp.evolution_chain?.url);
  const artwork =
    p.sprites?.other?.['official-artwork']?.front_default ?? p.sprites?.front_default ?? '';
  const flavor = latestEnglishFlavorText(sp);
  const genus = englishGenus(sp);
  const englishTitle = englishName(sp) ?? humanize(sp.name);
  const height = (p.height / 10).toFixed(1);
  const weight = (p.weight / 10).toFixed(1);
  const pTypes = p.types
    .slice()
    .sort((a, b) => a.slot - b.slot)
    .map((t) => ({ name: t.type.name, englishName: typeEnglish.get(t.type.name) ?? humanize(t.type.name) }));

  const headHtml = html`
    <div class="pokemon-head">
      <img class="artwork" src="${artwork}" alt="${englishTitle}" width="288" height="288" />
      <div class="pokemon-head-info">
        <p class="dex muted">${dexNumber(sp.id)}</p>
        <h1>${englishTitle}</h1>
        ${genus ? html`<p class="genus muted">${genus}</p>` : ''}
        <p class="card-types">${pTypes.map((t) => typeBadge(t.name, t.englishName))}</p>
        <dl class="facts">
          <div><dt>Height</dt><dd>${height} m</dd></div>
          <div><dt>Weight</dt><dd>${weight} kg</dd></div>
        </dl>
        ${flavor ? html`<p class="flavor">${flavor}</p>` : ''}
      </div>
    </div>
  `;

  const movesHtml = selectedGame
    ? await movesSectionHtml(name, p, selectedGame, games, typeEnglish)
    : '';

  return c.html(layout({
    docTitle: pageDocTitle(englishTitle),
    content: html`
      ${headHtml}
      ${statsSection(p)}
      ${abilitiesSection(p)}
      ${chain ? evolutionSection(chain) : ''}
      ${movesHtml}
    `,
  }));
}

// Partial endpoint: one moves table, re-sorted.
export async function movesTablePartial(c) {
  const name = c.req.param('name');
  const loaded = await loadPokemon(name);
  if (!loaded) return null;
  const { p } = loaded;

  const game = c.req.query('game') ?? '';
  const method = c.req.query('method') ?? '';
  const sort = c.req.query('sort') ?? null;
  const dir = c.req.query('dir') === 'desc' ? 'desc' : 'asc';

  const types = await typeList();
  const typeEnglish = new Map(types.map((t) => [t.name, t.englishName]));
  const byMethod = await methodRows(p, game, typeEnglish);
  const rows = byMethod.get(method);
  if (!rows) return c.html('', 404);

  const defaultRows = method === 'level-up'
    ? sortRows(sortRows(rows, 'move', 'asc'), 'level', 'asc')
    : sortRows(rows, 'move', 'asc');
  return c.html(String(movesTable(name, game, method, defaultRows, { sort, dir })));
}
