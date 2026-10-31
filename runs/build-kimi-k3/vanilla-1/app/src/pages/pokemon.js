import {
  escapeHtml, humanize, dexNumber, idFromUrl, englishName,
  latestEnglishFlavor, showValue,
} from '../shared/format.js';
import { api, globals } from '../api.js';

const STAT_LABELS = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

function methodCompare(a, b) {
  const ia = METHOD_ORDER.indexOf(a);
  const ib = METHOD_ORDER.indexOf(b);
  if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  return humanize(a).localeCompare(humanize(b));
}

function evolutionListHtml(chain) {
  const items = (chain.evolves_to ?? [])
    .map((next) => evolutionListHtml(next))
    .join('');
  return (
    `<li><a href="/pokemon/${escapeHtml(chain.species.name)}">${escapeHtml(humanize(chain.species.name))}</a>` +
    (items ? `<ul>${items}</ul>` : '') +
    `</li>`
  );
}

const numOrNull = (v) => (v === null || v === undefined ? null : Number(v));

function sortableTh(label, type) {
  return `<th scope="col" data-sort-type="${type}"><button type="button" class="sort-button">${escapeHtml(label)}</button></th>`;
}

function moveTableHtml(method, rows, typeEn) {
  const isLevelUp = method === 'level-up';
  const header =
    `<tr>` +
    (isLevelUp ? sortableTh('Level', 'num') : '') +
    sortableTh('Move', 'text') + sortableTh('Type', 'text') + sortableTh('Category', 'text') +
    sortableTh('Power', 'num') + sortableTh('Accuracy', 'num') + sortableTh('PP', 'num') +
    `</tr>`;
  const body = rows
    .map(
      (r) =>
        `<tr>` +
        (isLevelUp ? `<td>${r.level}</td>` : '') +
        `<td><a href="/moves/${escapeHtml(r.name)}">${escapeHtml(r.en)}</a></td>` +
        `<td><a href="/types/${escapeHtml(r.type)}"><span class="type-badge type-${escapeHtml(r.type)}">${escapeHtml(typeEn[r.type] ?? humanize(r.type))}</span></a></td>` +
        `<td>${escapeHtml(humanize(r.category))}</td>` +
        `<td>${showValue(r.power)}</td>` +
        `<td>${showValue(r.accuracy)}</td>` +
        `<td>${showValue(r.pp)}</td>` +
        `</tr>`,
    )
    .join('');
  return (
    `<table class="move-table" data-sortable>` +
    `<caption>${escapeHtml(humanize(method))}</caption>` +
    `<thead>${header}</thead><tbody>${body}</tbody></table>`
  );
}

export async function pokemonPage(name, searchParams) {
  const species = await api(`/pokemon-species/${encodeURIComponent(name)}`);
  if (!species) return null;
  const g = await globals();

  const defaultVariety = (species.varieties ?? []).find((v) => v.is_default) ?? species.varieties?.[0];
  const pokemon = defaultVariety ? await api(`/pokemon/${idFromUrl(defaultVariety.pokemon.url)}`) : null;
  if (!pokemon) return null;

  const en = englishName(species, species.name);
  const genus = species.genera?.find((x) => x.language?.name === 'en')?.genus ?? '';
  const flavor = latestEnglishFlavor(species.flavor_text_entries);

  // Evolution chain
  const chain = species.evolution_chain?.url ? await api(species.evolution_chain.url) : null;

  // Base stats
  const stats = (pokemon.stats ?? []).map((s) => ({
    label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
    value: s.base_stat,
  }));
  const total = stats.reduce((sum, s) => sum + s.value, 0);
  const statRow = (label, value, max) =>
    `<tr><th scope="row">${escapeHtml(label)}</th><td class="stat-value">${value}</td>` +
    `<td class="stat-bar-cell"><span class="stat-track"><span class="stat-bar" style="width:${Math.min(100, (value / max) * 100)}%"></span></span></td></tr>`;
  const statsTable =
    `<table class="stats-table"><tbody>` +
    stats.map((s) => statRow(s.label, s.value, 255)).join('') +
    statRow('Total', total, 720) +
    `</tbody></table>`;

  // Abilities in slot order
  const abilities = [...(pokemon.abilities ?? [])].sort((a, b) => a.slot - b.slot);
  const abilitiesList =
    `<ul class="ability-list">` +
    abilities
      .map(
        (a) =>
          `<li><a href="/abilities/${escapeHtml(a.ability.name)}">${escapeHtml(humanize(a.ability.name))}</a>` +
          (a.is_hidden ? ` (hidden)` : '') +
          `</li>`,
      )
      .join('') +
    `</ul>`;

  // ---- Moves section ----
  const vgNames = new Set();
  for (const m of pokemon.moves ?? []) {
    for (const vgd of m.version_group_details ?? []) vgNames.add(vgd.version_group.name);
  }
  const versionGroups = [...vgNames].sort(
    (a, b) => (g.versionGroupOrder.get(a) ?? 0) - (g.versionGroupOrder.get(b) ?? 0),
  );
  const requested = searchParams.get('game');
  const game = requested && vgNames.has(requested) ? requested : versionGroups[versionGroups.length - 1];

  let movesHtml = '';
  if (game) {
    // method -> Map(move name -> lowest level)
    const byMethod = new Map();
    for (const m of pokemon.moves ?? []) {
      for (const vgd of m.version_group_details ?? []) {
        if (vgd.version_group.name !== game) continue;
        const method = vgd.move_learn_method.name;
        if (!byMethod.has(method)) byMethod.set(method, new Map());
        const moves = byMethod.get(method);
        const level = vgd.level_learned_at;
        if (!moves.has(m.move.name) || level < moves.get(m.move.name)) moves.set(m.move.name, level);
      }
    }
    const moveNames = new Set();
    for (const moves of byMethod.values()) for (const n of moves.keys()) moveNames.add(n);
    const moveRecords = new Map(
      (await Promise.all([...moveNames].map(async (n) => [n, await api(`/move/${encodeURIComponent(n)}`)]))).filter(([, r]) => r),
    );

    const tables = [...byMethod.keys()].sort(methodCompare).map((method) => {
      const rows = [...byMethod.get(method).entries()].map(([moveName, level]) => {
        const rec = moveRecords.get(moveName);
        return {
          name: moveName,
          en: rec ? englishName(rec, moveName) : humanize(moveName),
          type: rec?.type?.name ?? '',
          category: rec?.damage_class?.name ?? '',
          power: numOrNull(rec?.power),
          accuracy: numOrNull(rec?.accuracy),
          pp: numOrNull(rec?.pp),
          level,
        };
      });
      rows.sort((a, b) =>
        method === 'level-up'
          ? a.level - b.level || a.en.localeCompare(b.en)
          : a.en.localeCompare(b.en),
      );
      return moveTableHtml(method, rows, g.typeEn);
    });

    const options = versionGroups
      .map(
        (vg) =>
          `<option value="${escapeHtml(vg)}"${vg === game ? ' selected' : ''}>${escapeHtml(humanize(vg))}</option>`,
      )
      .join('');
    movesHtml =
      `<div class="control control-game"><label for="game-select">Game</label>` +
      `<select id="game-select" data-pokemon="${escapeHtml(species.name)}">${options}</select></div>` +
      tables.join('');
  }

  // Types shown near the top as links.
  const types = [...(pokemon.types ?? [])].sort((a, b) => a.slot - b.slot);
  const typeLinks = types
    .map(
      (t) =>
        `<a href="/types/${escapeHtml(t.type.name)}"><span class="type-badge type-${escapeHtml(t.type.name)}">${escapeHtml(g.typeEn[t.type.name] ?? humanize(t.type.name))}</span></a>`,
    )
    .join(' ');

  const artwork =
    pokemon.sprites?.other?.['official-artwork']?.front_default ?? pokemon.sprites?.front_default ?? '';

  const body = `
<div class="pokemon-summary panel">
  <div class="artwork-card">
    ${artwork ? `<img class="artwork" src="${escapeHtml(artwork)}" alt="${escapeHtml(en)}" width="288" height="288">` : ''}
  </div>
  <div class="summary-main">
    <p class="dex-number">${dexNumber(species.id)}</p>
    <h1>${escapeHtml(en)}</h1>
    ${genus ? `<p class="genus">${escapeHtml(genus)}</p>` : ''}
    <p class="type-links">${typeLinks}</p>
    <dl class="facts">
      <div class="fact"><dt>Height</dt><dd>${(pokemon.height / 10).toFixed(1)} m</dd></div>
      <div class="fact"><dt>Weight</dt><dd>${(pokemon.weight / 10).toFixed(1)} kg</dd></div>
    </dl>
    ${flavor ? `<p class="flavor">${escapeHtml(flavor)}</p>` : ''}
  </div>
</div>

<section class="panel" aria-labelledby="stats-heading">
  <h2 id="stats-heading">Base stats</h2>
  ${statsTable}
</section>

<section class="panel" aria-labelledby="abilities-heading">
  <h2 id="abilities-heading">Abilities</h2>
  ${abilitiesList}
</section>

<section class="panel" aria-labelledby="evolution-heading">
  <h2 id="evolution-heading">Evolution</h2>
  ${chain ? `<ul class="evolution-list">${evolutionListHtml(chain.chain)}</ul>` : ''}
</section>

<section class="panel" id="moves" aria-labelledby="moves-heading">
  <h2 id="moves-heading">Moves</h2>
  ${movesHtml}
</section>`;

  return { title: `${en} – Pokédex`, h1: en, body };
}
