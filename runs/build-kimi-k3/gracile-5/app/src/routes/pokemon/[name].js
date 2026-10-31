import { html } from 'lit';
import { defineRoute } from '@gracile/gracile/route';
import { document } from '../../document.js';
import { apiGet, idFromUrl, mediaUrl } from '../../lib/api.js';
import { getTypes, getVersionGroups, getTypeEnglishNames } from '../../lib/data.js';
import {
  humanize,
  englishName,
  englishGenus,
  latestEnglishFlavor,
  dexNumber,
  statLabel,
  formatHeight,
  formatWeight,
} from '../../lib/format.js';
import { typeBadgeLink, notFoundTemplate, NOT_FOUND_TITLE } from '../../lib/views.js';

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];
const methodRank = (method) => {
  const index = METHOD_ORDER.indexOf(method);
  return index === -1 ? METHOD_ORDER.length : index;
};

function evolutionNode(node) {
  return html`<li>
    <a href="/pokemon/${node.species.name}">${humanize(node.species.name)}</a>
    ${node.evolves_to?.length ? html`<ul>${node.evolves_to.map(evolutionNode)}</ul>` : ''}
  </li>`;
}

function movesTable(method, rows) {
  const isLevelUp = method === 'level-up';
  const columns = isLevelUp
    ? ['Level', 'Move', 'Type', 'Category', 'Power', 'Accuracy', 'PP']
    : ['Move', 'Type', 'Category', 'Power', 'Accuracy', 'PP'];
  const numericColumns = new Set(['Level', 'Power', 'Accuracy', 'PP']);
  return html`<table class="moves-table" data-method="${method}">
    <caption>${humanize(method)}</caption>
    <thead>
      <tr>
        ${columns.map(
          (column, index) => html`<th scope="col" data-col="${index}" class="${numericColumns.has(column) ? 'num' : ''}">
            <button type="button">${column}</button>
          </th>`,
        )}
      </tr>
    </thead>
    <tbody>
      ${rows.map(
        (row) => html`<tr>
          ${isLevelUp ? html`<td class="num" data-value="${row.level}">${row.level}</td>` : ''}
          <td data-value="${row.moveEn}"><a href="/moves/${row.moveName}">${row.moveEn}</a></td>
          <td data-value="${row.typeEn}">${typeBadgeLink(row.type, row.typeEn)}</td>
          <td data-value="${row.category}">${row.category}</td>
          <td class="num" data-value="${row.power ?? ''}">${row.power ?? '—'}</td>
          <td class="num" data-value="${row.accuracy ?? ''}">${row.accuracy ?? '—'}</td>
          <td class="num" data-value="${row.pp ?? ''}">${row.pp ?? '—'}</td>
        </tr>`,
      )}
    </tbody>
  </table>`;
}

export default defineRoute({
  handler: async (context) => {
    const name = context.params.name;
    const species = await apiGet(`/pokemon-species/${encodeURIComponent(name)}/`);
    if (!species) {
      context.responseInit.status = 404;
      return { notFound: true, title: NOT_FOUND_TITLE };
    }

    const defaultVariety =
      (species.varieties ?? []).find((variety) => variety.is_default) ?? (species.varieties ?? [])[0];
    const pokemonId = idFromUrl(defaultVariety.pokemon.url);

    const [pokemon, chain, typeEn, versionGroups] = await Promise.all([
      apiGet(`/pokemon/${pokemonId}/`),
      apiGet(species.evolution_chain.url),
      getTypeEnglishNames(),
      getVersionGroups(),
    ]);

    // Version groups in which this Pokémon learns moves, ordered by `order`.
    const versionGroupByName = new Map(versionGroups.map((entry) => [entry.name, entry]));
    const usedVersionGroups = new Set();
    for (const move of pokemon.moves ?? []) {
      for (const detail of move.version_group_details ?? []) {
        usedVersionGroups.add(detail.version_group.name);
      }
    }
    const games = [...usedVersionGroups]
      .map((groupName) => versionGroupByName.get(groupName))
      .filter(Boolean)
      .sort((a, b) => a.order - b.order);

    let selectedGame = context.url.searchParams.get('game') ?? '';
    if (!games.some((game) => game.name === selectedGame)) selectedGame = games.at(-1)?.name ?? '';

    // Group the moves of the selected version group by learn method.
    const byMethod = new Map();
    for (const move of pokemon.moves ?? []) {
      for (const detail of move.version_group_details ?? []) {
        if (detail.version_group.name !== selectedGame) continue;
        const method = detail.move_learn_method.name;
        if (!byMethod.has(method)) byMethod.set(method, []);
        byMethod.get(method).push({ level: detail.level_learned_at, moveName: move.move.name });
      }
    }
    const methods = [...byMethod.keys()].sort(
      (a, b) => methodRank(a) - methodRank(b) || a.localeCompare(b),
    );

    // Fetch the move records needed for the rendered tables.
    const moveNames = new Set();
    for (const rows of byMethod.values()) for (const row of rows) moveNames.add(row.moveName);
    const moveRecords = new Map(
      await Promise.all([...moveNames].map(async (moveName) => [moveName, await apiGet(`/move/${moveName}/`)])),
    );

    const tables = methods.map((method) => {
      const rows = byMethod
        .get(method)
        .map((entry) => {
          const record = moveRecords.get(entry.moveName);
          return {
            level: entry.level,
            moveName: entry.moveName,
            moveEn: englishName(record) ?? humanize(entry.moveName),
            type: record?.type?.name ?? '',
            typeEn: typeEn[record?.type?.name] ?? humanize(record?.type?.name ?? ''),
            category: record?.damage_class?.name ? humanize(record.damage_class.name) : '—',
            power: record?.power ?? null,
            accuracy: record?.accuracy ?? null,
            pp: record?.pp ?? null,
          };
        })
        .sort((a, b) =>
          method === 'level-up'
            ? a.level - b.level || a.moveEn.localeCompare(b.moveEn)
            : a.moveEn.localeCompare(b.moveEn),
        );
      return { method, rows };
    });

    const stats = (pokemon.stats ?? []).map((entry) => ({
      label: statLabel(entry.stat.name) ?? humanize(entry.stat.name),
      value: entry.base_stat,
    }));
    const total = stats.reduce((sum, entry) => sum + entry.value, 0);

    const abilities = [...(pokemon.abilities ?? [])]
      .sort((a, b) => a.slot - b.slot)
      .map((entry) => ({
        name: entry.ability.name,
        hidden: entry.is_hidden,
      }));

    const artwork =
      mediaUrl(pokemon.sprites?.other?.['official-artwork']?.front_default) ??
      mediaUrl(pokemon.sprites?.front_default) ??
      `${process.env.API_BASE_URL ?? 'http://localhost:9000'}/media/sprites/pokemon/${pokemonId}.png`;

    const displayName = englishName(species) ?? humanize(species.name);

    return {
      title: `${displayName} – Pokédex`,
      displayName,
      speciesId: species.id,
      genus: englishGenus(species),
      types: [...(pokemon.types ?? [])]
        .sort((a, b) => a.slot - b.slot)
        .map((entry) => entry.type.name),
      typeEn,
      artwork,
      height: formatHeight(pokemon.height),
      weight: formatWeight(pokemon.weight),
      flavor: latestEnglishFlavor(species.flavor_text_entries),
      stats,
      total,
      abilities,
      chain: chain?.chain ?? null,
      games: games.map((game) => game.name),
      selectedGame,
      tables,
    };
  },

  document: (context) => document({ ...context, ...(context.props ?? {}) }),

  template: (context) => {
    const props = context.props;
    if (props?.notFound) return notFoundTemplate();

    return html`
      <div class="summary">
        <div class="summary-top">
          <img class="summary-art" src="${props.artwork}" alt="${props.displayName}" />
          <div class="summary-info">
            <span class="dex">${dexNumber(props.speciesId)}</span>
            <h1>${props.displayName}</h1>
            ${props.genus ? html`<p class="genus">${props.genus}</p>` : ''}
            <span class="badges">${props.types.map((type) => typeBadgeLink(type, props.typeEn[type]))}</span>
            <dl class="dl-row">
              <div>
                <dt>Height</dt>
                <dd>${props.height}</dd>
              </div>
              <div>
                <dt>Weight</dt>
                <dd>${props.weight}</dd>
              </div>
            </dl>
          </div>
        </div>
        ${props.flavor ? html`<p class="flavor">${props.flavor}</p>` : ''}
      </div>

      <section class="section" aria-labelledby="stats-heading">
        <h2 id="stats-heading">Base stats</h2>
        <table class="stats-table">
          <tbody>
            ${props.stats.map(
              (stat) => html`<tr>
                <th scope="row">${stat.label}</th>
                <td class="stat-value">${stat.value}</td>
                <td class="stat-bar-cell">
                  <div class="stat-track">
                    <div class="stat-bar" style="width: ${Math.min(100, (stat.value / 255) * 100)}%"></div>
                  </div>
                </td>
              </tr>`,
            )}
            <tr>
              <th scope="row">Total</th>
              <td class="stat-value">${props.total}</td>
              <td class="stat-bar-cell">
                <div class="stat-track">
                  <div class="stat-bar" style="width: ${Math.min(100, (props.total / 480) * 100)}%"></div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="section" aria-labelledby="abilities-heading">
        <h2 id="abilities-heading">Abilities</h2>
        <ul class="plain-list">
          ${props.abilities.map(
            (ability) => html`<li>
              <a href="/abilities/${ability.name}">${humanize(ability.name)}</a>${ability.hidden
                ? html` <span class="hidden-note">(hidden)</span>`
                : ''}
            </li>`,
          )}
        </ul>
      </section>

      <section class="section" aria-labelledby="evolution-heading">
        <h2 id="evolution-heading">Evolution</h2>
        ${props.chain ? html`<ul class="evolution-list">${evolutionNode(props.chain)}</ul>` : ''}
      </section>

      <section class="section moves-section" id="moves" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>
        <div class="moves-controls">
          <label for="game-select">Game</label>
          <select id="game-select">
            ${props.games.map(
              (game) => html`<option value="${game}" ?selected=${game === props.selectedGame}>
                ${humanize(game)}
              </option>`,
            )}
          </select>
        </div>
        ${props.tables.map((table) => movesTable(table.method, table.rows))}
      </section>
    `;
  },
});
