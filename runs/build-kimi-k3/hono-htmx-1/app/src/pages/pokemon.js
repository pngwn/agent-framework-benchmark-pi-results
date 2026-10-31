import { html, raw } from 'hono/html';
import {
  getRecord,
  getTypeEnglishNames,
  idFromUrl,
  humanize,
  englishName,
  latestEnglishFlavorText,
  dexNumber,
  orMissing,
  mapPool,
} from '../api.js';
import { layout } from '../views/layout.js';
import { section, typeBadgeLink } from '../views/components.js';

const STAT_LABELS = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

const COLUMNS = [
  { key: 'level', label: 'Level', numeric: true, levelUpOnly: true },
  { key: 'move', label: 'Move' },
  { key: 'type', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'power', label: 'Power', numeric: true },
  { key: 'accuracy', label: 'Accuracy', numeric: true },
  { key: 'pp', label: 'PP', numeric: true },
];

// Load the species and its default Pokémon by species name.
export async function getSpeciesAndPokemon(name) {
  const species = await getRecord('pokemon-species', name);
  if (!species) return null;
  const defaultVariety = species.varieties?.find((v) => v.is_default) ?? species.varieties?.[0];
  if (!defaultVariety) return null;
  const pokemon = await getRecord('pokemon', defaultVariety.pokemon.name);
  if (!pokemon) return null;
  return { species, pokemon };
}

// Version groups in which this Pokémon learns moves, ordered by their `order`.
export async function getVersionGroups(pokemon) {
  const names = new Set();
  for (const move of pokemon.moves ?? []) {
    for (const detail of move.version_group_details ?? []) names.add(detail.version_group.name);
  }
  const records = await mapPool([...names], (name) => getRecord('version-group', name));
  return records.filter(Boolean).sort((a, b) => a.order - b.order);
}

// Moves learned in a version group, grouped by learn method.
// Returns Map<methodName, row[]> where row = { level, moveApiName, ... }.
export async function getMovesByMethod(pokemon, gameName) {
  const byMethod = new Map();
  for (const move of pokemon.moves ?? []) {
    for (const detail of move.version_group_details ?? []) {
      if (detail.version_group.name !== gameName) continue;
      const method = detail.move_learn_method.name;
      if (!byMethod.has(method)) byMethod.set(method, []);
      byMethod.get(method).push({ moveApiName: move.move.name, level: detail.level_learned_at });
    }
  }
  // Enrich with move records.
  const moveNames = new Set();
  for (const rows of byMethod.values()) for (const row of rows) moveNames.add(row.moveApiName);
  const records = await mapPool([...moveNames], (name) => getRecord('move', name));
  const moveByName = new Map([...moveNames].map((name, i) => [name, records[i]]));
  for (const rows of byMethod.values()) {
    for (const row of rows) row.move = moveByName.get(row.moveApiName);
  }
  return byMethod;
}

export function orderedMethods(byMethod) {
  const methods = [...byMethod.keys()];
  const fixed = METHOD_ORDER.filter((m) => methods.includes(m));
  const rest = methods
    .filter((m) => !METHOD_ORDER.includes(m))
    .sort((a, b) => humanize(a).localeCompare(humanize(b)));
  return [...fixed, ...rest];
}

function rowValues(row, typeNames) {
  const move = row.move ?? {};
  return {
    level: row.level ?? null,
    move: englishName(move) ?? humanize(row.moveApiName),
    type: typeNames.get(move.type?.name) ?? humanize(move.type?.name ?? ''),
    category: humanize(move.damage_class?.name ?? ''),
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
  };
}

function compare(a, b, numeric, dir) {
  const aMissing = a == null;
  const bMissing = b == null;
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1; // missing values sort last in both directions
  if (bMissing) return -1;
  const cmp = numeric ? a - b : String(a).localeCompare(String(b));
  return dir === 'desc' ? -cmp : cmp;
}

function sortRows(rows, sortKey, dir, isLevelUp) {
  const numeric = COLUMNS.find((c) => c.key === sortKey)?.numeric ?? false;
  const sorted = [...rows];
  if (sortKey) {
    sorted.sort((a, b) => compare(a[sortKey], b[sortKey], numeric, dir));
  } else if (isLevelUp) {
    sorted.sort((a, b) => compare(a.level, b.level, true, 'asc') || compare(a.move, b.move, false, 'asc'));
  } else {
    sorted.sort((a, b) => compare(a.move, b.move, false, 'asc'));
  }
  return sorted;
}

// Render one learn-method table. Used by the full page and the htmx partial.
export function moveTableView({ speciesName, game, method, rows, sort, dir, typeNames }) {
  const isLevelUp = method === 'level-up';
  const columns = COLUMNS.filter((c) => !c.levelUpOnly || isLevelUp);
  const values = rows.map((row) => ({ raw: row, v: rowValues(row, typeNames) }));
  const sorted = sortRows(
    values.map((x) => x.v),
    sort,
    dir,
    isLevelUp,
  );
  const sortedPairs = sorted.map((v) => values.find((x) => x.v === v));

  const sortUrl = (key, nextDir) =>
    `/pokemon/${encodeURIComponent(speciesName)}/move-table?game=${encodeURIComponent(game)}&method=${encodeURIComponent(
      method,
    )}&sort=${key}&dir=${nextDir}`;

  return html`<table class="move-table">
    <caption>${humanize(method)}</caption>
    <thead>
      <tr>
        ${columns.map((col) => {
          const isSorted = sort === col.key;
          const ariaSort = isSorted ? (dir === 'desc' ? 'descending' : 'ascending') : null;
          const nextDir = isSorted && dir === 'asc' ? 'desc' : 'asc';
          return html`<th${ariaSort ? raw(` aria-sort="${ariaSort}"`) : ''}>
            <button
              type="button"
              hx-get="${sortUrl(col.key, nextDir)}"
              hx-target="closest table"
              hx-swap="outerHTML"
              >${col.label}</button
            >
          </th>`;
        })}
      </tr>
    </thead>
    <tbody>
      ${sortedPairs.map(
        ({ raw, v }) => html`<tr>
          ${isLevelUp ? html`<td>${orMissing(v.level)}</td>` : ''}
          <td><a href="/moves/${raw.moveApiName}">${v.move}</a></td>
          <td>
            ${raw.move?.type?.name ? typeBadgeLink(raw.move.type.name, v.type) : orMissing(null)}
          </td>
          <td>${v.category}</td>
          <td>${orMissing(v.power)}</td>
          <td>${orMissing(v.accuracy)}</td>
          <td>${orMissing(v.pp)}</td>
        </tr>`,
      )}
    </tbody>
  </table>`;
}

function evolutionNode(node) {
  const name = node.species.name;
  const children = node.evolves_to ?? [];
  return html`<li>
    <a href="/pokemon/${name}">${humanize(name)}</a>
    ${children.length ? html`<ul>${children.map(evolutionNode)}</ul>` : ''}
  </li>`;
}

export async function pokemonPage(c) {
  const name = c.req.param('name');
  const data = await getSpeciesAndPokemon(name);
  if (!data) return null;
  const { species, pokemon } = data;

  const speciesName = species.name;
  const displayName = englishName(species) ?? humanize(speciesName);
  const genus = species.genera?.find((g) => g.language?.name === 'en')?.genus ?? null;
  const flavor = latestEnglishFlavorText(species);

  const [typeNames, versionGroups, chain] = await Promise.all([
    getTypeEnglishNames(),
    getVersionGroups(pokemon),
    species.evolution_chain?.url ? getRecord('evolution-chain', idFromUrl(species.evolution_chain.url)) : null,
  ]);

  const gameNames = new Set(versionGroups.map((g) => g.name));
  let game = c.req.query('game');
  if (!gameNames.has(game)) game = versionGroups.at(-1)?.name ?? null;

  const byMethod = game ? await getMovesByMethod(pokemon, game) : new Map();

  const types = (pokemon.types ?? []).slice().sort((a, b) => a.slot - b.slot);
  const abilities = (pokemon.abilities ?? []).slice().sort((a, b) => a.slot - b.slot);
  const stats = pokemon.stats ?? [];
  const total = stats.reduce((sum, s) => sum + s.base_stat, 0);
  const artwork =
    pokemon.sprites?.other?.['official-artwork']?.front_default ?? pokemon.sprites?.front_default ?? null;

  const summary = html`<div class="panel summary">
    ${artwork ? html`<img class="artwork" src="${artwork}" alt="${displayName}" width="288" height="288" />` : ''}
    <div class="summary-info">
      <p class="dex">${dexNumber(species.id)}</p>
      <h1>${displayName}</h1>
      ${genus ? html`<p class="genus">${genus}</p>` : ''}
      <p class="types">
        ${types.map((t) => typeBadgeLink(t.type.name, typeNames.get(t.type.name) ?? humanize(t.type.name)))}
      </p>
      <dl class="facts">
        <div><dt>Height</dt><dd>${(pokemon.height / 10).toFixed(1)} m</dd></div>
        <div><dt>Weight</dt><dd>${(pokemon.weight / 10).toFixed(1)} kg</dd></div>
      </dl>
    </div>
    ${flavor ? html`<p class="flavor">${flavor}</p>` : ''}
  </div>`;

  const statsSection = section(
    'stats',
    'Base stats',
    html`<table class="stats">
      <tbody>
        ${stats.map(
          (s) => html`<tr>
            <th scope="row">${STAT_LABELS[s.stat.name] ?? humanize(s.stat.name)}</th>
            <td class="num">${s.base_stat}</td>
            <td class="barcell">
              <div class="bar"><span style="width: ${Math.min(100, (s.base_stat / 180) * 100)}%"></span></div>
            </td>
          </tr>`,
        )}
        <tr class="total">
          <th scope="row">Total</th>
          <td class="num">${total}</td>
          <td class="barcell">
            <div class="bar"><span style="width: ${Math.min(100, (total / 720) * 100)}%"></span></div>
          </td>
        </tr>
      </tbody>
    </table>`,
  );

  const abilitiesSection = section(
    'abilities',
    'Abilities',
    html`<ul>
      ${abilities.map(
        (a) => html`<li>
          <a href="/abilities/${a.ability.name}">${humanize(a.ability.name)}</a>${a.is_hidden ? ' (hidden)' : ''}
        </li>`,
      )}
    </ul>`,
  );

  const evolutionSection = section(
    'evolution',
    'Evolution',
    chain?.chain ? html`<ul class="evolution">${evolutionNode(chain.chain)}</ul>` : html`<p>—</p>`,
  );

  const movesSection = section(
    'moves',
    'Moves',
    html`<div class="field game-field">
        <label for="game">Game</label>
        <select
          id="game"
          name="game"
          hx-get="/pokemon/${speciesName}"
          hx-trigger="change"
          hx-target="#moves-tables"
          hx-select="#moves-tables"
          hx-swap="outerHTML"
          hx-push-url="true"
        >
          ${versionGroups.map(
            (g) =>
              html`<option value="${g.name}" ${g.name === game ? raw('selected') : ''}>${humanize(g.name)}</option>`,
          )}
        </select>
      </div>
      <div id="moves-tables">
        ${orderedMethods(byMethod).map((method) =>
          moveTableView({ speciesName, game, method, rows: byMethod.get(method), sort: null, dir: 'asc', typeNames }),
        )}
      </div>`,
    { id: 'moves' },
  );

  return c.html(
    layout({
      title: `${displayName} – Pokédex`,
      main: html`${summary} ${statsSection} ${abilitiesSection} ${evolutionSection} ${movesSection}`,
    }),
  );
}

// htmx partial: one sortable moves table.
export async function moveTablePartial(c) {
  const name = c.req.param('name');
  const data = await getSpeciesAndPokemon(name);
  if (!data) return null;
  const { pokemon } = data;
  const speciesName = data.species.name;

  const versionGroups = await getVersionGroups(pokemon);
  const gameNames = new Set(versionGroups.map((g) => g.name));
  let game = c.req.query('game');
  if (!gameNames.has(game)) game = versionGroups.at(-1)?.name ?? null;
  if (!game) return null;

  const method = c.req.query('method') ?? '';
  const byMethod = await getMovesByMethod(pokemon, game);
  if (!byMethod.has(method)) return null;

  const sort = COLUMNS.some((col) => col.key === c.req.query('sort')) ? c.req.query('sort') : null;
  const dir = c.req.query('dir') === 'desc' ? 'desc' : 'asc';
  const typeNames = await getTypeEnglishNames();

  return c.html(
    moveTableView({ speciesName, game, method, rows: byMethod.get(method), sort, dir, typeNames }),
  );
}
