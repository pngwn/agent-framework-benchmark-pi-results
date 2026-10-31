import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { api, apiPath, idFromUrl, warm, mapLimit, cardsForPokemonRefs } from './api.js';
import {
  humanize,
  dexNumber,
  enName,
  enGenus,
  latestEnFlavor,
  enShortEffect,
  missing,
  escapeHtml,
} from '../shared/format.js';
import { cardGridHtml } from '../shared/cards.js';
import { resultsHtml } from '../shared/home.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// ---------------------------------------------------------------------------
// Shared chrome

let assets = null;
function getAssets() {
  assets ??= (() => {
    const dir = path.join(ROOT, 'dist', 'assets');
    const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
    return {
      js: files.find((f) => f.endsWith('.js')) ?? 'client.js',
      css: files.find((f) => f.endsWith('.css')) ?? 'styles.css',
    };
  })();
  return assets;
}

function layout({ h1, title, page, main }) {
  const { js, css } = getAssets();
  const fullTitle = title ?? `${h1} – Pokédex`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(fullTitle)}</title>
<link rel="stylesheet" href="/assets/${escapeHtml(css)}">
<script type="module" src="/assets/${escapeHtml(js)}"></script>
</head>
<body data-page="${escapeHtml(page)}">
<header class="site-header">
  <div class="site-header-inner">
    <a class="site-brand" href="/">Pokédex</a>
    <nav class="site-nav" aria-label="Main">
      <a href="/">Pokémon</a>
      <a href="/types">Types</a>
    </nav>
  </div>
</header>
<main class="container">
${main}
</main>
<footer class="site-footer">
  <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
</footer>
</body>
</html>`;
}

const page_ = (status, html) => ({ status, html });

function notFoundPage() {
  return page_(
    404,
    layout({
      h1: 'Not found',
      page: 'not-found',
      main: `<h1 class="page-title">Not found</h1>
<p><a href="/">Back to the Pokédex</a></p>`,
    }),
  );
}

// The 18 types: everything except stellar, unknown and shadow.
const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

const section = (id, heading, inner) =>
  `<section class="panel" aria-labelledby="${id}-heading">\n<h2 id="${id}-heading">${heading}</h2>\n${inner}\n</section>`;

const typeBadge = (typeNames, name) =>
  `<a class="type-badge" style="--type-color: var(--type-${escapeHtml(name)})" href="/types/${escapeHtml(name)}">${escapeHtml(
    typeNames[name] ?? humanize(name),
  )}</a>`;

// ---------------------------------------------------------------------------
// Home

async function homePage(url) {
  const { species, generations, types } = await warm();

  const generationOf = new Map();
  for (const gen of generations) for (const sp of gen.pokemon_species) generationOf.set(sp.name, gen.name);

  const typeNames = {};
  for (const t of types) typeNames[t.name] = enName(t);

  const speciesData = await mapLimit(species, 48, async (s) => {
    const mon = await api(`/pokemon/${s.id}/`);
    return {
      id: s.id,
      name: s.name,
      sprite: mon?.sprites?.front_default ?? null,
      types: (mon?.types ?? []).slice().sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
      generation: generationOf.get(s.name) ?? '',
    };
  });

  const state = {
    q: url.searchParams.get('q') ?? '',
    type: url.searchParams.get('type') ?? '',
    generation: url.searchParams.get('generation') ?? '',
    page: Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '', 10) || 1),
  };

  const data = {
    species: speciesData,
    typeNames,
    types: types.filter((t) => !EXCLUDED_TYPES.has(t.name)).map((t) => ({ name: t.name, en: enName(t) })),
    generations: generations.map((g) => ({ name: g.name, en: enName(g) })),
  };

  const typeOptions = [
    `<option value="">All types</option>`,
    ...data.types.map(
      (t) =>
        `<option value="${escapeHtml(t.name)}"${state.type === t.name ? ' selected' : ''}>${escapeHtml(t.en)}</option>`,
    ),
  ].join('');
  const generationOptions = [
    `<option value="">All generations</option>`,
    ...data.generations.map(
      (g) =>
        `<option value="${escapeHtml(g.name)}"${state.generation === g.name ? ' selected' : ''}>${escapeHtml(
          g.en,
        )}</option>`,
    ),
  ].join('');

  const clientData = JSON.stringify({ species: speciesData, typeNames }).replace(/</g, '\\u003c');

  const main = `<h1 class="page-title">Pokémon</h1>
<form class="controls" id="controls" role="search" action="/" method="get">
  <div class="field">
    <label for="search">Search</label>
    <input type="search" id="search" name="q" value="${escapeHtml(state.q)}" autocomplete="off">
  </div>
  <div class="field">
    <label for="type-select">Type</label>
    <select id="type-select" name="type">${typeOptions}</select>
  </div>
  <div class="field">
    <label for="generation-select">Generation</label>
    <select id="generation-select" name="generation">${generationOptions}</select>
  </div>
</form>
<div id="results">${resultsHtml(state, data)}</div>
<script type="application/json" id="home-data">${clientData}</script>`;

  return page_(200, layout({ h1: 'Pokémon', title: 'Pokédex', page: 'home', main }));
}

// ---------------------------------------------------------------------------
// Pokémon

const STAT_LABELS = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

function evolutionListHtml(node) {
  const children = (node.evolves_to ?? []).map(evolutionListHtml).join('');
  return `<li><a href="/pokemon/${escapeHtml(node.species.name)}">${escapeHtml(
    humanize(node.species.name),
  )}</a>${children ? `<ul>${children}</ul>` : ''}</li>`;
}

function movesTableHtml(method, rows) {
  const isLevelUp = method === 'level-up';
  const headers = [
    ...(isLevelUp ? [['Level', 'num']] : []),
    ['Move', 'text'],
    ['Type', 'text'],
    ['Category', 'text'],
    ['Power', 'num'],
    ['Accuracy', 'num'],
    ['PP', 'num'],
  ]
    .map(
      ([label, type]) =>
        `<th scope="col" data-sort-type="${type}"><button type="button">${label}</button></th>`,
    )
    .join('');
  const body = rows
    .map(
      (r) =>
        `<tr>${isLevelUp ? `<td>${r.level}</td>` : ''}<td><a href="/moves/${escapeHtml(r.name)}">${escapeHtml(
          r.en,
        )}</a></td><td>${r.typeBadge}</td><td>${escapeHtml(r.category)}</td><td>${missing(r.power)}</td><td>${missing(
          r.accuracy,
        )}</td><td>${missing(r.pp)}</td></tr>`,
    )
    .join('');
  return `<div class="table-wrap"><table class="moves-table">
<caption>${escapeHtml(humanize(method))}</caption>
<thead><tr>${headers}</tr></thead>
<tbody>${body}</tbody>
</table></div>`;
}

async function pokemonPage(url, name) {
  const species = await api(`/pokemon-species/${encodeURIComponent(name)}/`);
  if (!species) return notFoundPage();

  const { types, versionGroups } = await warm();
  const typeNames = {};
  for (const t of types) typeNames[t.name] = enName(t);
  const versionGroupOrder = new Map(versionGroups.map((vg) => [vg.name, vg.order]));

  const defaultVariety = species.varieties.find((v) => v.is_default) ?? species.varieties[0];
  const mon = await api(apiPath(defaultVariety.pokemon.url));
  if (!mon) return notFoundPage();

  const englishName = enName(species);
  const genus = enGenus(species);
  const flavor = latestEnFlavor(species.flavor_text_entries) ?? '—';

  // Summary
  const artwork =
    mon.sprites?.other?.['official-artwork']?.front_default ?? mon.sprites?.front_default ?? null;
  const heroTypes = (mon.types ?? [])
    .slice()
    .sort((a, b) => a.slot - b.slot)
    .map((t) => typeBadge(typeNames, t.type.name))
    .join('');
  const hero = `<div class="panel hero">
${
  artwork
    ? `<img class="hero-artwork" src="${escapeHtml(artwork)}" alt="${escapeHtml(englishName)}" width="288" height="288">`
    : ''
}
<div class="hero-info">
  <p class="hero-dex">${dexNumber(species.id)}</p>
  <h1>${escapeHtml(englishName)}</h1>
  <p class="hero-genus">${escapeHtml(genus)}</p>
  <p class="hero-types">${heroTypes}</p>
  <dl class="facts">
    <div><dt>Height</dt><dd>${(mon.height / 10).toFixed(1)} m</dd></div>
    <div><dt>Weight</dt><dd>${(mon.weight / 10).toFixed(1)} kg</dd></div>
  </dl>
  <p class="hero-flavor">${escapeHtml(flavor)}</p>
</div>
</div>`;

  // Base stats
  const statsRows = mon.stats
    .map((s) => {
      const label = STAT_LABELS[s.stat.name] ?? humanize(s.stat.name);
      const pct = Math.min(100, Math.round((s.base_stat / 255) * 100));
      return `<tr><th scope="row">${escapeHtml(label)}</th><td class="stat-num">${s.base_stat}</td><td class="stat-bar"><span class="stat-track" aria-hidden="true"><span class="stat-fill" style="width: ${pct}%"></span></span></td></tr>`;
    })
    .join('');
  const total = mon.stats.reduce((sum, s) => sum + s.base_stat, 0);
  const totalPct = Math.min(100, Math.round((total / (mon.stats.length * 255)) * 100));
  const stats = section(
    'base-stats',
    'Base stats',
    `<div class="table-wrap"><table class="stats-table">
<tbody>${statsRows}<tr><th scope="row">Total</th><td class="stat-num">${total}</td><td class="stat-bar"><span class="stat-track" aria-hidden="true"><span class="stat-fill" style="width: ${totalPct}%"></span></span></td></tr></tbody>
</table></div>`,
  );

  // Abilities
  const abilities = (mon.abilities ?? [])
    .slice()
    .sort((a, b) => a.slot - b.slot)
    .map(
      (a) =>
        `<li><a href="/abilities/${escapeHtml(a.ability.name)}">${escapeHtml(humanize(a.ability.name))}</a>${
          a.is_hidden ? ' <span class="hidden-note">(hidden)</span>' : ''
        }</li>`,
    )
    .join('');
  const abilitiesSection = section('abilities', 'Abilities', `<ul class="link-list">${abilities}</ul>`);

  // Evolution
  let evolutionSection = '';
  if (species.evolution_chain?.url) {
    const chain = await api(apiPath(species.evolution_chain.url));
    if (chain) {
      evolutionSection = section(
        'evolution',
        'Evolution',
        `<ul class="link-list evolution">${evolutionListHtml(chain.chain)}</ul>`,
      );
    }
  }

  // Moves
  const gameNames = new Set();
  for (const m of mon.moves ?? []) for (const d of m.version_group_details) gameNames.add(d.version_group.name);
  const games = [...gameNames].sort(
    (a, b) => (versionGroupOrder.get(a) ?? Infinity) - (versionGroupOrder.get(b) ?? Infinity),
  );
  const requested = url.searchParams.get('game');
  const selected = requested && games.includes(requested) ? requested : games[games.length - 1];

  let movesInner = '';
  if (games.length) {
    const options = games
      .map(
        (g) =>
          `<option value="${escapeHtml(g)}"${g === selected ? ' selected' : ''}>${escapeHtml(humanize(g))}</option>`,
      )
      .join('');
    movesInner += `<div class="game-field"><label for="game-select">Game</label><select id="game-select" name="game">${options}</select></div>`;

    // Group moves by learn method for the selected version group.
    const byMethod = new Map();
    for (const m of mon.moves) {
      for (const d of m.version_group_details) {
        if (d.version_group.name !== selected) continue;
        const method = d.move_learn_method.name;
        if (!byMethod.has(method)) byMethod.set(method, new Map());
        const entries = byMethod.get(method);
        const existing = entries.get(m.move.name);
        if (!existing || d.level_learned_at < existing.level) {
          entries.set(m.move.name, { level: d.level_learned_at, name: m.move.name });
        }
      }
    }

    const moveNames = [...new Set([...byMethod.values()].flatMap((entries) => [...entries.keys()]))];
    const moveRecords = new Map(await mapLimit(moveNames, 32, async (n) => [n, await api(`/move/${n}/`)]));

    const methods = [...byMethod.keys()].sort((a, b) => {
      const rank = (m) => {
        const i = METHOD_ORDER.indexOf(m);
        return i === -1 ? METHOD_ORDER.length : i;
      };
      return rank(a) - rank(b) || humanize(a).localeCompare(humanize(b));
    });

    for (const method of methods) {
      const rows = [...byMethod.get(method).values()].map((entry) => {
        const rec = moveRecords.get(entry.name);
        return {
          level: entry.level,
          name: entry.name,
          en: rec ? enName(rec) : humanize(entry.name),
          typeBadge: rec?.type?.name
            ? typeBadge(typeNames, rec.type.name)
            : escapeHtml(missing(null)),
          category: rec?.damage_class?.name ? humanize(rec.damage_class.name) : '—',
          power: rec?.power ?? null,
          accuracy: rec?.accuracy ?? null,
          pp: rec?.pp ?? null,
        };
      });
      rows.sort((a, b) => {
        if (method === 'level-up' && a.level !== b.level) return a.level - b.level;
        return a.en.localeCompare(b.en);
      });
      movesInner += movesTableHtml(method, rows);
    }
  }
  const movesSection = `<section class="panel" id="moves" aria-labelledby="moves-heading">
<h2 id="moves-heading">Moves</h2>
${movesInner}
</section>`;

  const main = [hero, stats, abilitiesSection, evolutionSection, movesSection].filter(Boolean).join('\n');
  return page_(200, layout({ h1: englishName, page: 'pokemon', main }));
}

// ---------------------------------------------------------------------------
// Move

async function movePage(url, name) {
  const move = await api(`/move/${encodeURIComponent(name)}/`);
  if (!move) return notFoundPage();
  const { types } = await warm();
  const typeNames = {};
  for (const t of types) typeNames[t.name] = enName(t);

  const englishName = enName(move);
  const facts = `<div class="panel"><dl class="facts">
  <div><dt>Type</dt><dd>${move.type?.name ? typeBadge(typeNames, move.type.name) : '—'}</dd></div>
  <div><dt>Category</dt><dd>${move.damage_class?.name ? escapeHtml(humanize(move.damage_class.name)) : '—'}</dd></div>
  <div><dt>Power</dt><dd>${missing(move.power)}</dd></div>
  <div><dt>Accuracy</dt><dd>${missing(move.accuracy)}</dd></div>
  <div><dt>PP</dt><dd>${missing(move.pp)}</dd></div>
</dl></div>`;

  const effect = enShortEffect(move.effect_entries) ?? latestEnFlavor(move.flavor_text_entries) ?? '—';
  const effectSection = section('effect', 'Effect', `<p>${escapeHtml(effect)}</p>`);

  const cards = await cardsForPokemonRefs(move.learned_by_pokemon ?? []);
  const learnedSection = section(
    'learned-by',
    'Learned by',
    `<p class="result-count">${cards.length} Pokémon</p>\n${cardGridHtml(cards)}`,
  );

  const main = `<h1 class="page-title">${escapeHtml(englishName)}</h1>\n${[facts, effectSection, learnedSection].join('\n')}`;
  return page_(200, layout({ h1: englishName, page: 'move', main }));
}

// ---------------------------------------------------------------------------
// Ability

async function abilityPage(url, name) {
  const ability = await api(`/ability/${encodeURIComponent(name)}/`);
  if (!ability) return notFoundPage();

  const englishName = enName(ability);
  const effect = enShortEffect(ability.effect_entries) ?? '—';
  const effectSection = section('effect', 'Effect', `<p>${escapeHtml(effect)}</p>`);

  const refs = (ability.pokemon ?? []).map((entry) => ({
    pokemon: entry.pokemon,
    extra: entry.is_hidden ? '<span class="card-extra">Hidden ability</span>' : '',
  }));
  const cards = await cardsForPokemonRefs(refs);
  const pokemonSection = section(
    'pokemon',
    'Pokémon',
    `<p class="result-count">${cards.length} Pokémon</p>\n${cardGridHtml(cards)}`,
  );

  const main = `<h1 class="page-title">${escapeHtml(englishName)}</h1>\n${[effectSection, pokemonSection].join('\n')}`;
  return page_(200, layout({ h1: englishName, page: 'ability', main }));
}

// ---------------------------------------------------------------------------
// Types

async function typeListPage() {
  const { types } = await warm();
  const pills = types
    .filter((t) => !EXCLUDED_TYPES.has(t.name))
    .map(
      (t) =>
        `<li><a style="--type-color: var(--type-${escapeHtml(t.name)})" href="/types/${escapeHtml(t.name)}">${escapeHtml(
          enName(t),
        )}</a></li>`,
    )
    .join('');
  const main = `<h1 class="page-title">Types</h1>\n<ul class="type-pills">${pills}</ul>`;
  return page_(200, layout({ h1: 'Types', page: 'types', main }));
}

const RELATIONS = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from'],
];

async function typePage(url, name) {
  const type = await api(`/type/${encodeURIComponent(name)}/`);
  if (!type || EXCLUDED_TYPES.has(type.name)) return notFoundPage();
  const { types } = await warm();
  const typeNames = {};
  for (const t of types) typeNames[t.name] = enName(t);

  const englishName = enName(type);
  const relations = RELATIONS.map(([label, key]) => {
    const related = type.damage_relations?.[key] ?? [];
    const dd = related.length
      ? related.map((r) => typeBadge(typeNames, r.name)).join('')
      : 'None';
    return `<div><dt>${label}</dt><dd>${dd}</dd></div>`;
  }).join('\n');
  const relationsSection = section('damage-relations', 'Damage relations', `<dl class="relations">\n${relations}\n</dl>`);

  const cards = await cardsForPokemonRefs(type.pokemon ?? []);
  const pokemonSection = section(
    'pokemon',
    'Pokémon',
    `<p class="result-count">${cards.length} Pokémon</p>\n${cardGridHtml(cards)}`,
  );

  const moves = (type.moves ?? [])
    .map((m) => ({ name: m.name, en: humanize(m.name) }))
    .sort((a, b) => a.en.localeCompare(b.en));
  const moveItems = moves
    .map((m) => `<li><a href="/moves/${escapeHtml(m.name)}">${escapeHtml(m.en)}</a></li>`)
    .join('');
  const movesSection = section(
    'moves',
    'Moves',
    `<p class="result-count">${moves.length} moves</p>\n<ul class="move-list">${moveItems}</ul>`,
  );

  const main = `<h1 class="page-title">${escapeHtml(englishName)}</h1>\n${[relationsSection, pokemonSection, movesSection].join('\n')}`;
  return page_(200, layout({ h1: englishName, page: 'type', main }));
}

// ---------------------------------------------------------------------------
// Router

export async function renderPage(url) {
  const path = url.pathname.replace(/\/+$/, '') || '/';
  let match;
  if (path === '/') return homePage(url);
  if ((match = path.match(/^\/pokemon\/([^/]+)$/))) return pokemonPage(url, decodeURIComponent(match[1]));
  if ((match = path.match(/^\/moves\/([^/]+)$/))) return movePage(url, decodeURIComponent(match[1]));
  if ((match = path.match(/^\/abilities\/([^/]+)$/))) return abilityPage(url, decodeURIComponent(match[1]));
  if (path === '/types') return typeListPage();
  if ((match = path.match(/^\/types\/([^/]+)$/))) return typePage(url, decodeURIComponent(match[1]));
  return notFoundPage();
}
