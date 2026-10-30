import { defineRoute } from '@gracile/gracile/route';
import { html } from 'lit';

import { document } from '../../document.js';
import {
  dexNumber,
  displayValue,
  englishGenus,
  englishName,
  getEvolutionChainByUrl,
  getMove,
  getPokemon,
  getSpecies,
  getSpeciesIndex,
  getTypeInfo,
  getVersionGroup,
  humanize,
  latestEnglishFlavorText,
  spriteUrl,
} from '../../lib/api.js';
import { typeBadgeLink } from '../../lib/components.js';

const BUILDING = () => process.env.GRACILE_BUILD === '1';

const STAT_LABELS = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

function statLabel(name) {
  return STAT_LABELS[name] ?? humanize(name);
}

function buildEvolutionTree(node) {
  if (!node?.species?.name) return null;
  return {
    name: node.species.name,
    label: humanize(node.species.name),
    children: (node.evolves_to ?? []).map(buildEvolutionTree).filter(Boolean),
  };
}

function renderEvolutionNode(node) {
  return html`
    <li>
      <a href="/pokemon/${node.name}">${node.label}</a>
      ${node.children.length
        ? html`<ul class="plain-list">${node.children.map(renderEvolutionNode)}</ul>`
        : ''}
    </li>
  `;
}

function sortMoveRows(rows, method) {
  return [...rows].sort((a, b) => {
    if (method === 'level-up') {
      const levelCompare = Number(a.level) - Number(b.level);
      if (levelCompare !== 0) return levelCompare;
    }
    return a.moveLabel.localeCompare(b.moveLabel);
  });
}

function moveTable(method, rows, hasLevel) {
  const column = (key, label, type) => html`
    <th scope="col" aria-sort="none">
      <button type="button" data-sort-key=${key} data-sort-type=${type}>${label}</button>
    </th>
  `;

  return html`
    <div class="table-scroll">
      <table class="move-table" data-method=${method}>
        <caption>${humanize(method)}</caption>
        <thead>
          <tr>
            ${hasLevel ? column('level', 'Level', 'number') : ''}
            ${column('move', 'Move', 'text')}
            ${column('type', 'Type', 'text')}
            ${column('category', 'Category', 'text')}
            ${column('power', 'Power', 'number')}
            ${column('accuracy', 'Accuracy', 'number')}
            ${column('pp', 'PP', 'number')}
          </tr>
        </thead>
        <tbody>
          ${rows.map(
            (row) => html`
              <tr>
                ${hasLevel
                  ? html`<td data-sort-value=${String(row.level)}>${row.level}</td>`
                  : ''}
                <td data-sort-value=${row.moveLabel}>
                  <a href="/moves/${row.moveName}">${row.moveLabel}</a>
                </td>
                <td data-sort-value=${row.typeLabel}>
                  <a class="type-badge type-${row.typeName}" href="/types/${row.typeName}">${row.typeLabel}</a>
                </td>
                <td data-sort-value=${row.category}>${row.category}</td>
                <td data-sort-value=${row.power === null || row.power === undefined ? '' : String(row.power)}>
                  ${displayValue(row.power)}
                </td>
                <td data-sort-value=${row.accuracy === null || row.accuracy === undefined ? '' : String(row.accuracy)}>
                  ${displayValue(row.accuracy)}
                </td>
                <td data-sort-value=${row.pp === null || row.pp === undefined ? '' : String(row.pp)}>
                  ${displayValue(row.pp)}
                </td>
              </tr>
            `,
          )}
        </tbody>
      </table>
    </div>
  `;
}

async function loadMoveRows(pokemon, selectedGroupName) {
  const details = (pokemon.moves ?? []).flatMap((entry) =>
    (entry.version_group_details ?? [])
      .filter((detail) => detail.version_group?.name === selectedGroupName)
      .map((detail) => ({
        moveName: entry.move.name,
        level: detail.level_learned_at ?? 0,
        method: detail.move_learn_method?.name ?? 'other',
      })),
  );

  const moveNames = [...new Set(details.map((entry) => entry.moveName))];
  const moveRecords = await Promise.all(moveNames.map((name) => getMove(name)));
  const moveMap = new Map(moveRecords.map((move) => [move.name, move]));

  const typeNames = [...new Set(moveRecords.map((move) => move.type?.name).filter(Boolean))];
  const typeInfos = await Promise.all(typeNames.map((name) => getTypeInfo(name)));
  const typeMap = new Map(typeInfos.map((type) => [type.name, type]));

  return details.map((detail) => {
    const move = moveMap.get(detail.moveName);
    const type = typeMap.get(move.type?.name);
    return {
      ...detail,
      moveLabel: englishName(move, move.name),
      typeName: move.type?.name ?? '',
      typeLabel: type?.englishName ?? humanize(move.type?.name ?? ''),
      category: move.damage_class?.name ? humanize(move.damage_class.name) : '—',
      power: move.power,
      accuracy: move.accuracy,
      pp: move.pp,
    };
  });
}

export default defineRoute({
  handler: {
    GET: async ({ params, url, responseInit }) => {
      if (BUILDING()) return {};

      try {
        const [species, speciesIndex] = await Promise.all([
          getSpecies(params.name),
          getSpeciesIndex(),
        ]);

        const defaultVariety =
          species.varieties?.find((variety) => variety.is_default)?.pokemon ??
          species.varieties?.[0]?.pokemon;

        const pokemon = await getPokemon(defaultVariety?.name ?? params.name);
        const typeInfos = await Promise.all(
          [...(pokemon.types ?? [])]
            .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
            .map((entry) => getTypeInfo(entry.type.name)),
        );

        const chain = species.evolution_chain?.url
          ? await getEvolutionChainByUrl(species.evolution_chain.url)
          : null;
        const evolution = buildEvolutionTree(chain?.chain) ?? {
          name: species.name,
          label: humanize(species.name),
          children: [],
        };

        const details = (pokemon.moves ?? []).flatMap((entry) =>
          (entry.version_group_details ?? []).map((detail) => ({
            ...detail,
            moveName: entry.move.name,
          })),
        );
        const gameNames = [...new Set(details.map((entry) => entry.version_group?.name).filter(Boolean))];
        const gameRecords = await Promise.all(gameNames.map((name) => getVersionGroup(name)));
        const games = gameRecords
          .map((game) => ({
            name: game.name,
            order: game.order ?? 0,
            label: humanize(game.name),
          }))
          .sort((a, b) => a.order - b.order);

        const requestedGame = url.searchParams.get('game');
        const selectedGame =
          games.find((game) => game.name === requestedGame) ?? games[games.length - 1] ?? null;

        let rows = [];
        if (selectedGame) rows = await loadMoveRows(pokemon, selectedGame.name);

        const methods = [...new Set(rows.map((row) => row.method))];
        const methodLabels = methods.map((method) => ({
          method,
          label: humanize(method),
        }));
        const orderedMethods = [
          ...METHOD_ORDER.filter((method) => methods.includes(method)),
          ...methodLabels
            .filter((entry) => !METHOD_ORDER.includes(entry.method))
            .sort((a, b) => a.label.localeCompare(b.label))
            .map((entry) => entry.method),
        ];

        const tables = orderedMethods
          .map((method) => ({
            method,
            rows: sortMoveRows(rows.filter((row) => row.method === method), method),
          }))
          .filter((table) => table.rows.length > 0);

        const english = englishName(species, species.name);
        const officialArtwork =
          pokemon.sprites?.other?.['official-artwork']?.front_default ??
          pokemon.sprites?.front_default ??
          spriteUrl(pokemon.id);

        const totalStats = (pokemon.stats ?? []).reduce(
          (sum, stat) => sum + (stat.base_stat ?? 0),
          0,
        );

        return {
          pageTitle: `${english} – Pokédex`,
          id: species.id,
          englishName: english,
          genus: englishGenus(species),
          types: typeInfos.map((type) => ({ name: type.name, englishName: type.englishName })),
          artwork: officialArtwork,
          height: ((pokemon.height ?? 0) / 10).toFixed(1),
          weight: ((pokemon.weight ?? 0) / 10).toFixed(1),
          flavorText: latestEnglishFlavorText(species),
          stats: (pokemon.stats ?? []).map((stat) => ({
            name: stat.stat?.name,
            label: statLabel(stat.stat?.name),
            value: stat.base_stat ?? 0,
          })),
          totalStats,
          abilities: [...(pokemon.abilities ?? [])]
            .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
            .map((entry) => ({
              name: entry.ability.name,
              label: humanize(entry.ability.name),
              hidden: Boolean(entry.is_hidden),
            })),
          evolution,
          games,
          selectedGame: selectedGame?.name ?? '',
          tables,
        };
      } catch (error) {
        if (error?.status !== 404) console.error(error);
        responseInit.status = 404;
        return { pageTitle: 'Not found – Pokédex', notFound: true };
      }
    },
  },

  document: (context) => document(context),

  template: (context) => {
    const data = context.props?.GET ?? {};

    if (data.notFound || !data.englishName) {
      return html`
        <h1>Not found</h1>
        <p><a href="/">Back to the Pokédex</a></p>
      `;
    }

    const maxStat = Math.max(255, ...data.stats.map((stat) => stat.value));

    return html`
      <div class="pokemon-summary">
        <img class="artwork" src=${data.artwork} alt=${data.englishName} />
        <div class="pokemon-summary-info">
          <p class="pokemon-dex">${dexNumber(data.id)}</p>
          <h1>${data.englishName}</h1>
          <p class="genus">${data.genus}</p>
          <div class="summary-types">
            ${data.types.map((type) => typeBadgeLink(type))}
          </div>
          <dl class="measures">
            <div><dt>Height</dt><dd>${data.height} m</dd></div>
            <div><dt>Weight</dt><dd>${data.weight} kg</dd></div>
          </dl>
          <p class="flavor-text">${data.flavorText}</p>
        </div>
      </div>

      <section class="panel" aria-labelledby="stats-heading">
        <h2 id="stats-heading">Base stats</h2>
        <table class="stats-table">
          <tbody>
            ${data.stats.map(
              (stat) => html`
                <tr>
                  <th scope="row">${stat.label}</th>
                  <td>
                    <div class="stat-value-line">
                      <span class="stat-value">${stat.value}</span>
                      <span class="stat-track">
                        <span
                          class="stat-bar"
                          style=${`width: ${Math.max(2, Math.min(100, (stat.value / maxStat) * 100))}%`}
                        ></span>
                      </span>
                    </div>
                  </td>
                </tr>
              `,
            )}
            <tr>
              <th scope="row">Total</th>
              <td><span class="stat-value">${data.totalStats}</span></td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="panel" aria-labelledby="abilities-heading">
        <h2 id="abilities-heading">Abilities</h2>
        <ul class="plain-list">
          ${data.abilities.map(
            (ability) => html`
              <li>
                <a href="/abilities/${ability.name}">${ability.label}</a>
                ${ability.hidden ? ' (hidden)' : ''}
              </li>
            `,
          )}
        </ul>
      </section>

      <section class="panel" aria-labelledby="evolution-heading">
        <h2 id="evolution-heading">Evolution</h2>
        <ul class="plain-list">${renderEvolutionNode(data.evolution)}</ul>
      </section>

      <section id="moves" class="panel" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>

        <div class="game-control">
          <label for="pokemon-game">Game</label>
          <select id="pokemon-game" name="game">
            ${data.games.map(
              (game) => html`
                <option value=${game.name} ?selected=${game.name === data.selectedGame}>${game.label}</option>
              `,
            )}
          </select>
        </div>

        ${data.tables.map((table) => moveTable(table.method, table.rows, table.method === 'level-up'))}
      </section>
    `;
  },
});
