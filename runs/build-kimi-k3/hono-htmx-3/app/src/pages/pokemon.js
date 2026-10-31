import { html } from 'hono/html';
import { fetchJson, getIndex, idFromUrl, mapLimit } from '../api.js';
import { dexNo, enName, humanize, lastEnFlavor, MISSING, showNum } from '../util.js';
import { layout, titleFor, typeBadge } from '../views.js';

const STAT_LABELS = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

function evolutionNode(node) {
  return html`<li><a href="/pokemon/${node.species.name}">${humanize(node.species.name)}</a>${
    node.evolves_to.length ? html`<ul>${node.evolves_to.map(evolutionNode)}</ul>` : ''
  }</li>`;
}

function statRow(label, value, max) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return html`<tr>
    <th scope="row">${label}</th>
    <td class="num">${value}</td>
    <td class="bar-cell"><div class="bar"><span style="width: ${pct}%"></span></div></td>
  </tr>`;
}

const sortableTh = (label, cls) =>
  html`<th scope="col"${cls ? html` class="${cls}"` : ''}><button type="button" data-sort>${label}</button></th>`;

function moveTable(method, rows, typeDisplay) {
  const isLevelUp = method === 'level-up';
  return html`<table class="moves-table">
  <caption>${humanize(method)}</caption>
  <thead><tr>
    ${isLevelUp ? sortableTh('Level', 'col-left') : ''}
    ${sortableTh('Move', 'col-left')}${sortableTh('Type')}${sortableTh('Category')}
    ${sortableTh('Power')}${sortableTh('Accuracy')}${sortableTh('PP')}
  </tr></thead>
  <tbody>
    ${rows.map(
      (r) => html`<tr>
      ${isLevelUp ? html`<td class="col-left" data-v="${r.level}">${r.level}</td>` : ''}
      <td class="col-left" data-v="${r.en}"><a href="/moves/${r.name}">${r.en}</a></td>
      <td data-v="${r.typeLabel}">${typeBadge(r.type, r.typeLabel)}</td>
      <td data-v="${r.category}">${r.category}</td>
      <td data-v="${r.power ?? ''}">${showNum(r.power)}</td>
      <td data-v="${r.accuracy ?? ''}">${showNum(r.accuracy)}</td>
      <td data-v="${r.pp ?? ''}">${showNum(r.pp)}</td>
    </tr>`,
    )}
  </tbody>
</table>`;
}

export async function pokemonPage(c, name) {
  const species = await fetchJson(`/pokemon-species/${encodeURIComponent(name.toLowerCase())}/`);
  if (!species) return null;
  const index = await getIndex();

  const variety = species.varieties.find((v) => v.is_default) ?? species.varieties[0];
  const pokemon = await fetchJson(`/pokemon/${variety.pokemon.name}/`);
  if (!pokemon) return null;
  const chain = species.evolution_chain?.url
    ? await fetchJson(`/evolution-chain/${idFromUrl(species.evolution_chain.url)}/`)
    : null;

  const displayName = enName(species.names) ?? humanize(species.name);
  const genus = (species.genera ?? []).find((g) => g.language.name === 'en')?.genus ?? '';
  const flavor = lastEnFlavor(species.flavor_text_entries);
  const artwork =
    pokemon.sprites?.other?.['official-artwork']?.front_default ??
    pokemon.sprites?.front_default ??
    null;

  // ---- Moves ----
  // Group learn data: version group -> learn method -> rows.
  const byVersionGroup = new Map();
  for (const m of pokemon.moves ?? []) {
    for (const d of m.version_group_details ?? []) {
      const vg = d.version_group.name;
      const method = d.move_learn_method.name;
      if (!byVersionGroup.has(vg)) byVersionGroup.set(vg, new Map());
      const methods = byVersionGroup.get(vg);
      if (!methods.has(method)) methods.set(method, []);
      methods.get(method).push({ name: m.move.name, level: d.level_learned_at });
    }
  }

  const vgResources = await mapLimit([...byVersionGroup.keys()], 10, (vg) =>
    fetchJson(`/version-group/${vg}/`),
  );
  const vgs = [...byVersionGroup.keys()]
    .map((vg, i) => ({ name: vg, order: vgResources[i]?.order ?? 0 }))
    .sort((a, b) => a.order - b.order);

  let selected = c.req.query('game') ?? '';
  if (!byVersionGroup.has(selected)) selected = vgs.length ? vgs[vgs.length - 1].name : '';

  const methods = byVersionGroup.get(selected) ?? new Map();
  const methodNames = [...methods.keys()].sort((a, b) => {
    const ia = METHOD_ORDER.indexOf(a);
    const ib = METHOD_ORDER.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    return humanize(a).localeCompare(humanize(b));
  });

  const moveNames = [...new Set(methodNames.flatMap((m) => methods.get(m).map((r) => r.name)))];
  const moveResources = await mapLimit(moveNames, 20, (n) => fetchJson(`/move/${n}/`));
  const moveByName = new Map(moveNames.map((n, i) => [n, moveResources[i]]));

  const tables = methodNames.map((method) => {
    const seen = new Set();
    const rows = [];
    for (const r of methods.get(method)) {
      const key = `${r.name}:${method === 'level-up' ? r.level : ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const move = moveByName.get(r.name);
      rows.push({
        name: r.name,
        level: r.level,
        en: enName(move?.names) ?? humanize(r.name),
        type: move?.type?.name ?? '',
        typeLabel: index.typeDisplay.get(move?.type?.name) ?? humanize(move?.type?.name ?? ''),
        category: humanize(move?.damage_class?.name ?? ''),
        power: move?.power ?? null,
        accuracy: move?.accuracy ?? null,
        pp: move?.pp ?? null,
      });
    }
    rows.sort((a, b) =>
      method === 'level-up' ? a.level - b.level || a.en.localeCompare(b.en) : a.en.localeCompare(b.en),
    );
    return moveTable(method, rows, index.typeDisplay);
  });

  const stats = pokemon.stats ?? [];
  const total = stats.reduce((sum, s) => sum + s.base_stat, 0);

  const content = html`<div class="summary">
  <figure class="artwork">
    ${artwork ? html`<img src="${artwork}" alt="${displayName}" width="288" height="288">` : ''}
  </figure>
  <div class="summary-info">
    <p class="dex">${dexNo(species.id)}</p>
    <h1>${displayName}</h1>
    <p class="genus">${genus}</p>
    <p class="badges">${(pokemon.types ?? [])
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((t) => typeBadge(t.type.name, index.typeDisplay.get(t.type.name) ?? humanize(t.type.name)))}</p>
    <dl class="facts">
      <div><dt>Height</dt><dd>${(pokemon.height / 10).toFixed(1)} m</dd></div>
      <div><dt>Weight</dt><dd>${(pokemon.weight / 10).toFixed(1)} kg</dd></div>
    </dl>
    ${flavor ? html`<p class="flavor">${flavor}</p>` : ''}
  </div>
</div>

<section class="panel" aria-labelledby="stats-heading">
  <h2 id="stats-heading">Base stats</h2>
  <table class="stats">
    <tbody>
      ${stats.map((s) => statRow(STAT_LABELS[s.stat.name] ?? humanize(s.stat.name), s.base_stat, 255))}
      ${statRow('Total', total, 255 * Math.max(1, stats.length))}
    </tbody>
  </table>
</section>

<section class="panel" aria-labelledby="abilities-heading">
  <h2 id="abilities-heading">Abilities</h2>
  <ul class="plain-list">
    ${(pokemon.abilities ?? [])
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map(
        (a) => html`<li><a href="/abilities/${a.ability.name}">${humanize(a.ability.name)}</a>${a.is_hidden ? ' (hidden)' : ''}</li>`,
      )}
  </ul>
</section>

<section class="panel" aria-labelledby="evolution-heading">
  <h2 id="evolution-heading">Evolution</h2>
  ${chain ? html`<ul class="plain-list evo">${evolutionNode(chain.chain)}</ul>` : ''}
</section>

<section class="panel" id="moves" aria-labelledby="moves-heading">
  <h2 id="moves-heading">Moves</h2>
  <div class="field game-field">
    <label for="game-select">Game</label>
    <select id="game-select" data-game-select>
      ${vgs.map((vg) =>
        vg.name === selected
          ? html`<option value="${vg.name}" selected>${humanize(vg.name)}</option>`
          : html`<option value="${vg.name}">${humanize(vg.name)}</option>`,
      )}
    </select>
  </div>
  ${tables}
</section>`;

  return c.html(layout(titleFor(displayName), content));
}
