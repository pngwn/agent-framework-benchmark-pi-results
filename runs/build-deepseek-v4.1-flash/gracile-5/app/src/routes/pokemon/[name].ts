import { defineRoute } from '@gracile/gracile/route';
import { html } from '@gracile/gracile/server-html';

import { document } from '../../document.js';
import {
  moveTable,
  evolutionList,
  statTable,
  typePill,
} from '../../lib/components.js';
import {
  buildMoveTables,
  getMoveDetailsForGame,
  getPokemonPageData,
} from '../../lib/data.js';
import { dexNumber } from '../../lib/format.js';

export default defineRoute({
  handler: {
    GET: async ({ params, url, responseInit }) => {
      const name = decodeURIComponent(params.name ?? '').toLowerCase();
      const data = name ? await getPokemonPageData(name) : null;
      if (!data) {
        responseInit.status = 404;
        return { notFound: true };
      }

      const requestedGame = url.searchParams.get('game') ?? '';
      const versionGroups = data.moveSection.versionGroups;
      const selectedGame = versionGroups.some((group) => group.name === requestedGame)
        ? requestedGame
        : data.moveSection.defaultGame;
      const moveDetails = selectedGame
        ? await getMoveDetailsForGame(data.pokemon, selectedGame)
        : new Map();
      const tables = selectedGame ? buildMoveTables(data.pokemon, moveDetails, selectedGame) : [];

      return {
        data,
        versionGroups,
        selectedGame,
        tables,
      };
    },
  },

  document: (context) =>
    document({
      title: context.props.GET.notFound ? 'Not found – Pokédex' : `${context.props.GET.data.englishName} – Pokédex`,
    }),

  template: (context) => {
    const props = context.props.GET;
    if (context.props.GET.notFound) {
      return html`
        <main class="page">
          <h1>Not found</h1>
          <p><a href="/">Back to the Pokédex</a></p>
        </main>
      `;
    }

    const data = context.props.GET.data;

    return html`
      <main class="page">
        <div class="pokemon-hero">
          <div class="artwork">
            <img src=${data.artwork} alt=${data.artworkAlt} width="288" height="288" />
          </div>

          <div class="pokemon-summary">
            <span class="dex-number">${dexNumber(data.dexId)}</span>
            <h1>${data.englishName}</h1>
            <p class="genus">${data.genus}</p>
            <div class="type-links">
              ${data.types.map((type: any) => typePill(type.name, type.label, `/types/${type.name}`))}
            </div>
            <dl class="measurements">
              <div><dt>Height</dt><dd>${data.height} m</dd></div>
              <div><dt>Weight</dt><dd>${data.weight} kg</dd></div>
            </dl>
            <p class="flavor">${data.flavor}</p>
          </div>
        </div>

        <section class="panel" aria-labelledby="stats-heading">
          <h2 id="stats-heading">Base stats</h2>
          ${statTable(data.stats, data.total)}
        </section>

        <section class="panel" aria-labelledby="abilities-heading">
          <h2 id="abilities-heading">Abilities</h2>
          <ul class="ability-list">
            ${data.abilities.map(
              (ability: any) => html`
                <li>
                  <a href=${`/abilities/${ability.name}`}>${ability.label}</a>${ability.hidden ? ' (hidden)' : ''}
                </li>
              `,
            )}
          </ul>
        </section>

        <section class="panel" aria-labelledby="evolution-heading">
          <h2 id="evolution-heading">Evolution</h2>
          ${evolutionList(context.props.GET.data.evolution)}
        </section>

        <section class="panel" id="moves" aria-labelledby="moves-heading">
          <h2 id="moves-heading">Moves</h2>

          ${context.props.GET.versionGroups.length
            ? html`
                <div class="game-control">
                  <label for="game-select">Game</label>
                  <select id="game-select" data-game-select>
                    ${context.props.GET.versionGroups.map(
                      (group: any) => html`
                        <option value=${group.name} ?selected=${group.name === context.props.GET.selectedGame}>
                          ${group.label}
                        </option>
                      `,
                    )}
                  </select>
                </div>
              `
            : ''}

          ${context.props.GET.tables.map(
            (table) => html`<div class="table-wrap">${moveTable(table)}</div>`,
          )}
        </section>
      </main>
      `;
  },
});
